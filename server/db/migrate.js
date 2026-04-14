import { readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

// Ensure data/ directory exists for XLSX output
mkdirSync(join(__dirname, '../../data'), { recursive: true });

const generateGymId = (counter) => {
  const letterIndex = Math.floor((counter - 1) / 9999);
  const number = ((counter - 1) % 9999) + 1;
  return String.fromCharCode(65 + letterIndex) + String(number).padStart(4, '0');
};

const migrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Run schema DDL
    await client.query(sql);

    // Data migration: assign short GYM IDs to members that still have UUID-format scan_tokens
    const gymsResult = await client.query('SELECT id FROM gyms');
    for (const gym of gymsResult.rows) {
      const membersResult = await client.query(
        `SELECT id FROM members
         WHERE gym_id = $1 AND deleted_at IS NULL AND scan_token LIKE '%-%'
         ORDER BY created_at ASC`,
        [gym.id]
      );

      if (membersResult.rows.length === 0) continue;

      // Find current highest counter for this gym (in case some already migrated)
      const counterResult = await client.query(
        'SELECT member_id_counter FROM gyms WHERE id = $1',
        [gym.id]
      );
      let counter = counterResult.rows[0].member_id_counter;

      for (const member of membersResult.rows) {
        counter += 1;
        const gymId = generateGymId(counter);
        await client.query(
          'UPDATE members SET scan_token = $1 WHERE id = $2',
          [gymId, member.id]
        );
      }

      await client.query(
        'UPDATE gyms SET member_id_counter = $1 WHERE id = $2',
        [counter, gym.id]
      );

      console.log(`Migrated ${membersResult.rows.length} member(s) in gym ${gym.id} → up to ${generateGymId(counter)}`);
    }

    await client.query('COMMIT');
    console.log('Migration complete.');
    console.log('data/ directory ensured at project root.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
