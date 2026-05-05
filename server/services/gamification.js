import pool from '../db/pool.js';

// ── Ranks (fixed — never changes) ────────────────────────────────────────────

const RANKS = ['rookie', 'regular', 'veteran', 'elite', 'legend'];

// ── Config cache (TTL: 60 s) ──────────────────────────────────────────────────

let _configCache = null;
let _configFetchedAt = 0;
const CONFIG_TTL_MS = 60_000;

export function invalidateConfigCache() {
  _configCache = null;
  _configFetchedAt = 0;
}

export async function getConfig() {
  const now = Date.now();
  if (_configCache && now - _configFetchedAt < CONFIG_TTL_MS) return _configCache;
  const { rows } = await pool.query('SELECT * FROM gamification_platform_config WHERE id = 1');
  const row = rows[0];
  _configCache = {
    baseXp:           row.base_xp,
    maxMultiplier:    parseFloat(row.max_multiplier),
    rankXpThresholds: row.rank_xp_thresholds,
    rankMultipliers:  row.rank_multipliers,
    visitMilestones:  row.visit_milestones,
    gachaTable:       row.gacha_table,
  };
  _configFetchedAt = now;
  return _configCache;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

export function computeRank(totalXp, rankXpThresholds) {
  let rank = 'rookie';
  for (const r of RANKS) {
    if (totalXp >= (rankXpThresholds[r] ?? 0)) rank = r;
  }
  return rank;
}

function rollGacha(gachaTable) {
  const total = gachaTable.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of gachaTable) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return gachaTable[0];
}

// ── DB helpers ───────────────────────────────────────────────────────────────

async function getOrCreateGamification(client, gymId, memberId) {
  const sel = await client.query(
    'SELECT * FROM member_gamification WHERE gym_id = $1 AND member_id = $2',
    [gymId, memberId]
  );
  if (sel.rows.length > 0) return sel.rows[0];

  const ins = await client.query(
    `INSERT INTO member_gamification (gym_id, member_id)
     VALUES ($1, $2) RETURNING *`,
    [gymId, memberId]
  );
  return ins.rows[0];
}

async function getActiveBoostMultiplier(client, gymId, memberId, now) {
  const res = await client.query(
    `SELECT COALESCE(MAX(multiplier), 1.00) AS boost
     FROM member_xp_boosts
     WHERE member_id = $1 AND gym_id = $2 AND is_active = true AND expires_at > $3`,
    [memberId, gymId, now]
  );
  return parseFloat(res.rows[0].boost);
}

// ── Multiplier computation ────────────────────────────────────────────────────

function computeXPMultiplier(gami, activeBoost, rankMultipliers, maxMultiplier) {
  const rankMult = rankMultipliers[gami.rank] ?? 1.0;
  let bonus = 0;
  const breakdown = { rankMult };

  if (activeBoost > 1.0) {
    bonus += activeBoost - 1.0;
    breakdown.gachaBoost = activeBoost - 1.0;
  }

  const multiplier = Math.min(maxMultiplier, rankMult + bonus);
  return { multiplier: parseFloat(multiplier.toFixed(2)), breakdown };
}

// ── Visit milestones ──────────────────────────────────────────────────────────

