import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';
import pool from '../db/pool.js';
import { generateGymMemberId } from '../utils/gymId.js';

const router = Router();

router.use(requireAuth, injectGymId);

const calcExpiry = (currentExpiry, durationDays) => {
  const base = currentExpiry && new Date(currentExpiry) > new Date()
    ? new Date(currentExpiry)
    : new Date();
  base.setDate(base.getDate() + durationDays);
  return base.toISOString().slice(0, 10);
};

// GET /api/groups — list all groups with members + package info
router.get('/', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const groupsResult = await pool.query(
      `SELECT g.id, g.name, g.expiry_date, g.created_at,
              p.id AS package_id, p.name AS package_name, p.duration_days, p.price
       FROM member_groups g
       JOIN membership_packages p ON p.id = g.package_id
       WHERE g.gym_id = $1
       ORDER BY g.created_at DESC`,
      [req.gymId]
    );

    const groups = groupsResult.rows;
    if (groups.length === 0) return res.json([]);

    const groupIds = groups.map((g) => g.id);
    const membersResult = await pool.query(
      `SELECT id, name, scan_token, phone_number, group_id
       FROM members
       WHERE gym_id = $1 AND group_id = ANY($2) AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [req.gymId, groupIds]
    );

    const membersByGroup = {};
    for (const m of membersResult.rows) {
      if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
      membersByGroup[m.group_id].push({ id: m.id, name: m.name, scan_token: m.scan_token, phone_number: m.phone_number });
    }

    res.json(groups.map((g) => ({ ...g, members: membersByGroup[g.id] ?? [] })));
  } catch (err) {
    next(err);
  }
});

// POST /api/groups — create group + first batch of members
router.post('/', requireRole('admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, packageId, members } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });
    if (!packageId) return res.status(400).json({ error: 'Package is required' });
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'At least one member is required' });
    }

    const phoneRe = /^\+62\d{8,13}$/;
    for (const m of members) {
      if (!m.name?.trim()) return res.status(400).json({ error: 'Each member must have a name' });
      if (m.phoneNumber && !phoneRe.test(m.phoneNumber)) {
        return res.status(400).json({ error: `Invalid phone number for ${m.name}. Use +62 format.` });
      }
    }

    const pkgResult = await pool.query(
      'SELECT id, name, duration_days, price, code FROM membership_packages WHERE id = $1 AND gym_id = $2 AND is_group = true',
      [packageId, req.gymId]
    );
    if (pkgResult.rows.length === 0) {
      return res.status(400).json({ error: 'Group package not found' });
    }
    const pkg = pkgResult.rows[0];
    const expiryDate = calcExpiry(null, pkg.duration_days);

    await client.query('BEGIN');

    const groupResult = await client.query(
      `INSERT INTO member_groups (gym_id, name, package_id, expiry_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.gymId, name.trim(), pkg.id, expiryDate]
    );
    const groupId = groupResult.rows[0].id;

    const gymResult = await client.query(
      'SELECT member_id_counter, use_package_prefix FROM gyms WHERE id = $1 FOR UPDATE',
      [req.gymId]
    );
    let counter = gymResult.rows[0].member_id_counter;
    const usePrefix = gymResult.rows[0].use_package_prefix;
    const packageCode = (usePrefix && pkg.code) ? pkg.code : null;

    const defaultHash = await bcrypt.hash('password123', 10);
    const createdMembers = [];

    for (const m of members) {
      counter += 1;
      const scanToken = generateGymMemberId(counter, packageCode);
      const memberResult = await client.query(
        `INSERT INTO members (gym_id, name, scan_token, expiry_date, package_id, phone_number, password_hash, group_id, member_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, name, scan_token, phone_number`,
        [req.gymId, m.name.trim(), scanToken, expiryDate, pkg.id, m.phoneNumber || null, defaultHash, groupId, counter]
      );
      createdMembers.push(memberResult.rows[0]);
    }

    await client.query(
      'UPDATE gyms SET member_id_counter = $1 WHERE id = $2',
      [counter, req.gymId]
    );

    await client.query(
      `INSERT INTO transactions (gym_id, type, amount, package_id, group_id)
       VALUES ($1, 'new_member', $2, $3, $4)`,
      [req.gymId, pkg.price, pkg.id, groupId]
    );

    await client.query('COMMIT');
    res.status(201).json({
      id: groupId,
      name: name.trim(),
      package_id: pkg.id,
      package_name: pkg.name,
      duration_days: pkg.duration_days,
      price: pkg.price,
      expiry_date: expiryDate,
      members: createdMembers,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/groups/:id — rename group or change package
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, packageId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });
    if (!packageId) return res.status(400).json({ error: 'Package is required' });

    const pkgResult = await pool.query(
      'SELECT id, name FROM membership_packages WHERE id = $1 AND gym_id = $2 AND is_group = true',
      [packageId, req.gymId]
    );
    if (pkgResult.rows.length === 0) {
      return res.status(400).json({ error: 'Group package not found' });
    }

    const result = await pool.query(
      `UPDATE member_groups SET name = $1, package_id = $2, updated_at = NOW()
       WHERE id = $3 AND gym_id = $4
       RETURNING id, name, package_id, expiry_date`,
      [name.trim(), packageId, req.params.id, req.gymId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    res.json({ ...result.rows[0], package_name: pkgResult.rows[0].name });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:id — soft-delete group and all its members
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      'SELECT id FROM member_groups WHERE id = $1 AND gym_id = $2',
      [req.params.id, req.gymId]
    );
    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Group not found' });
    }

    await client.query(
      `UPDATE members SET
         deleted_at = CASE WHEN deleted_at IS NULL THEN NOW() ELSE deleted_at END,
         group_id = NULL
       WHERE group_id = $1`,
      [req.params.id]
    );
    await client.query(
      'UPDATE transactions SET group_id = NULL WHERE group_id = $1',
      [req.params.id]
    );
    await client.query(
      'DELETE FROM member_groups WHERE id = $1 AND gym_id = $2',
      [req.params.id, req.gymId]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/groups/:id/members — add a new member to an existing group
router.post('/:id/members', requireRole('admin', 'staff'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, phoneNumber } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const phoneRe = /^\+62\d{8,13}$/;
    if (phoneNumber && !phoneRe.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use +62 format.' });
    }

    const groupResult = await pool.query(
      `SELECT g.id, g.expiry_date, g.package_id, p.code AS package_code
       FROM member_groups g
       JOIN membership_packages p ON p.id = g.package_id
       WHERE g.id = $1 AND g.gym_id = $2`,
      [req.params.id, req.gymId]
    );
    if (groupResult.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const group = groupResult.rows[0];

    await client.query('BEGIN');

    const gymResult = await client.query(
      'SELECT member_id_counter, use_package_prefix FROM gyms WHERE id = $1 FOR UPDATE',
      [req.gymId]
    );
    const usePrefix = gymResult.rows[0].use_package_prefix;
    const packageCode = (usePrefix && group.package_code) ? group.package_code : null;

    let memberNumber;
    let scanToken;

    if (packageCode && phoneNumber) {
      const existing = await client.query(
        `SELECT member_number FROM members
         WHERE phone_number = $1 AND gym_id = $2 AND deleted_at IS NULL AND member_number IS NOT NULL
         LIMIT 1`,
        [phoneNumber, req.gymId]
      );
      if (existing.rows.length > 0) {
        memberNumber = existing.rows[0].member_number;
        scanToken = generateGymMemberId(memberNumber, packageCode);
      }
    }

    if (!scanToken) {
      const newCounter = gymResult.rows[0].member_id_counter + 1;
      memberNumber = newCounter;
      scanToken = generateGymMemberId(newCounter, packageCode);
      await client.query('UPDATE gyms SET member_id_counter = $1 WHERE id = $2', [newCounter, req.gymId]);
    }

    const defaultHash = await bcrypt.hash('password123', 10);
    const result = await client.query(
      `INSERT INTO members (gym_id, name, scan_token, expiry_date, package_id, phone_number, password_hash, group_id, member_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, scan_token, phone_number`,
      [req.gymId, name.trim(), scanToken, group.expiry_date, group.package_id, phoneNumber || null, defaultHash, group.id, memberNumber]
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

// DELETE /api/groups/:id/members/:memberId — soft-delete a member from a group, requires PIN
router.delete('/:id/members/:memberId', requireRole('admin'), async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN is required' });

    const gymResult = await pool.query('SELECT admin_pin_hash FROM gyms WHERE id = $1', [req.gymId]);
    const isValid = await bcrypt.compare(String(pin), gymResult.rows[0].admin_pin_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid PIN' });

    const result = await pool.query(
      `UPDATE members SET deleted_at = NOW(), group_id = NULL
       WHERE id = $1 AND group_id = $2 AND gym_id = $3 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.memberId, req.params.id, req.gymId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found in this group' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:id/renew — renew group expiry; one transaction for whole group
router.post('/:id/renew', requireRole('admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ error: 'Package is required' });

    const pkgResult = await pool.query(
      'SELECT id, name, duration_days, price FROM membership_packages WHERE id = $1 AND gym_id = $2 AND is_group = true',
      [packageId, req.gymId]
    );
    if (pkgResult.rows.length === 0) return res.status(400).json({ error: 'Group package not found' });
    const pkg = pkgResult.rows[0];

    const groupResult = await pool.query(
      'SELECT id, expiry_date FROM member_groups WHERE id = $1 AND gym_id = $2',
      [req.params.id, req.gymId]
    );
    if (groupResult.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const group = groupResult.rows[0];

    const newExpiry = calcExpiry(group.expiry_date, pkg.duration_days);

    await client.query('BEGIN');

    await client.query(
      'UPDATE member_groups SET expiry_date = $1, package_id = $2, updated_at = NOW() WHERE id = $3',
      [newExpiry, pkg.id, group.id]
    );

    await client.query(
      `UPDATE members SET expiry_date = $1, package_id = $2
       WHERE group_id = $3 AND deleted_at IS NULL`,
      [newExpiry, pkg.id, group.id]
    );

    await client.query(
      `INSERT INTO transactions (gym_id, type, amount, package_id, group_id)
       VALUES ($1, 'renewal', $2, $3, $4)`,
      [req.gymId, pkg.price, pkg.id, group.id]
    );

    await client.query('COMMIT');
    res.json({ newExpiry, packageName: pkg.name, totalAmount: pkg.price });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
