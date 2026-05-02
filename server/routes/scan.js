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
      return res.status(403).json({
        error: err.message,
        memberId: err.memberData?.memberId,
        memberName: err.memberData?.memberName,
        scanToken: err.memberData?.scanToken,
        expiryDate: err.memberData?.expiryDate,
      });
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

    let pkg = null;
    if (packageId) {
      const pkgResult = await client.query(
        'SELECT id, name, duration_days, price, code FROM membership_packages WHERE id = $1 AND gym_id = $2',
        [packageId, req.gymId]
      );
      if (pkgResult.rows.length === 0) return res.status(400).json({ error: 'Package not found' });
      pkg = pkgResult.rows[0];
      resolvedExpiry = calcExpiry(null, pkg.duration_days);
      resolvedPackageId = pkg.id;
      packageName = pkg.name;
    }

    await client.query('BEGIN');

    const gymResult = await client.query(
      'SELECT member_id_counter, use_package_prefix FROM gyms WHERE id = $1 FOR UPDATE',
      [req.gymId]
    );
    const newCounter = gymResult.rows[0].member_id_counter + 1;
    const packageCode = (gymResult.rows[0].use_package_prefix && pkg?.code) ? pkg.code : null;
    const scanToken = generateGymMemberId(newCounter, packageCode);
    await client.query('UPDATE gyms SET member_id_counter = $1 WHERE id = $2', [newCounter, req.gymId]);

    const defaultHash = await bcrypt.hash('password123', 10);
    const memberResult = await client.query(
      `INSERT INTO members (gym_id, name, scan_token, expiry_date, package_id, password_hash, member_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, scan_token, expiry_date`,
      [req.gymId, name.trim(), scanToken, resolvedExpiry, resolvedPackageId, defaultHash, newCounter]
    );
    const member = memberResult.rows[0];

    const logResult = await client.query(
      `INSERT INTO attendance_logs (gym_id, member_id, checked_in_at)
       VALUES ($1, $2, NOW()) RETURNING checked_in_at`,
      [req.gymId, member.id]
    );

    await client.query(
      `INSERT INTO transactions (gym_id, member_id, type, amount, package_id)
       VALUES ($1, $2, 'new_member', $3, $4)`,
      [req.gymId, member.id, pkg?.price ?? 0, resolvedPackageId]
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

// GET /api/scan/standby-qr — return gym's static check-in QR code data
router.get('/standby-qr', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT name, checkin_code, gym_code FROM gyms WHERE id = $1',
      [req.gymId]
    );
    const gym = result.rows[0];
    res.json({ gymName: gym.name, checkinCode: gym.checkin_code, gymCode: gym.gym_code ?? null });
  } catch (err) {
    next(err);
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
    const visitorPrice = gymResult.rows[0].visitor_price;
    await pool.query(
      `INSERT INTO transactions (gym_id, member_id, type, amount, package_id)
       VALUES ($1, $2, 'walk_in', $3, NULL)`,
      [req.gymId, result.visitorMemberId, visitorPrice]
    );
    res.json({
      success: true,
      visitorName: result.visitorName,
      checkedInAt: result.checkedInAt,
      isNew: result.isNew,
      visitorPrice,
    });
  } catch (err) {
    if (err instanceof DuplicateCheckInError) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/scan/member-lookup — look up a member by scan_token (staff + admin)
router.get('/member-lookup', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { scanToken } = req.query;
    if (!scanToken?.trim()) return res.status(400).json({ error: 'scanToken is required' });
    const result = await pool.query(
      `SELECT m.id, m.name, m.scan_token, m.expiry_date,
              mp.name AS package_name, mp.id AS package_id
       FROM members m
       LEFT JOIN membership_packages mp ON m.package_id = mp.id
       WHERE m.gym_id = $1 AND m.scan_token = $2 AND m.deleted_at IS NULL AND m.is_visitor = false`,
      [req.gymId, scanToken.trim()]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/scan/extend-member — staff/admin extends a member's membership
router.post('/extend-member', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { memberId, packageId, staffPassword } = req.body;
    if (!memberId || !packageId || !staffPassword) {
      return res.status(400).json({ error: 'memberId, packageId and staffPassword are required' });
    }

    // Verify password of the authenticated user (staff or admin)
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 AND gym_id = $2',
      [req.user.userId, req.gymId]
    );
    if (!userResult.rows[0]) return res.status(401).json({ error: 'User not found' });
    const isValid = await bcrypt.compare(String(staffPassword), userResult.rows[0].password_hash);
    if (!isValid) return res.status(401).json({ error: 'Incorrect password' });

    // Fetch member, package, and gym settings in parallel
    const [memberRes, pkgRes, gymRes] = await Promise.all([
      pool.query(
        'SELECT expiry_date FROM members WHERE id = $1 AND gym_id = $2 AND deleted_at IS NULL',
        [memberId, req.gymId]
      ),
      pool.query(
        'SELECT id, name, duration_days, price, has_registration_fee, registration_fee FROM membership_packages WHERE id = $1 AND gym_id = $2',
        [packageId, req.gymId]
      ),
      pool.query(
        'SELECT reg_fee_rule_enabled, reg_fee_grace_months FROM gyms WHERE id = $1',
        [req.gymId]
      ),
    ]);

    if (!memberRes.rows[0]) return res.status(404).json({ error: 'Member not found' });
    if (!pkgRes.rows[0]) return res.status(404).json({ error: 'Package not found' });

    const member = memberRes.rows[0];
    const pkg = pkgRes.rows[0];
    const gym = gymRes.rows[0];

    const newExpiry = calcExpiry(member.expiry_date, pkg.duration_days);

    const expiredMonths = member.expiry_date
      ? (Date.now() - new Date(member.expiry_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      : Infinity;
    const chargeRegFee =
      pkg.has_registration_fee &&
      pkg.registration_fee > 0 &&
      gym.reg_fee_rule_enabled &&
      expiredMonths > gym.reg_fee_grace_months;
    const totalAmount = pkg.price + (chargeRegFee ? Number(pkg.registration_fee) : 0);

    const extClient = await pool.connect();
    try {
      await extClient.query('BEGIN');
      await extClient.query(
        'UPDATE members SET expiry_date = $1, package_id = $2, updated_at = NOW() WHERE id = $3 AND gym_id = $4',
        [newExpiry, pkg.id, memberId, req.gymId]
      );
      await extClient.query(
        `INSERT INTO transactions (gym_id, member_id, type, amount, package_id)
         VALUES ($1, $2, 'renewal', $3, $4)`,
        [req.gymId, memberId, totalAmount, pkg.id]
      );
      await extClient.query('COMMIT');
    } catch (err) {
      await extClient.query('ROLLBACK');
      throw err;
    } finally {
      extClient.release();
    }

    res.json({ newExpiry, packageName: pkg.name, totalAmount, regFeeCharged: chargeRegFee });
  } catch (err) {
    next(err);
  }
});

export default router;
