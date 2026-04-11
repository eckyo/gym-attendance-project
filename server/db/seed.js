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

    // Seed members with short GYM IDs — only insert if not already present
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const expiryDate = oneYearFromNow.toISOString().slice(0, 10);

    await client.query(`
      INSERT INTO members (gym_id, name, scan_token, expiry_date)
      VALUES ($1, 'Alice Johnson', 'A0001', $2)
      ON CONFLICT (gym_id, scan_token) DO NOTHING
    `, [gymId, expiryDate]);

    await client.query(`
      INSERT INTO members (gym_id, name, scan_token, expiry_date)
      VALUES ($1, 'Bob Smith', 'A0002', $2)
      ON CONFLICT (gym_id, scan_token) DO NOTHING
    `, [gymId, expiryDate]);

    // Ensure counter is at least 2 (don't lower it if already higher)
    await client.query(
      `UPDATE gyms SET member_id_counter = GREATEST(member_id_counter, 2) WHERE id = $1`,
      [gymId]
    );

    await client.query('COMMIT');

    console.log('Seed complete.\n');
    console.log('Login credentials:');
    console.log('  admin@gym1.test  / password123  (role: admin)');
    console.log('  staff@gym1.test  / password123  (role: staff)\n');
    console.log('Member GYM IDs (encode these as QR codes):');
    console.log('  Alice Johnson  →  A0001');
    console.log('  Bob Smith      →  A0002');
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
