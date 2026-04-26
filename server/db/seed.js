import bcrypt from 'bcryptjs';
import pool from './pool.js';

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('password123', 10);
    const pinHash = await bcrypt.hash('0000', 10);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const expiryDate = oneYearFromNow.toISOString().slice(0, 10);

    // ── Superadmin ────────────────────────────────────────────────────────────
    const existingSuperadmin = await client.query(
      `SELECT id FROM users WHERE email = 'superadmin@gym.test' AND role = 'superadmin' LIMIT 1`
    );
    if (existingSuperadmin.rows.length === 0) {
      const superadminHash = await bcrypt.hash('superadmin123', 10);
      await client.query(`
        INSERT INTO users (gym_id, email, password_hash, role)
        VALUES (NULL, 'superadmin@gym.test', $1, 'superadmin')
      `, [superadminHash]);
    }

    // ── Helper: upsert a gym + its admin user ─────────────────────────────────
    const upsertGym = async (gymName, adminEmail, isActive = true) => {
      const existing = await client.query(
        `SELECT id FROM gyms WHERE name = $1 LIMIT 1`, [gymName]
      );
      let gymId;
      if (existing.rows.length > 0) {
        gymId = existing.rows[0].id;
      } else {
        const inserted = await client.query(
          `INSERT INTO gyms (name, is_active) VALUES ($1, $2) RETURNING id`,
          [gymName, isActive]
        );
        gymId = inserted.rows[0].id;
      }
      await client.query(
        `UPDATE gyms SET admin_pin_hash = $1 WHERE id = $2 AND admin_pin_hash IS NULL`,
        [pinHash, gymId]
      );
      await client.query(`
        INSERT INTO users (gym_id, email, password_hash, role)
        VALUES ($1, $2, $3, 'admin')
        ON CONFLICT (gym_id, email) DO NOTHING
      `, [gymId, adminEmail, passwordHash]);
      await client.query(`
        INSERT INTO membership_packages (gym_id, name, duration_days, price, is_default)
        VALUES ($1, '1 Month', 30, 150000, true)
        ON CONFLICT DO NOTHING
      `, [gymId]);
      return gymId;
    };

    // ── Gym 1: Demo Gym (original) ────────────────────────────────────────────
    const demoGymId = await upsertGym('Demo Gym', 'admin@gym1.test');

    await client.query(`
      INSERT INTO users (gym_id, email, password_hash, role)
      VALUES ($1, 'staff@gym1.test', $2, 'staff')
      ON CONFLICT (gym_id, email) DO NOTHING
    `, [demoGymId, passwordHash]);

    await client.query(`
      INSERT INTO members (gym_id, name, scan_token, expiry_date, password_hash)
      VALUES ($1, 'Alice Johnson', 'A0001', $2, $3)
      ON CONFLICT (gym_id, scan_token) DO NOTHING
    `, [demoGymId, expiryDate, passwordHash]);

    await client.query(`
      INSERT INTO members (gym_id, name, scan_token, expiry_date, password_hash)
      VALUES ($1, 'Bob Smith', 'A0002', $2, $3)
      ON CONFLICT (gym_id, scan_token) DO NOTHING
    `, [demoGymId, expiryDate, passwordHash]);

    await client.query(
      `UPDATE gyms SET member_id_counter = GREATEST(member_id_counter, 2) WHERE id = $1`,
      [demoGymId]
    );

    // ── Gym 2: FitZone Bandung ────────────────────────────────────────────────
    await upsertGym('FitZone Bandung', 'admin@fitzone.test', true);

    // ── Gym 3: Iron Temple Jakarta ────────────────────────────────────────────
    await upsertGym('Iron Temple Jakarta', 'admin@irontemple.test', true);

    // ── Gym 4: Power House Surabaya (disabled) ────────────────────────────────
    await upsertGym('Power House Surabaya', 'admin@powerhouse.test', false);

    await client.query('COMMIT');

    console.log('Seed complete.\n');
    console.log('Superadmin:');
    console.log('  superadmin@gym.test  / superadmin123  (role: superadmin)\n');
    console.log('Gym login credentials (all password: password123):');
    console.log('  admin@gym1.test       → Demo Gym (active)');
    console.log('  admin@fitzone.test    → FitZone Bandung (active)');
    console.log('  admin@irontemple.test → Iron Temple Jakarta (active)');
    console.log('  admin@powerhouse.test → Power House Surabaya (disabled)\n');
    console.log('Demo Gym member GYM IDs:');
    console.log('  Alice Johnson  →  A0001');
    console.log('  Bob Smith      →  A0002');
    console.log('\nAdmin dashboard PIN (all gyms): 0000');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
