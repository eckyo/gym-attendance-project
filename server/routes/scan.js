import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';
import { processScan, MemberNotFoundError, DuplicateCheckInError, MemberExpiredError } from '../services/attendance.js';
import pool from '../db/pool.js';

const router = Router();

router.post('/', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { scanToken } = req.body;

    if (!scanToken?.trim()) {
      return res.status(400).json({ error: 'scanToken is required' });
    }

    const result = await processScan(req.gymId, scanToken.trim());
    res.json({ success: true, memberName: result.memberName, checkedInAt: result.checkedInAt, gymId: result.scanToken });
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

// POST /api/scan/verify-pin — verify gym admin PIN for staff and admins
router.post('/verify-pin', requireAuth, injectGymId, requireRole('admin', 'staff'), async (req, res, next) => {
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

export default router;
