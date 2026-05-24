import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { injectGymId } from '../middleware/tenant.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

router.use(requireAuth, injectGymId);

// ── GET /api/onboarding/state ─────────────────────────────────────────────────
// Returns full onboarding state for the current gym + user.
// Includes derived counts so the client can auto-complete steps without extra calls.
router.get('/state', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         g.onboarding_setup_type,
         g.onboarding_completed_steps,
         g.onboarding_checklist_dismissed,
         u.onboarding_tours_seen,
         g.gym_code,
         (SELECT COUNT(*)::int FROM members m
          WHERE m.gym_id = g.id AND m.deleted_at IS NULL AND m.is_visitor = false) AS member_count,
         (SELECT COUNT(*)::int FROM users u2
          WHERE u2.gym_id = g.id AND u2.role = 'staff') AS staff_count
       FROM gyms g
       JOIN users u ON u.id = $2
       WHERE g.id = $1`,
      [req.gymId, req.user.userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const row = result.rows[0];
    res.json({
      setupType: row.onboarding_setup_type,
      completedSteps: row.onboarding_completed_steps,
      checklistDismissed: row.onboarding_checklist_dismissed,
      toursSeen: row.onboarding_tours_seen,
      gymCode: row.gym_code,
      memberCount: row.member_count,
      staffCount: row.staff_count,
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/onboarding/setup-type ─────────────────────────────────────────
// Save the hardware setup type selected in WelcomeModal (admin only).
// Resets completed steps if the type changes.
router.patch('/setup-type', requireRole('admin'), async (req, res, next) => {
  try {
    const { setupType } = req.body;
    const allowed = ['qr_phone', 'tablet_kiosk', 'pc_webcam'];
    if (!allowed.includes(setupType)) {
      return res.status(400).json({ error: 'Invalid setup type' });
    }

    const result = await pool.query(
      `UPDATE gyms
       SET onboarding_setup_type = $2,
           onboarding_completed_steps =
             CASE WHEN onboarding_setup_type IS DISTINCT FROM $2
                  THEN '[]'::jsonb
                  ELSE onboarding_completed_steps
             END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING onboarding_setup_type, onboarding_completed_steps`,
      [req.gymId, setupType]
    );

    res.json({
      setupType: result.rows[0].onboarding_setup_type,
      completedSteps: result.rows[0].onboarding_completed_steps,
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/onboarding/complete-step ──────────────────────────────────────
// Idempotently mark a setup step as complete (admin only).
router.patch('/complete-step', requireRole('admin'), async (req, res, next) => {
  try {
    const { stepId } = req.body;
    if (!stepId || typeof stepId !== 'string') {
      return res.status(400).json({ error: 'stepId is required' });
    }

    const result = await pool.query(
      `UPDATE gyms
       SET onboarding_completed_steps =
         CASE WHEN onboarding_completed_steps @> $2::jsonb
              THEN onboarding_completed_steps
              ELSE onboarding_completed_steps || $2::jsonb
         END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING onboarding_completed_steps`,
      [req.gymId, JSON.stringify([stepId])]
    );

    res.json({ completedSteps: result.rows[0].onboarding_completed_steps });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/onboarding/dismiss-checklist ───────────────────────────────────
// Permanently hide the setup checklist widget (admin only).
router.patch('/dismiss-checklist', requireRole('admin'), async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE gyms SET onboarding_checklist_dismissed = true, updated_at = NOW() WHERE id = $1`,
      [req.gymId]
    );
    res.json({ dismissed: true });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/onboarding/mark-tour-seen ─────────────────────────────────────
// Record that the current user has seen a page tour (admin + staff).
router.patch('/mark-tour-seen', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { tourId } = req.body;
    if (!tourId || typeof tourId !== 'string') {
      return res.status(400).json({ error: 'tourId is required' });
    }

    const result = await pool.query(
      `UPDATE users
       SET onboarding_tours_seen = onboarding_tours_seen || $2::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING onboarding_tours_seen`,
      [req.user.userId, JSON.stringify({ [tourId]: true })]
    );

    res.json({ toursSeen: result.rows[0].onboarding_tours_seen });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/onboarding/reset ───────────────────────────────────────────────
// Reset the setup wizard so admin can redo hardware selection (admin only).
router.patch('/reset', requireRole('admin'), async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE gyms
       SET onboarding_setup_type = NULL,
           onboarding_completed_steps = '[]',
           onboarding_checklist_dismissed = false,
           updated_at = NOW()
       WHERE id = $1`,
      [req.gymId]
    );
    res.json({ reset: true });
  } catch (err) {
    next(err);
  }
});

export default router;
