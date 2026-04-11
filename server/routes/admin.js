import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';
import pool from '../db/pool.js';

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth, injectGymId, requireRole('admin'));

const generateGymMemberId = (counter) => {
  const letterIndex = Math.floor((counter - 1) / 9999);
  const number = ((counter - 1) % 9999) + 1;
  return String.fromCharCode(65 + letterIndex) + String(number).padStart(4, '0');
};

// POST /api/admin/verify-pin
router.post('/verify-pin', async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN is required' });

    const result = await pool.query(
      'SELECT admin_pin_hash FROM gyms WHERE id = $1',
      [req.gymId]
    );
    const gym = result.rows[0];
    if (!gym?.admin_pin_hash) {
      return res.status(500).json({ error: 'Admin PIN not configured. Run db:seed.' });
    }

    const isValid = await bcrypt.compare(String(pin), gym.admin_pin_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid PIN' });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/attendance?date=2026-04-10&search=alice
router.get('/attendance', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const search = req.query.search ? `%${req.query.search}%` : '%';

    const result = await pool.query(
      `SELECT
         m.name        AS member_name,
         m.scan_token  AS gym_id,
         al.checked_in_at
       FROM attendance_logs al
       JOIN members m ON m.id = al.member_id
       WHERE al.gym_id = $1
         AND al.checked_in_at::date = $2::date
         AND (m.name ILIKE $3 OR m.scan_token ILIKE $3)
       ORDER BY al.checked_in_at DESC
       LIMIT 200`,
      [req.gymId, date, search]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/members?search=alice
router.get('/members', async (req, res, next) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : '%';

    const result = await pool.query(
      `SELECT id, name, scan_token, expiry_date, created_at
       FROM members
       WHERE gym_id = $1
         AND deleted_at IS NULL
         AND (name ILIKE $2 OR scan_token ILIKE $2)
       ORDER BY scan_token`,
      [req.gymId, search]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/members
router.post('/members', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, expiryDate } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!expiryDate) return res.status(400).json({ error: 'Expiry date is required' });

    await client.query('BEGIN');

    // Lock gym row and get next counter
    const gymResult = await client.query(
      'SELECT member_id_counter FROM gyms WHERE id = $1 FOR UPDATE',
      [req.gymId]
    );
    const newCounter = gymResult.rows[0].member_id_counter + 1;
    const scanToken = generateGymMemberId(newCounter);

    await client.query(
      'UPDATE gyms SET member_id_counter = $1 WHERE id = $2',
      [newCounter, req.gymId]
    );

    const result = await client.query(
      `INSERT INTO members (gym_id, name, scan_token, expiry_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, scan_token, expiry_date, created_at`,
      [req.gymId, name.trim(), scanToken, expiryDate]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/admin/members/:id
router.put('/members/:id', async (req, res, next) => {
  try {
    const { name, expiryDate } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!expiryDate) return res.status(400).json({ error: 'Expiry date is required' });

    const result = await pool.query(
      `UPDATE members
       SET name = $1, expiry_date = $2, updated_at = NOW()
       WHERE id = $3 AND gym_id = $4 AND deleted_at IS NULL
       RETURNING id, name, scan_token, expiry_date, created_at`,
      [name.trim(), expiryDate, req.params.id, req.gymId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/members/:id (soft delete)
router.delete('/members/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE members
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND gym_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.gymId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/pin
router.put('/pin', async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin) {
      return res.status(400).json({ error: 'currentPin and newPin are required' });
    }
    if (!/^\d{4,6}$/.test(String(newPin))) {
      return res.status(400).json({ error: 'New PIN must be 4-6 digits' });
    }

    const gymResult = await pool.query(
      'SELECT admin_pin_hash FROM gyms WHERE id = $1',
      [req.gymId]
    );
    const gym = gymResult.rows[0];

    const isValid = await bcrypt.compare(String(currentPin), gym.admin_pin_hash);
    if (!isValid) return res.status(401).json({ error: 'Current PIN is incorrect' });

    const newHash = await bcrypt.hash(String(newPin), 10);
    await pool.query(
      'UPDATE gyms SET admin_pin_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.gymId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
