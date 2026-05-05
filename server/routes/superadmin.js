import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperadmin } from '../middleware/superadmin.js';
import { invalidateConfigCache } from '../services/gamification.js';

const router = Router();

router.use(requireAuth, requireSuperadmin);

// ── GET /api/superadmin/gyms ──────────────────────────────────────────────────
// List all gyms with their admin user info.
router.get('/gyms', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        g.id,
        g.name,
        g.is_active,
        g.created_at,
        u.email AS admin_email
      FROM gyms g
      LEFT JOIN users u ON u.gym_id = g.id AND u.role = 'admin'
      ORDER BY g.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/superadmin/gyms ─────────────────────────────────────────────────
// Create a new gym with an admin user.
router.post('/gyms', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { gymName, adminEmail, adminPassword } = req.body;

    if (!gymName?.trim()) {
      return res.status(400).json({ error: 'Gym name is required' });
    }
    if (!adminEmail?.trim()) {
      return res.status(400).json({ error: 'Admin email is required' });
    }
    if (!adminPassword || adminPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    await client.query('BEGIN');

    // Check gym name uniqueness
    const existing = await client.query(
      `SELECT id FROM gyms WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [gymName.trim()]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A gym with this name already exists' });
    }

    const gymResult = await client.query(
      `INSERT INTO gyms (name) VALUES ($1) RETURNING id, name, is_active, created_at`,
      [gymName.trim()]
    );
    const gym = gymResult.rows[0];

    const pinHash = await bcrypt.hash('0000', 10);
    await client.query(
      `UPDATE gyms SET admin_pin_hash = $1 WHERE id = $2`,
      [pinHash, gym.id]
    );

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO users (gym_id, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
      [gym.id, adminEmail.trim().toLowerCase(), passwordHash]
    );

    await client.query(
      `INSERT INTO membership_packages (gym_id, name, duration_days, price, is_default)
       VALUES ($1, '1 Month', 30, 150000, true)`,
      [gym.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...gym,
      admin_email: adminEmail.trim().toLowerCase(),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Admin email already exists for another gym' });
    }
    next(err);
  } finally {
    client.release();
  }
});

// ── PATCH /api/superadmin/gyms/:id/toggle ─────────────────────────────────────
// Toggle is_active for a gym.
router.patch('/gyms/:id/toggle', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE gyms SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING id, is_active`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gym not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/gyms/:id/reset-password ────────────────────────────
// Reset the admin user's password for a gym.
router.patch('/gyms/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE gym_id = $2 AND role = 'admin'
       RETURNING id`,
      [passwordHash, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found for this gym' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Gamification config validation ────────────────────────────────────────────

function validateGamificationConfig(body) {
  const errors = [];

  const baseXp = Number(body.base_xp);
  if (!Number.isInteger(baseXp) || baseXp < 1 || baseXp > 10000) {
    errors.push('base_xp must be an integer between 1 and 10000');
  }

  const maxMult = parseFloat(body.max_multiplier);
  if (isNaN(maxMult) || maxMult < 1.0 || maxMult > 10.0) {
    errors.push('max_multiplier must be a number between 1.0 and 10.0');
  }

  const rx = body.rank_xp_thresholds;
  if (!rx || typeof rx !== 'object' || Array.isArray(rx)) {
    errors.push('rank_xp_thresholds must be an object');
  } else {
    let prev = 0;
    for (const rank of ['regular', 'veteran', 'elite', 'legend']) {
      const v = Number(rx[rank]);
      if (!Number.isInteger(v) || v <= 0) {
        errors.push(`rank_xp_thresholds.${rank} must be a positive integer`);
      } else if (v <= prev) {
        errors.push(`rank_xp_thresholds must be strictly ascending (${rank} must be > ${prev})`);
      }
      prev = Number.isInteger(v) ? v : prev;
    }
  }

  const rm = body.rank_multipliers;
  if (!rm || typeof rm !== 'object' || Array.isArray(rm)) {
    errors.push('rank_multipliers must be an object');
  } else {
    for (const rank of ['rookie', 'regular', 'veteran', 'elite', 'legend']) {
      const v = parseFloat(rm[rank]);
      if (isNaN(v) || v < 1.0) {
        errors.push(`rank_multipliers.${rank} must be >= 1.0`);
      }
    }
  }

  const vm = body.visit_milestones;
  if (!Array.isArray(vm) || vm.length < 1 || vm.length > 20) {
    errors.push('visit_milestones must be an array of 1 to 20 items');
  } else {
    let prev = 0;
    for (let i = 0; i < vm.length; i++) {
      const v = Number(vm[i]);
      if (!Number.isInteger(v) || v <= 0) {
        errors.push(`visit_milestones[${i}] must be a positive integer`);
      } else if (v <= prev) {
        errors.push('visit_milestones must be strictly ascending');
      }
      prev = Number.isInteger(v) ? v : prev;
    }
  }

  const gt = body.gacha_table;
  if (!Array.isArray(gt) || gt.length !== 3) {
    errors.push('gacha_table must be an array of exactly 3 entries');
  } else {
    const raritySet = new Set(gt.map(e => e.rarity));
    if (!['common', 'rare', 'epic'].every(r => raritySet.has(r))) {
      errors.push('gacha_table must contain exactly one entry each for common, rare, and epic');
    }
    const weightSum = gt.reduce((s, e) => s + (Number(e.weight) || 0), 0);
    if (Math.round(weightSum) !== 100) {
      errors.push(`gacha_table weights must sum to exactly 100 (got ${weightSum})`);
    }
    for (const entry of gt) {
      const mult = parseFloat(entry.multiplier);
      if (isNaN(mult) || mult <= 1.0) {
        errors.push(`gacha_table ${entry.rarity} multiplier must be > 1.0`);
      }
      const dur = parseInt(entry.durationDays, 10);
      if (!Number.isInteger(dur) || dur < 1) {
        errors.push(`gacha_table ${entry.rarity} durationDays must be >= 1`);
      }
    }
  }

  return errors;
}

// ── GET /api/superadmin/gamification/config ───────────────────────────────────

router.get('/gamification/config', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM gamification_platform_config WHERE id = 1');
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/superadmin/gamification/config ───────────────────────────────────

router.put('/gamification/config', async (req, res, next) => {
  try {
    const errors = validateGamificationConfig(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { base_xp, max_multiplier, rank_xp_thresholds, rank_multipliers, visit_milestones, gacha_table } = req.body;

    const { rows } = await pool.query(
      `UPDATE gamification_platform_config SET
         base_xp            = $1,
         max_multiplier     = $2,
         rank_xp_thresholds = $3,
         rank_multipliers   = $4,
         visit_milestones   = $5,
         gacha_table        = $6,
         updated_at         = NOW()
       WHERE id = 1
       RETURNING *`,
      [
        base_xp,
        max_multiplier,
        JSON.stringify({ rookie: 0, ...rank_xp_thresholds }),
        JSON.stringify(rank_multipliers),
        JSON.stringify(visit_milestones),
        JSON.stringify(gacha_table),
      ]
    );

    invalidateConfigCache();
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
