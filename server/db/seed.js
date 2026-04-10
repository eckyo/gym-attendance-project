import bcrypt from 'bcryptjs';
import pool from './pool.js';

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find existing gym or insert (prevents duplicates on repeated seed runs)
    const existing = await client.query(`SELECT id FROM gyms WHERE name = 'Demo Gym' LIMIT 1`);
    let gymId;
    if (existing.rows.length > 0) {
      gymId = existing.rows[0].id;
    } else {
      const inserted = await client.query(`INSERT INTO gyms (name) VALUES ('Demo Gym') RETURNING id`);
      gymId = inserted.rows[0].id;
    }

    const passwordHash = await bcrypt.hash('password123', 10);

    // Set default admin PIN "0000" if not already set
    const pinHash = await bcrypt.hash('0000', 10);
    await client.query(
      `UPDATE gyms SET admin_pin_hash = $1 WHERE id = $2 AND admin_pin_hash IS NULL`,
      [pinHash, gymId]
    );

    // Insert admin user
    await client.query(`
      INSERT INTO users (gym_id, email, password_hash, role)
      VALUES ($1, 'admin@gym1.test', $2, 'admin')
      ON CONFLICT (gym_id, email) DO NOTHING
    `, [gymId, passwordHash]);

    // Insert staff user
    await client.query(`
      INSERT INTO users (gym_id, email, password_hash, role)
      VALUES ($1, 'staff@gym1.test', $2, 'staff')
      ON CONFLICT (gym_id, email) DO NOTHING
    `, [gymId, passwordHash]);

    // Insert members with known scan tokens for QR generation
    const member1Token = '11111111-1111-1111-1111-111111111111';
    const member2Token = '22222222-2222-2222-2222-222222222222';

    await client.query(`
      INSERT INTO members (gym_id, name, scan_token)
      VALUES ($1, 'Alice Johnson', $2)
      ON CONFLICT (gym_id, scan_token) DO NOTHING
    `, [gymId, member1Token]);

    await client.query(`
      INSERT INTO members (gym_id, name, scan_token)
      VALUES ($1, 'Bob Smith', $2)
      ON CONFLICT (gym_id, scan_token) DO NOTHING
    `, [gymId, member2Token]);

    await client.query('COMMIT');

    console.log('Seed complete.\n');
    console.log('Login credentials:');
    console.log('  admin@gym1.test  / password123  (role: admin)');
    console.log('  staff@gym1.test  / password123  (role: staff)\n');
    console.log('Member scan tokens (encode these as QR codes):');
    console.log(`  Alice Johnson  →  ${member1Token}`);
    console.log(`  Bob Smith      →  ${member2Token}`);
    console.log('\nGenerate QR codes at: https://www.qr-code-generator.com');
    console.log('\nAdmin dashboard PIN: 0000');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
