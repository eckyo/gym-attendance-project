import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';
import { processScan, processVisitorCheckIn, MemberNotFoundError, DuplicateCheckInError, MemberExpiredError } from '../services/attendance.js';
import pool from '../db/pool.js';
import { generateGymMemberId } from '../utils/gymId.js';

const router = Router();

router.post('/', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { scanToken } = req.body;

    if (!scanToken?.trim()) {
      return res.status(400).json({ error: 'scanToken is required' });
    }

    const result = await processScan(req.gymId, scanToken.trim());
    res.json({
      success: true,
      memberName: result.memberName,
      checkedInAt: result.checkedInAt,
      gymId: result.scanToken,
      packageName: result.packageName,
      expiryDate: result.expiryDate,
    });
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

// POST /api/scan/verify-pin — staff verify own password, admin verify gym PIN
router.post('/verify-pin', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'Credential is required' });

    if (req.user.role === 'staff') {
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1 AND gym_id = $2',
        [req.user.userId, req.gymId]
      );
      const isValid = await bcrypt.compare(String(pin), userResult.rows[0].password_hash);
      if (!isValid) return res.status(401).json({ error: 'Invalid password' });
      return res.json({ success: true });
    }

    // Admin: verify against gym admin PIN
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

const calcExpiry = (currentExpiry, durationDays) => {
  const base = currentExpiry && new Date(currentExpiry) > new Date()
    ? new Date(currentExpiry)
    : new Date();
  base.setDate(base.getDate() + durationDays);
  return base.toISOString().slice(0, 10);
};

// POST /api/scan/register — staff registers a new member with auto check-in
router.post('/register', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, expiryDate, phoneNumber, packageId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (phoneNumber && !/^\+62\d{8,13}$/.test(phoneNumber))
      return res.status(400).json({ error: 'Invalid phone number format' });

    let resolvedExpiry = expiryDate || null;
    let resolvedPackageId = null;
    let packageName = null;

    if (packageId) {
      const pkgResult = await client.query(
        'SELECT id, name, duration_days FROM membership_packages WHERE id = $1 AND gym_id = $2',
        [packageId, req.gymId]
      );
      if (pkgResult.rows.length === 0) return res.status(400).json({ error: 'Package not found' });
      const pkg = pkgResult.rows[0];
      resolvedExpiry = calcExpiry(null, pkg.duration_days);
      resolvedPackageId = pkg.id;
      packageName = pkg.name;
    }

    await client.query('BEGIN');

    const gymResult = await client.query(
      'SELECT member_id_counter FROM gyms WHERE id = $1 FOR UPDATE',
      [req.gymId]
    );
    const newCounter = gymResult.rows[0].member_id_counter + 1;
    const scanToken = generateGymMemberId(newCounter);
    await client.query('UPDATE gyms SET member_id_counter = $1 WHERE id = $2', [newCounter, req.gymId]);

    const memberResult = await client.query(
      `INSERT INTO members (gym_id, name, scan_token, expiry_date, package_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, scan_token, expiry_date`,
      [req.gymId, name.trim(), scanToken, resolvedExpiry, resolvedPackageId]
    );
    const member = memberResult.rows[0];

    const logResult = await client.query(
      `INSERT INTO attendance_logs (gym_id, member_id, checked_in_at)
       VALUES ($1, $2, NOW()) RETURNING checked_in_at`,
      [req.gymId, member.id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      memberName: member.name,
      gymId: member.scan_token,
      checkedInAt: logResult.rows[0].checked_in_at,
      packageName,
      expiryDate: member.expiry_date,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/scan/visitor — walk-in check-in for non-member
router.post('/visitor', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { name, phoneNumber } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (phoneNumber && !/^\+62\d{8,13}$/.test(phoneNumber))
      return res.status(400).json({ error: 'Invalid phone number format' });

    const [result, gymResult] = await Promise.all([
      processVisitorCheckIn(req.gymId, name.trim(), phoneNumber || null),
      pool.query('SELECT visitor_price FROM gyms WHERE id = $1', [req.gymId]),
    ]);
    res.json({
      success: true,
      visitorName: result.visitorName,
      checkedInAt: result.checkedInAt,
      isNew: result.isNew,
      visitorPrice: gymResult.rows[0].visitor_price,
    });
  } catch (err) {
    if (err instanceof DuplicateCheckInError) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
