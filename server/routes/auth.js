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
      'SELECT id, gym_id, password_hash, role FROM users WHERE email = $1',
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

    const token = jwt.sign(
      { userId: user.id, gymId: user.gym_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, role: user.role, gymId: user.gym_id });
  } catch (err) {
    next(err);
  }
});

export default router;
