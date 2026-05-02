import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// GET /api/public/gym/:code — resolve gym identity from gym_code (no auth required)
router.get('/gym/:code', async (req, res, next) => {
  try {
    const code = req.params.code.toLowerCase();
    const result = await pool.query(
      'SELECT id, name FROM gyms WHERE gym_code = $1 AND is_active = true',
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gym not found' });
    }
    const gym = result.rows[0];
    res.json({ gymId: gym.id, gymName: gym.name });
  } catch (err) {
    next(err);
  }
});

export default router;
