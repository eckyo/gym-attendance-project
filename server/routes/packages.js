import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';
import pool from '../db/pool.js';

const router = Router();

// GET — accessible to admin + staff (needed for RegisterModal dropdown)
router.get('/', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, duration_days, price, is_default, has_registration_fee, registration_fee, is_group, created_at
       FROM membership_packages WHERE gym_id = $1 ORDER BY price ASC`,
      [req.gymId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST — admin only
router.post('/', requireAuth, injectGymId, requireRole('admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, durationDays, price, isDefault, hasRegistrationFee, registrationFee, isGroup } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!durationDays || durationDays < 1) return res.status(400).json({ error: 'Duration must be at least 1 day' });
    if (price == null || price < 0) return res.status(400).json({ error: 'Price must be 0 or more' });
    if (registrationFee != null && registrationFee < 0) return res.status(400).json({ error: 'Registration fee must be 0 or more' });

    const regFee = hasRegistrationFee ? (registrationFee ?? 0) : 0;

    await client.query('BEGIN');
    if (isDefault) {
      await client.query(
        'UPDATE membership_packages SET is_default = false, updated_at = NOW() WHERE gym_id = $1',
        [req.gymId]
      );
    }
    const result = await client.query(
      `INSERT INTO membership_packages (gym_id, name, duration_days, price, is_default, has_registration_fee, registration_fee, is_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, duration_days, price, is_default, has_registration_fee, registration_fee, is_group, created_at`,
      [req.gymId, name.trim(), durationDays, price, !!isDefault, !!hasRegistrationFee, regFee, !!isGroup]
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

// PUT /:id — admin only
router.put('/:id', requireAuth, injectGymId, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, durationDays, price, hasRegistrationFee, registrationFee, isGroup } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!durationDays || durationDays < 1) return res.status(400).json({ error: 'Duration must be at least 1 day' });
    if (price == null || price < 0) return res.status(400).json({ error: 'Price must be 0 or more' });
    if (registrationFee != null && registrationFee < 0) return res.status(400).json({ error: 'Registration fee must be 0 or more' });

    const regFee = hasRegistrationFee ? (registrationFee ?? 0) : 0;

    const result = await pool.query(
      `UPDATE membership_packages
       SET name = $1, duration_days = $2, price = $3, has_registration_fee = $4, registration_fee = $5, is_group = $6, updated_at = NOW()
       WHERE id = $7 AND gym_id = $8
       RETURNING id, name, duration_days, price, is_default, has_registration_fee, registration_fee, is_group, created_at`,
      [name.trim(), durationDays, price, !!hasRegistrationFee, regFee, !!isGroup, req.params.id, req.gymId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Package not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — admin only, blocked if members assigned
router.delete('/:id', requireAuth, injectGymId, requireRole('admin'), async (req, res, next) => {
  try {
    const [memberRes, groupRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM members WHERE package_id = $1 AND deleted_at IS NULL', [req.params.id]),
      pool.query('SELECT COUNT(*) FROM member_groups WHERE package_id = $1', [req.params.id]),
    ]);
    const memberCount = parseInt(memberRes.rows[0].count);
    const groupCount  = parseInt(groupRes.rows[0].count);
    if (memberCount > 0 || groupCount > 0) {
      const parts = [];
      if (groupCount  > 0) parts.push(`${groupCount} group${groupCount  !== 1 ? 's' : ''}`);
      if (memberCount > 0) parts.push(`${memberCount} member${memberCount !== 1 ? 's' : ''}`);
      return res.status(409).json({
        error: `Cannot delete — used by ${parts.join(' and ')}. Reassign or remove them first.`,
      });
    }
    await Promise.all([
      pool.query('UPDATE members SET package_id = NULL WHERE package_id = $1 AND deleted_at IS NOT NULL', [req.params.id]),
      pool.query('UPDATE transactions SET package_id = NULL WHERE package_id = $1', [req.params.id]),
    ]);
    const result = await pool.query(
      'DELETE FROM membership_packages WHERE id = $1 AND gym_id = $2 RETURNING id',
      [req.params.id, req.gymId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Package not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/default — admin only
router.patch('/:id/default', requireAuth, injectGymId, requireRole('admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE membership_packages SET is_default = false, updated_at = NOW() WHERE gym_id = $1',
      [req.gymId]
    );
    const result = await client.query(
      `UPDATE membership_packages SET is_default = true, updated_at = NOW()
       WHERE id = $1 AND gym_id = $2
       RETURNING id, name, duration_days, price, is_default`,
      [req.params.id, req.gymId]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Package not found' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
