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


export { memberRouter, adminRouter };
