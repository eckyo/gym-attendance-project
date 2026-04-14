import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperadmin } from '../middleware/superadmin.js';

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

export default router;
