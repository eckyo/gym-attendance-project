import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

const router = Router();

const DUMMY_HASH = '$2a$10$dummyhashfordummyusertomitigatetimingattacks.........';

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      `SELECT u.id, u.gym_id, u.password_hash, u.role, g.is_active, g.name AS gym_name
       FROM users u
       LEFT JOIN gyms g ON g.id = u.gym_id
       WHERE u.email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    // Always run bcrypt compare to prevent timing attacks
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role === 'member') {
      return res.status(403).json({ error: 'Members cannot access the kiosk' });
    }

    // Block login for disabled gyms (superadmin has no gym, skip check)
    if (user.role !== 'superadmin' && user.is_active === false) {
      return res.status(403).json({ error: 'This kiosk has been disabled. Please contact your service provider.' });
    }

    const token = jwt.sign(
      { userId: user.id, gymId: user.gym_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, role: user.role, gymId: user.gym_id, gymName: user.gym_name ?? null });
  } catch (err) {
    next(err);
  }
});

export default router;
