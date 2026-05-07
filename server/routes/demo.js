import { Router } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { resetDemoData } from '../db/demo-seed.js';

const router = Router();

// Simple in-memory rate limit: max 20 requests per IP per minute
const ipHits = new Map();
function rateLimit(req, res, next) {
  const ip  = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (hit && now < hit.resetAt) {
    if (hit.count >= 20) {
      return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
    }
    hit.count++;
  } else {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
  }
  next();
}

// POST /api/demo/start
router.post('/start', rateLimit, async (req, res, next) => {
  try {
    const { role } = req.body;

    if (role !== 'admin' && role !== 'member') {
      return res.status(400).json({ error: 'role must be "admin" or "member"' });
    }

    // Find demo gym
    const gymRes = await pool.query(
      'SELECT id, name, demo_reset_at FROM gyms WHERE is_demo = true LIMIT 1',
    );
    if (gymRes.rows.length === 0) {
      return res.status(503).json({ error: 'Demo unavailable — please try again later.' });
    }
    const gym = gymRes.rows[0];

    // Lazy reset if stale (> 60 min or never reset)
    const lastReset = gym.demo_reset_at ? new Date(gym.demo_reset_at) : null;
    const staleMins = lastReset ? (Date.now() - lastReset.getTime()) / 60_000 : Infinity;
    if (staleMins > 60) {
      await resetDemoData(gym.id);
    }

    // Resolve the userId for this role
    let userId;
    if (role === 'admin') {
      const userRes = await pool.query(
        `SELECT id FROM users WHERE gym_id = $1 AND role = 'admin' LIMIT 1`,
        [gym.id],
      );
      if (userRes.rows.length === 0) {
        return res.status(503).json({ error: 'Demo unavailable — admin user missing.' });
      }
      userId = userRes.rows[0].id;
    } else {
      const memberRes = await pool.query(
        `SELECT id FROM members WHERE gym_id = $1 AND scan_token = 'DEMO-M' AND deleted_at IS NULL LIMIT 1`,
        [gym.id],
      );
      if (memberRes.rows.length === 0) {
        return res.status(503).json({ error: 'Demo unavailable — demo member missing.' });
      }
      userId = memberRes.rows[0].id;
    }

    const expiresIn = 30 * 60; // 30 minutes in seconds
    const token = jwt.sign(
      { userId, gymId: gym.id, role },
      process.env.JWT_SECRET,
      { expiresIn },
    );
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    res.json({ token, role, gymName: gym.name, expiresAt, isDemo: true });
  } catch (err) {
    next(err);
  }
});

export default router;
