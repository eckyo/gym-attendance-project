import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';
import { processScan, MemberNotFoundError, DuplicateCheckInError, MemberExpiredError } from '../services/attendance.js';

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

export default router;
