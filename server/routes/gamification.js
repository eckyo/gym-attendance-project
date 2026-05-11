import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';
import {
  getGamificationState,
  executeGachaSpin,
} from '../services/gamification.js';
import pool from '../db/pool.js';

const memberRouter = Router();
const adminRouter  = Router();

// ── Member routes ─────────────────────────────────────────────────────────────

memberRouter.use(requireAuth, injectGymId, requireRole('member'));

memberRouter.get('/', async (req, res, next) => {
  try {
    const state = await getGamificationState(req.gymId, req.user.userId);
    res.json(state);
  } catch (err) {
    next(err);
  }
});

memberRouter.get('/xp-log', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [logsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, xp_earned, base_xp, multiplier_total, breakdown, rank_at_time,
                total_xp_after, checkin_log_id, created_at
         FROM member_xp_log
         WHERE member_id = $1 AND gym_id = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [req.user.userId, req.gymId, limit, offset]
      ),
      pool.query(
        'SELECT COUNT(*) FROM member_xp_log WHERE member_id = $1 AND gym_id = $2',
        [req.user.userId, req.gymId]
      ),
    ]);

    const total = parseInt(countRes.rows[0].count, 10);
    res.json({
      logs: logsRes.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

memberRouter.get('/gacha/pending', async (req, res, next) => {
  try {
    const spinsRes = await pool.query(
      `SELECT id, streak_type, milestone_value, created_at
       FROM member_gacha_spins
       WHERE member_id = $1 AND gym_id = $2 AND status = 'pending'
       ORDER BY created_at ASC`,
      [req.user.userId, req.gymId]
    );
    res.json({ pendingSpins: spinsRes.rows.length, spins: spinsRes.rows });
  } catch (err) {
    next(err);
  }
});

memberRouter.post('/gacha/spin', async (req, res, next) => {
  try {
    const { spinId } = req.body;
    if (!spinId) return res.status(400).json({ error: 'spinId is required' });

    const result = await executeGachaSpin(req.gymId, req.user.userId, spinId);
    res.json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});


// ── Admin routes ──────────────────────────────────────────────────────────────

adminRouter.use(requireAuth, injectGymId, requireRole('admin', 'staff'));

// GET /api/admin/gamification/engagement?start=YYYY-MM-DD&end=YYYY-MM-DD
adminRouter.get('/engagement', async (req, res, next) => {
  const today = new Date().toISOString().slice(0, 10);
  const start = req.query.start || today;
  const end   = req.query.end   || today;

  const TIER_QUERY = `
    SELECT COALESCE(mg.rank, 'rookie') AS rank, COUNT(*) AS count
    FROM members m
    LEFT JOIN member_gamification mg ON mg.member_id = m.id AND mg.gym_id = m.gym_id
    WHERE m.gym_id = $1
      AND m.deleted_at IS NULL AND m.is_visitor = false
      AND m.expiry_date >= CURRENT_DATE
    GROUP BY COALESCE(mg.rank, 'rookie')
  `;
  const LEADERBOARD_QUERY = `
    SELECT m.id, m.name,
           COALESCE(mg.rank, 'rookie') AS rank,
           COUNT(al.id) AS checkin_count
    FROM attendance_logs al
    JOIN members m ON m.id = al.member_id AND m.gym_id = al.gym_id
    LEFT JOIN member_gamification mg ON mg.member_id = m.id AND mg.gym_id = m.gym_id
    WHERE al.gym_id = $1
      AND al.checked_in_at >= $2::date::timestamptz
      AND al.checked_in_at <  ($3::date + INTERVAL '1 day')::timestamptz
      AND m.deleted_at IS NULL
    GROUP BY m.id, m.name, mg.rank
    ORDER BY checkin_count DESC
    LIMIT 10
  `;
  const ENGAGEMENT_QUERY = `
    SELECT
      COUNT(DISTINCT al.member_id) AS visited_count,
      (SELECT COUNT(*) FROM members
       WHERE gym_id = $1 AND deleted_at IS NULL
         AND is_visitor = false AND expiry_date >= CURRENT_DATE) AS active_total
    FROM attendance_logs al
    JOIN members m ON m.id = al.member_id AND m.gym_id = $1
      AND m.deleted_at IS NULL AND m.is_visitor = false
      AND m.expiry_date >= CURRENT_DATE
    WHERE al.gym_id = $1
      AND al.checked_in_at >= $2::date::timestamptz
      AND al.checked_in_at <  ($3::date + INTERVAL '1 day')::timestamptz
  `;
  const AT_RISK_QUERY = `
    SELECT COUNT(*) AS at_risk
    FROM members m
    WHERE m.gym_id = $1
      AND m.deleted_at IS NULL AND m.is_visitor = false
      AND m.expiry_date >= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM attendance_logs al
        WHERE al.member_id = m.id AND al.gym_id = m.gym_id
          AND al.checked_in_at >= NOW() - INTERVAL '14 days'
      )
  `;
  const PEAK_QUERY = `
    SELECT
      EXTRACT(HOUR FROM checked_in_at + INTERVAL '7 hours')::int AS hour,
      EXTRACT(DOW  FROM checked_in_at + INTERVAL '7 hours')::int AS dow,
      COUNT(*)::int AS cnt
    FROM attendance_logs
    WHERE gym_id = $1
      AND checked_in_at >= $2::date::timestamptz
      AND checked_in_at <  ($3::date + INTERVAL '1 day')::timestamptz
    GROUP BY hour, dow
  `;

  try {
    const [tierRes, lbRes, engRes, riskRes, peakRes] = await Promise.all([
      pool.query(TIER_QUERY,        [req.gymId]),
      pool.query(LEADERBOARD_QUERY, [req.gymId, start, end]),
      pool.query(ENGAGEMENT_QUERY,  [req.gymId, start, end]),
      pool.query(AT_RISK_QUERY,     [req.gymId]),
      pool.query(PEAK_QUERY,        [req.gymId, start, end]),
    ]);

    const TIER_ORDER = ['legend', 'elite', 'veteran', 'regular', 'rookie'];
    const tierMap = {};
    for (const row of tierRes.rows) tierMap[row.rank] = parseInt(row.count, 10);
    const totalTier = Object.values(tierMap).reduce((a, b) => a + b, 0);
    const tiers = TIER_ORDER.map((rank) => {
      const count = tierMap[rank] || 0;
      return { rank, count, pct: totalTier > 0 ? Math.round((count / totalTier) * 1000) / 10 : 0 };
    });

    const leaderboard = lbRes.rows.map((r) => ({
      id: r.id, name: r.name, rank: r.rank,
      checkins: parseInt(r.checkin_count, 10),
    }));

    const visitedCount = parseInt(engRes.rows[0].visited_count, 10) || 0;
    const activeTotal  = parseInt(engRes.rows[0].active_total,  10) || 0;
    const rate = activeTotal > 0 ? Math.round((visitedCount / activeTotal) * 1000) / 10 : 0;

    const hourMap = {};
    const dowMap  = {};
    for (const row of peakRes.rows) {
      hourMap[row.hour] = (hourMap[row.hour] || 0) + row.cnt;
      dowMap[row.dow]   = (dowMap[row.dow]   || 0) + row.cnt;
    }
    const peakHours = [];
    for (let h = 5; h <= 22; h++) peakHours.push({ hour: h, count: hourMap[h] || 0 });
    const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const peakDays = DOW_LABELS.map((label, i) => ({ dow: i, label, count: dowMap[i] || 0 }));

    res.json({
      tiers,
      leaderboard,
      engagement: { visited_count: visitedCount, active_total: activeTotal, rate },
      at_risk: parseInt(riskRes.rows[0].at_risk, 10) || 0,
      peak_hours: peakHours,
      peak_days: peakDays,
    });
  } catch (err) {
    next(err);
  }
});

export { memberRouter, adminRouter };
