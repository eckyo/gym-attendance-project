import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';
import {
  processMemberSelfCheckin,
  MemberNotFoundError,
  DuplicateCheckInError,
  MemberExpiredError,
} from '../services/attendance.js';

const router = Router();

const requireMember = [requireAuth, injectGymId, requireRole('member')];

// POST /api/member/login — public, no auth required
router.post('/login', async (req, res, next) => {
  try {
    const { phoneNumber, password, remember, memberId, gymCode, scanToken } = req.body;

    if (!password?.trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // ── Gym code path ─────────────────────────────────────────────────────────
    if (gymCode?.trim()) {
      if (!scanToken?.trim()) {
        return res.status(400).json({ error: 'GYM ID is required' });
      }

      const gymResult = await pool.query(
        'SELECT id FROM gyms WHERE gym_code = $1 AND is_active = true',
        [gymCode.toLowerCase().trim()]
      );
      if (gymResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid gym code or GYM ID' });
      }
      const gymId = gymResult.rows[0].id;

      const memberResult = await pool.query(
        `SELECT m.id, m.name, m.password_hash, m.expiry_date, m.scan_token, m.gym_id,
                g.name AS gym_name
         FROM members m
         JOIN gyms g ON g.id = m.gym_id
         WHERE m.scan_token = $1 AND m.gym_id = $2 AND m.deleted_at IS NULL`,
        [scanToken.trim().toUpperCase(), gymId]
      );

      const member = memberResult.rows[0];
      if (!member || !member.password_hash) {
        return res.status(401).json({ error: 'Invalid gym code or GYM ID' });
      }

      const isValid = await bcrypt.compare(password, member.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid gym code or GYM ID' });
      }

      const token = jwt.sign(
        { userId: member.id, gymId: member.gym_id, role: 'member' },
        process.env.JWT_SECRET,
        { expiresIn: remember ? '30d' : '8h' }
      );

      return res.json({ token, member: { id: member.id, name: member.name, gymId: member.gym_id } });
    }

    // ── Phone number path ─────────────────────────────────────────────────────
    if (!phoneNumber?.trim()) {
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    // Normalize input: strip all non-digits, then re-add +62 prefix
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    const normalizedInput = '62' + (digitsOnly.startsWith('62') ? digitsOnly.slice(2) : digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly);

    const params = [normalizedInput];
    const memberFilter = memberId ? `AND m.id = $${params.push(memberId)}` : '';

    const result = await pool.query(
      `SELECT m.id, m.gym_id, m.name, m.phone_number, m.password_hash, m.expiry_date, m.scan_token,
              g.name AS gym_name,
              p.name AS package_name
       FROM members m
       JOIN gyms g ON g.id = m.gym_id
       LEFT JOIN membership_packages p ON p.id = m.package_id
       WHERE CASE
               WHEN REGEXP_REPLACE(m.phone_number, '[^0-9]', '', 'g') LIKE '62%'
                 THEN REGEXP_REPLACE(m.phone_number, '[^0-9]', '', 'g')
               WHEN REGEXP_REPLACE(m.phone_number, '[^0-9]', '', 'g') LIKE '0%'
                 THEN '62' || SUBSTRING(REGEXP_REPLACE(m.phone_number, '[^0-9]', '', 'g') FROM 2)
               ELSE
                 '62' || REGEXP_REPLACE(m.phone_number, '[^0-9]', '', 'g')
             END = $1
             AND m.deleted_at IS NULL AND g.is_active = true
             ${memberFilter}
       LIMIT 10`,
      params
    );

    if (result.rows.length > 1) {
      const checked = await Promise.all(
        result.rows.map(async (row) => ({
          ...row,
          matches: row.password_hash ? await bcrypt.compare(password, row.password_hash) : false,
        }))
      );
      const matches = checked.filter((r) => r.matches);

      if (matches.length === 0) return res.status(401).json({ error: 'Invalid password' });

      if (matches.length === 1) {
        result.rows = [matches[0]];
      } else {
        return res.status(207).json({
          requiresSelection: true,
          accounts: matches.map((m) => ({
            memberId: m.id,
            gymId: m.gym_id,
            memberName: m.name,
            gymName: m.gym_name,
            scanToken: m.scan_token,
            packageName: m.package_name || null,
            expiryDate: m.expiry_date ? m.expiry_date.toISOString().slice(0, 10) : null,
          })),
        });
      }
    }

    const member = result.rows[0];

    if (!member) {
      return res.status(400).json({ error: 'Member not found. Please check your phone number.' });
    }

    if (!member.password_hash) {
      return res.status(400).json({ error: 'No password set — ask staff to update your profile.' });
    }

    const isValid = await bcrypt.compare(password, member.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { userId: member.id, gymId: member.gym_id, role: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: remember ? '30d' : '8h' }
    );

    res.json({ token, member: { id: member.id, name: member.name, gymId: member.gym_id } });
  } catch (err) {
    next(err);
  }
});

// GET /api/member/profile
router.get('/profile', ...requireMember, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.name, m.phone_number, m.expiry_date, m.scan_token,
              p.name AS package_name,
              g.name AS gym_name
       FROM members m
       LEFT JOIN membership_packages p ON p.id = m.package_id
       JOIN gyms g ON g.id = m.gym_id
       WHERE m.id = $1 AND m.gym_id = $2 AND m.deleted_at IS NULL`,
      [req.user.userId, req.gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = result.rows[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let status = 'active';
    if (member.expiry_date) {
      const expiry = new Date(member.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        status = 'expired';
      } else if (daysLeft <= 7) {
        status = 'expiring_soon';
      }
    }

    res.json({
      name: member.name,
      phoneNumber: member.phone_number,
      packageName: member.package_name || null,
      expiryDate: member.expiry_date || null,
      scanToken: member.scan_token,
      gymName: member.gym_name,
      status,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/member/checkin-history
router.get('/checkin-history', ...requireMember, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 30);
    const offset = (page - 1) * limit;

    const [logsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, checked_in_at, checked_out_at
         FROM attendance_logs
         WHERE member_id = $1 AND gym_id = $2
         ORDER BY checked_in_at DESC
         LIMIT $3 OFFSET $4`,
        [req.user.userId, req.gymId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM attendance_logs WHERE member_id = $1 AND gym_id = $2`,
        [req.user.userId, req.gymId]
      ),
    ]);

    const total = parseInt(countResult.rows[0].total);
    res.json({
      logs: logsResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/member/checkin — member self-check-in via gym's standby QR
router.post('/checkin', ...requireMember, async (req, res, next) => {
  try {
    const { checkinCode } = req.body;

    if (!checkinCode?.trim()) {
      return res.status(400).json({ error: 'Check-in code is required' });
    }

    const gymResult = await pool.query(
      'SELECT checkin_code FROM gyms WHERE id = $1',
      [req.gymId]
    );

    if (!gymResult.rows[0] || gymResult.rows[0].checkin_code !== checkinCode.trim()) {
      return res.status(400).json({ error: 'Invalid check-in code' });
    }

    const result = await processMemberSelfCheckin(req.gymId, req.user.userId);
    res.json({ success: true, memberName: result.memberName, checkedInAt: result.checkedInAt });
  } catch (err) {
    if (err instanceof MemberNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof DuplicateCheckInError) {
      return res.status(409).json({ error: err.message });
    }
    if (err instanceof MemberExpiredError) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
});

// PUT /api/member/password
router.put('/password', ...requireMember, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await pool.query(
      'SELECT password_hash FROM members WHERE id = $1 AND gym_id = $2',
      [req.user.userId, req.gymId]
    );

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE members SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.userId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