async function checkAndAwardMilestones(client, gymId, memberId, totalVisits, visitMilestones) {
  if (totalVisits <= 0) return 0;

  const awarded = await client.query(
    `SELECT milestone_value FROM member_streak_milestones
     WHERE gym_id = $1 AND member_id = $2 AND streak_type = 'visits'`,
    [gymId, memberId]
  );
  const awardedSet = new Set(awarded.rows.map(r => r.milestone_value));

  let newSpins = 0;
  for (const threshold of visitMilestones) {
    if (totalVisits >= threshold && !awardedSet.has(threshold)) {
      const spinRes = await client.query(
        `INSERT INTO member_gacha_spins (gym_id, member_id, streak_type, milestone_value)
         VALUES ($1, $2, 'visits', $3) RETURNING id`,
        [gymId, memberId, threshold]
      );
      const spinId = spinRes.rows[0].id;
      await client.query(
        `INSERT INTO member_streak_milestones (gym_id, member_id, streak_type, milestone_value, spin_id)
         VALUES ($1, $2, 'visits', $3, $4)
         ON CONFLICT (gym_id, member_id, streak_type, milestone_value) DO NOTHING`,
        [gymId, memberId, threshold, spinId]
      );
      newSpins++;
    }
  }

  if (newSpins > 0) {
    await client.query(
      `UPDATE member_gamification
       SET pending_spins = pending_spins + $1, updated_at = NOW()
       WHERE gym_id = $2 AND member_id = $3`,
      [newSpins, gymId, memberId]
    );
  }
  return newSpins;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function processCheckin(gymId, memberId, checkinLogId) {
  const cfg = await getConfig();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const gami = await getOrCreateGamification(client, gymId, memberId);

    const lastVisit = gami.last_visit_date
      ? (gami.last_visit_date.toISOString?.()?.slice(0, 10) ?? String(gami.last_visit_date).slice(0, 10))
      : null;
    const alreadyVisitedToday = lastVisit === todayStr;
    const newTotalVisits = alreadyVisitedToday
      ? (gami.total_visits ?? 0)
      : (gami.total_visits ?? 0) + 1;

    // ── XP calculation ────────────────────────────────────────────────────
    const activeBoost = await getActiveBoostMultiplier(client, gymId, memberId, now);
    const { multiplier, breakdown } = computeXPMultiplier(gami, activeBoost, cfg.rankMultipliers, cfg.maxMultiplier);
    const xpEarned = Math.round(cfg.baseXp * multiplier);
    const newTotalXp = gami.total_xp + xpEarned;

    const previousRank = gami.rank;
    const newRank = computeRank(newTotalXp, cfg.rankXpThresholds);
    const rankedUp = newRank !== previousRank;

    // ── Milestone checks (only on new visit days) ─────────────────────────
    let newSpins = 0;
    if (!alreadyVisitedToday) {
      newSpins = await checkAndAwardMilestones(client, gymId, memberId, newTotalVisits, cfg.visitMilestones);
    }

    // ── Persist gamification row ──────────────────────────────────────────
    await client.query(
      `UPDATE member_gamification SET
         total_xp         = $1,
         rank             = $2,
         total_visits     = $3,
         last_visit_date  = $4,
         updated_at       = NOW()
       WHERE gym_id = $5 AND member_id = $6`,
      [newTotalXp, newRank, newTotalVisits, todayStr, gymId, memberId]
    );

    // ── XP log ────────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO member_xp_log
         (gym_id, member_id, checkin_log_id, xp_earned, base_xp, multiplier_total, breakdown, rank_at_time, total_xp_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [gymId, memberId, checkinLogId, xpEarned, cfg.baseXp, multiplier, JSON.stringify(breakdown), newRank, newTotalXp]
    );

    await client.query('COMMIT');

    const reloaded = await pool.query(
      'SELECT pending_spins FROM member_gamification WHERE gym_id = $1 AND member_id = $2',
      [gymId, memberId]
    );
    const pendingSpins = reloaded.rows[0]?.pending_spins ?? 0;

    const spinsListRes = await pool.query(
      `SELECT id, streak_type, milestone_value FROM member_gacha_spins
       WHERE member_id = $1 AND gym_id = $2 AND status = 'pending'
       ORDER BY created_at ASC`,
      [memberId, gymId]
    );

    // ── Derived rank-progress fields (returned so client never needs to recompute) ──
    const nextRankIdx           = RANKS.indexOf(newRank) + 1;
    const nextRank              = nextRankIdx < RANKS.length ? RANKS[nextRankIdx] : null;
    const xpForCurrent          = cfg.rankXpThresholds[newRank] ?? 0;
    const xpForNext             = nextRank ? (cfg.rankXpThresholds[nextRank] ?? newTotalXp) : newTotalXp;
    const xpToNextRank          = nextRank ? Math.max(0, xpForNext - newTotalXp) : 0;
    const progressPct           = nextRank
      ? Math.min(100, Math.round(((newTotalXp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100))
      : 100;
    const nextMilestone         = cfg.visitMilestones.find(m => m > newTotalVisits) ?? null;
    const visitsToNextMilestone = nextMilestone ? nextMilestone - newTotalVisits : 0;

    return {
      xpEarned,
      breakdown,
      newTotalXp,
      newRank,
      previousRank,
      rankedUp,
      totalVisits:          newTotalVisits,
      pendingSpins,
      pendingSpinsList:     spinsListRes.rows,
      newPendingSpins:      newSpins,
      nextRank,
      xpToNextRank,
      progressPct,
      nextMilestone,
      visitsToNextMilestone,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Gacha spin ────────────────────────────────────────────────────────────────

export async function executeGachaSpin(gymId, memberId, spinId) {
  const cfg = await getConfig();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const spinRes = await client.query(
      `SELECT * FROM member_gacha_spins
       WHERE id = $1 AND gym_id = $2 AND member_id = $3 AND status = 'pending'`,
      [spinId, gymId, memberId]
    );
    if (spinRes.rows.length === 0) {
      throw Object.assign(new Error('Spin not found or already completed'), { statusCode: 404 });
    }

    const reward = rollGacha(cfg.gachaTable);
    const expiresAt = new Date(Date.now() + reward.durationDays * 86400000);

    const boostRes = await client.query(
      `INSERT INTO member_xp_boosts (gym_id, member_id, source_spin, rarity, multiplier, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [gymId, memberId, spinId, reward.rarity, reward.multiplier, expiresAt]
    );

    await client.query(
      `UPDATE member_gacha_spins
       SET status = 'completed', spun_at = NOW(),
           rarity = $1, reward_type = 'xp_boost',
           reward_detail = $2
       WHERE id = $3`,
      [reward.rarity, JSON.stringify({ multiplier: reward.multiplier, durationDays: reward.durationDays }), spinId]
    );

    await client.query(
      `UPDATE member_gamification
       SET pending_spins = GREATEST(pending_spins - 1, 0), updated_at = NOW()
       WHERE gym_id = $1 AND member_id = $2`,
      [gymId, memberId]
    );

    await client.query('COMMIT');

    return {
      rarity:       reward.rarity,
      multiplier:   reward.multiplier,
      durationDays: reward.durationDays,
      expiresAt,
      boostId:      boostRes.rows[0].id,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Full state read ───────────────────────────────────────────────────────────

export async function getGamificationState(gymId, memberId) {
  const cfg = await getConfig();
  const client = await pool.connect();
  try {
    const gamiRes = await client.query(
      'SELECT * FROM member_gamification WHERE gym_id = $1 AND member_id = $2',
      [gymId, memberId]
    );

    let gami = gamiRes.rows[0];
    if (!gami) {
      const ins = await client.query(
        'INSERT INTO member_gamification (gym_id, member_id) VALUES ($1, $2) RETURNING *',
        [gymId, memberId]
      );
      gami = ins.rows[0];
    }

    const now = new Date();
    const boostRes = await client.query(
      `SELECT rarity, multiplier, expires_at
       FROM member_xp_boosts
       WHERE member_id = $1 AND gym_id = $2 AND is_active = true AND expires_at > $3
       ORDER BY multiplier DESC
       LIMIT 1`,
      [memberId, gymId, now]
    );

    const boost = boostRes.rows[0] ?? null;
    let activeBoost = null;
    if (boost) {
      const remainingMs = new Date(boost.expires_at) - now;
      activeBoost = {
        rarity:         boost.rarity,
        multiplier:     parseFloat(boost.multiplier),
        expiresAt:      boost.expires_at,
        remainingHours: Math.max(0, Math.ceil(remainingMs / 3600000)),
      };
    }

    const rank = gami.rank;
    const nextRankIndex   = RANKS.indexOf(rank) + 1;
    const nextRank        = nextRankIndex < RANKS.length ? RANKS[nextRankIndex] : null;
    const xpToNextRank    = nextRank ? cfg.rankXpThresholds[nextRank] - gami.total_xp : 0;
    const xpForCurrentRank = cfg.rankXpThresholds[rank] ?? 0;
    const xpForNextRank   = nextRank ? (cfg.rankXpThresholds[nextRank] ?? gami.total_xp) : gami.total_xp;
    const progressPct     = nextRank
      ? Math.min(100, Math.round(((gami.total_xp - xpForCurrentRank) / (xpForNextRank - xpForCurrentRank)) * 100))
      : 100;

    const totalVisits           = gami.total_visits ?? 0;
    const nextMilestone         = cfg.visitMilestones.find(m => m > totalVisits) ?? null;
    const visitsToNextMilestone = nextMilestone ? nextMilestone - totalVisits : 0;

    const spinsRes = await client.query(
      `SELECT id, streak_type, milestone_value FROM member_gacha_spins
       WHERE member_id = $1 AND gym_id = $2 AND status = 'pending'
       ORDER BY created_at ASC`,
      [memberId, gymId]
    );

    return {
      totalXp:              gami.total_xp,
      rank:                 gami.rank,
      nextRank,
      xpToNextRank:         Math.max(0, xpToNextRank),
      progressPct,
      totalVisits,
      nextMilestone,
      visitsToNextMilestone,
      pendingSpins:         gami.pending_spins,
      pendingSpinsList:     spinsRes.rows,
      activeBoost,
    };
  } finally {
    client.release();
  }
}
