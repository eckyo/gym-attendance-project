import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import XLSX from 'xlsx';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';
import pool from '../db/pool.js';
import { generateGymMemberId } from '../utils/gymId.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All admin routes require auth + admin role
router.use(requireAuth, injectGymId, requireRole('admin'));

const gymIdToCounter = (gymId) => {
  const letter = gymId.charCodeAt(0) - 65;
  const num = parseInt(gymId.slice(1), 10);
  return letter * 9999 + num;
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

// GET /api/admin/members/export
router.get('/members/export', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT name, scan_token, expiry_date, created_at, phone_number
       FROM members WHERE gym_id = $1 AND deleted_at IS NULL ORDER BY scan_token`,
      [req.gymId]
    );

    const rows = result.rows.map((m) => ({
      Name: m.name,
      'GYM ID': m.scan_token,
      'Expiry Date': m.expiry_date ? new Date(m.expiry_date).toISOString().slice(0, 10) : '',
      'Joined Date': m.created_at ? new Date(m.created_at).toISOString().slice(0, 10) : today,
      'Phone Number': m.phone_number || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="members.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/members/template
router.get('/members/template', async (req, res, next) => {
  try {
    const ws = XLSX.utils.json_to_sheet([], {
      header: ['Name', 'GYM ID', 'Expiry Date', 'Joined Date', 'Phone Number'],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="members-template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/members/import — parse file, validate, return preview
router.post('/members/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const today = new Date().toISOString().slice(0, 10);
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (raw.length === 0) return res.status(400).json({ error: 'File is empty or has no data rows' });

    // Convert Excel date values (Date objects or numeric serials) to YYYY-MM-DD strings
    const toDateStr = (val) => {
      if (!val && val !== 0) return '';
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      const s = String(val).trim();
      if (!s) return '';
      // Handle DD-MM-YYYY or DD/MM/YYYY (Indonesian/European format) before falling back to JS Date
      const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (dmy) {
        const iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
        if (!isNaN(Date.parse(iso))) return iso;
      }
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      return s; // return raw so validation can catch it
    };

    // Collect all gym IDs from the file to detect intra-file duplicates
    const seenGymIds = new Map(); // gymId → first rowIndex

    // Fetch existing scan_tokens for this gym
    const existingResult = await pool.query(
      'SELECT scan_token FROM members WHERE gym_id = $1 AND deleted_at IS NULL',
      [req.gymId]
    );
    const existingIds = new Set(existingResult.rows.map((r) => r.scan_token));

    const rows = raw.map((row, i) => {
      const rowIndex = i + 1;
      const name = String(row['Name'] || '').trim();
      const gymId = String(row['GYM ID'] || '').trim().toUpperCase();
      const expiryDate = toDateStr(row['Expiry Date']);
      const joinedDate = toDateStr(row['Joined Date']) || today;
      const phoneNumber = String(row['Phone Number'] || '').trim() || null;

      const errors = [];

      if (!name) errors.push('Name is required');

      if (!gymId) {
        errors.push('GYM ID is required');
      } else if (!/^[A-Z0-9]{1,10}$/.test(gymId)) {
        errors.push(`GYM ID "${gymId}" is invalid (must be 1–10 alphanumeric characters, e.g. A1, GYM01, A0001)`);
      } else if (existingIds.has(gymId)) {
        errors.push(`GYM ID ${gymId} already exists in the system`);
      } else if (seenGymIds.has(gymId)) {
        errors.push(`GYM ID ${gymId} is duplicated in this file (first seen on row ${seenGymIds.get(gymId)})`);
      }

      if (gymId && /^[A-Z0-9]{1,10}$/.test(gymId) && !existingIds.has(gymId) && !seenGymIds.has(gymId)) {
        seenGymIds.set(gymId, rowIndex);
      }

      if (expiryDate && isNaN(Date.parse(expiryDate))) {
        errors.push(`Expiry Date "${expiryDate}" is not a valid date`);
      }

      if (joinedDate !== today && isNaN(Date.parse(joinedDate))) {
        errors.push(`Joined Date "${joinedDate}" is not a valid date`);
      }

      return { rowIndex, name, gymId, expiryDate, joinedDate, phoneNumber, errors };
    });

    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/members/import/confirm — insert valid rows
router.post('/members/import/confirm', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows to import' });
    }

    await client.query('BEGIN');

    const gymResult = await client.query(
      'SELECT member_id_counter FROM gyms WHERE id = $1 FOR UPDATE',
      [req.gymId]
    );
    let counter = gymResult.rows[0].member_id_counter;

    // Only sync counter for standard-format IDs (A0001…) to protect future auto-gen IDs
    const STANDARD_ID_RE = /^[A-Z]\d{4}$/;
    const standardCounters = rows
      .map((r) => r.gymId)
      .filter((id) => STANDARD_ID_RE.test(id))
      .map((id) => gymIdToCounter(id));
    if (standardCounters.length > 0) {
      counter = Math.max(counter, Math.max(...standardCounters));
    }

    const inserted = [];
    for (const row of rows) {
      const result = await client.query(
        `INSERT INTO members (gym_id, name, scan_token, expiry_date, phone_number, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6)
         RETURNING id, name, scan_token, expiry_date, phone_number, created_at`,
        [
          req.gymId,
          row.name,
          row.gymId,
          row.expiryDate || null,
          row.phoneNumber || null,
          row.joinedDate,
        ]
      );
      inserted.push(result.rows[0]);
    }

    await client.query(
      'UPDATE gyms SET member_id_counter = $1 WHERE id = $2',
      [counter, req.gymId]
    );

    await client.query('COMMIT');
    res.json({ imported: inserted.length, members: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

const SORT_COLS = {
  name: 'm.name',
  scan_token: 'm.scan_token',
  expiry_date: 'm.expiry_date',
  created_at: 'm.created_at',
  package_name: 'p.name',
};

// GET /api/admin/members?search=alice&limit=20&offset=0&sort=name&order=asc
router.get('/members', async (req, res, next) => {
  try {
    const search  = req.query.search ? `%${req.query.search}%` : '%';
    const limit   = Math.min(parseInt(req.query.limit,  10) || 20, 100);
    const offset  = Math.max(parseInt(req.query.offset, 10) || 0,  0);
    const sortCol = SORT_COLS[req.query.sort] ?? 'm.scan_token';
    const sortOrd = req.query.order === 'desc' ? 'DESC' : 'ASC';

    const result = await pool.query(
      `SELECT m.id, m.name, m.scan_token, m.expiry_date, m.phone_number, m.created_at,
              p.id AS package_id, p.name AS package_name, p.duration_days, p.price,
              COUNT(*) OVER() AS total_count
       FROM members m
       LEFT JOIN membership_packages p ON p.id = m.package_id
       WHERE m.gym_id = $1
         AND m.deleted_at IS NULL
         AND (m.name ILIKE $2 OR m.scan_token ILIKE $2)
       ORDER BY ${sortCol} ${sortOrd} NULLS LAST
       LIMIT $3 OFFSET $4`,
      [req.gymId, search, limit, offset]
    );

    const total = parseInt(result.rows[0]?.total_count ?? 0, 10);
    const members = result.rows.map(({ total_count, ...r }) => r);
    res.json({ members, total });
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

// POST /api/admin/members
router.post('/members', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, expiryDate, packageId, phoneNumber } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const phoneRe = /^\+62\d{8,13}$/;
    if (phoneNumber && !phoneRe.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use +62 followed by 8–13 digits.' });
    }

    let resolvedExpiry = expiryDate || null;
    let resolvedPackageId = null;
    let packageName = null;

    if (packageId) {
      const pkgResult = await pool.query(
        'SELECT id, name, duration_days FROM membership_packages WHERE id = $1 AND gym_id = $2',
        [packageId, req.gymId]
      );
      if (pkgResult.rows.length === 0) return res.status(400).json({ error: 'Package not found' });
      const pkg = pkgResult.rows[0];
      resolvedExpiry = calcExpiry(null, pkg.duration_days);
      resolvedPackageId = pkg.id;
      packageName = pkg.name;
    }

    if (!resolvedExpiry) return res.status(400).json({ error: 'Expiry date is required' });

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
      `INSERT INTO members (gym_id, name, scan_token, expiry_date, package_id, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, scan_token, expiry_date, package_id, phone_number, created_at`,
      [req.gymId, name.trim(), scanToken, resolvedExpiry, resolvedPackageId, phoneNumber || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...result.rows[0], package_name: packageName });
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
    const { name, expiryDate, packageId, phoneNumber } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const phoneRe = /^\+62\d{8,13}$/;
    if (phoneNumber && !phoneRe.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use +62 followed by 8–13 digits.' });
    }

    let resolvedExpiry = expiryDate || null;
    let resolvedPackageId = packageId === undefined ? undefined : (packageId || null);
    let packageName = null;

    if (packageId) {
      const current = await pool.query(
        'SELECT expiry_date FROM members WHERE id = $1 AND gym_id = $2 AND deleted_at IS NULL',
        [req.params.id, req.gymId]
      );
      if (current.rows.length === 0) return res.status(404).json({ error: 'Member not found' });

      const pkgResult = await pool.query(
        'SELECT id, name, duration_days FROM membership_packages WHERE id = $1 AND gym_id = $2',
        [packageId, req.gymId]
      );
      if (pkgResult.rows.length === 0) return res.status(400).json({ error: 'Package not found' });
      const pkg = pkgResult.rows[0];
      resolvedExpiry = calcExpiry(current.rows[0].expiry_date, pkg.duration_days);
      resolvedPackageId = pkg.id;
      packageName = pkg.name;
    }

    if (!resolvedExpiry) return res.status(400).json({ error: 'Expiry date is required' });

    const setClauses = ['name = $1', 'expiry_date = $2', 'updated_at = NOW()'];
    const params = [name.trim(), resolvedExpiry];

    if (resolvedPackageId !== undefined) {
      setClauses.push(`package_id = $${params.length + 1}`);
      params.push(resolvedPackageId);
    }

    if (phoneNumber !== undefined) {
      setClauses.splice(2, 0, `phone_number = $${params.length + 1}`);
      params.push(phoneNumber || null);
    }

    params.push(req.params.id, req.gymId);
    const result = await pool.query(
      `UPDATE members SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND gym_id = $${params.length} AND deleted_at IS NULL
       RETURNING id, name, scan_token, expiry_date, package_id, phone_number, created_at`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });

    if (!packageName && result.rows[0].package_id) {
      const pkgResult = await pool.query(
        'SELECT name FROM membership_packages WHERE id = $1',
        [result.rows[0].package_id]
      );
      packageName = pkgResult.rows[0]?.name || null;
    }

    res.json({ ...result.rows[0], package_name: packageName });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/members/:id (soft delete, requires PIN)
router.delete('/members/:id', async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN is required' });

    const gymResult = await pool.query(
      'SELECT admin_pin_hash FROM gyms WHERE id = $1',
      [req.gymId]
    );
    const isValid = await bcrypt.compare(String(pin), gymResult.rows[0].admin_pin_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid PIN' });

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

// GET /api/admin/staff
router.get('/staff', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, created_at FROM users
       WHERE gym_id = $1 AND role = 'staff'
       ORDER BY created_at ASC`,
      [req.gymId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/staff
router.post('/staff', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (gym_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'staff')
       RETURNING id, email, created_at`,
      [req.gymId, email.trim().toLowerCase(), passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A staff account with this email already exists' });
    }
    next(err);
  }
});

// DELETE /api/admin/staff/:id (requires PIN)
router.delete('/staff/:id', async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN is required' });

    const gymResult = await pool.query(
      'SELECT admin_pin_hash FROM gyms WHERE id = $1',
      [req.gymId]
    );
    const isValid = await bcrypt.compare(String(pin), gymResult.rows[0].admin_pin_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid PIN' });

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 AND gym_id = $2 AND role = 'staff' RETURNING id`,
      [req.params.id, req.gymId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Staff not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/staff/:id/password (requires admin PIN)
router.put('/staff/:id/password', async (req, res, next) => {
  try {
    const { newPassword, pin } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!pin) return res.status(400).json({ error: 'PIN is required' });

    const gymResult = await pool.query(
      'SELECT admin_pin_hash FROM gyms WHERE id = $1',
      [req.gymId]
    );
    const isValid = await bcrypt.compare(String(pin), gymResult.rows[0].admin_pin_hash);
    if (!isValid) return res.status(403).json({ error: 'Invalid PIN' });

    const hash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND gym_id = $3 AND role = 'staff' RETURNING id`,
      [hash, req.params.id, req.gymId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Staff not found' });
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
