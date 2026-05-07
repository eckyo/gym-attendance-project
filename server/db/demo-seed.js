import bcrypt from 'bcryptjs';
import pool from './pool.js';

const DEMO_GYM_CODE  = 'demo';
const DEMO_PIN       = '0000';
const ADMIN_EMAIL    = 'demo@kiosgym.demo';
const STAFF_EMAIL    = 'demo-staff@kiosgym.demo';
const DEMO_PASSWORD  = 'demo1234';
const DEMO_MEMBER_TOKEN = 'DEMO-M';

const MEMBER_NAMES = [
  'Andi Pratama', 'Budi Santoso', 'Citra Dewi', 'Dian Kusuma',
  'Eko Wijaya', 'Fani Rahayu', 'Gilang Permana', 'Hana Putri',
  'Irfan Hakim', 'Julia Sari', 'Kiki Utami', 'Lutfi Hidayat',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function randomBetween(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// ── ensureDemoGym ─────────────────────────────────────────────────────────────
// Creates the demo gym and its static rows (users, packages, members) if they
// don't yet exist.  Safe to call on every server startup.

export async function ensureDemoGym() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Gym
    const gymRes = await client.query(
      `INSERT INTO gyms (name, gym_code, is_demo, admin_pin_hash)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (gym_code) DO UPDATE SET is_demo = true
       RETURNING id, demo_reset_at`,
      ['KiosGym Demo', DEMO_GYM_CODE, await bcrypt.hash(DEMO_PIN, 10)],
    );
    const gymId       = gymRes.rows[0].id;
    const lastResetAt = gymRes.rows[0].demo_reset_at;

    // 2. Admin user
    const adminHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await client.query(
      `INSERT INTO users (gym_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (gym_id, email) DO NOTHING`,
      [gymId, ADMIN_EMAIL, adminHash],
    );

    // 3. Staff user
    const staffHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await client.query(
      `INSERT INTO users (gym_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'staff')
       ON CONFLICT (gym_id, email) DO NOTHING`,
      [gymId, STAFF_EMAIL, staffHash],
    );

    // 4. Packages (idempotent by name+gym_id)
    const packages = [
      { name: 'Bulanan',   days: 30,  price: 150000 },
      { name: 'Tri Bulan', days: 90,  price: 400000 },
      { name: 'Tahunan',   days: 365, price: 1200000 },
    ];
    const pkgIds = {};
    for (const pkg of packages) {
      const r = await client.query(
        `INSERT INTO membership_packages (gym_id, name, duration_days, price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [gymId, pkg.name, pkg.days, pkg.price],
      );
      if (r.rows.length > 0) {
        pkgIds[pkg.name] = r.rows[0].id;
      } else {
        const existing = await client.query(
          'SELECT id FROM membership_packages WHERE gym_id=$1 AND name=$2',
          [gymId, pkg.name],
        );
        pkgIds[pkg.name] = existing.rows[0].id;
      }
    }

    // 5. Members (stable UUIDs via ON CONFLICT scan_token)
    const memberPwHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    for (let i = 0; i < MEMBER_NAMES.length; i++) {
      const token = `DEMO${String(i + 1).padStart(2, '0')}`;
      const pkgName = i < 6 ? 'Bulanan' : i < 10 ? 'Tri Bulan' : 'Tahunan';
      await client.query(
        `INSERT INTO members (gym_id, name, scan_token, password_hash, package_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (gym_id, scan_token) DO UPDATE
           SET name = EXCLUDED.name, package_id = EXCLUDED.package_id`,
        [gymId, MEMBER_NAMES[i], token, memberPwHash, pkgIds[pkgName]],
      );
    }

    // 6. Demo member (for member-role demo sessions)
    await client.query(
      `INSERT INTO members (gym_id, name, scan_token, password_hash, package_id)
       VALUES ($1, 'Demo Pengguna', $2, $3, $4)
       ON CONFLICT (gym_id, scan_token) DO UPDATE
         SET name = 'Demo Pengguna', package_id = EXCLUDED.package_id`,
      [gymId, DEMO_MEMBER_TOKEN, memberPwHash, pkgIds['Bulanan']],
    );

    await client.query('COMMIT');

    // 7. Seed attendance + gamification if never reset
    if (!lastResetAt) {
      await resetDemoData(gymId);
    }

    console.log(`[demo] Demo gym ready (id=${gymId})`);
    return gymId;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[demo] ensureDemoGym failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ── resetDemoData ─────────────────────────────────────────────────────────────
// Wipes all transactional data for the demo gym and re-seeds fresh state.

export async function resetDemoData(gymId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Wipe transactional tables
    for (const tbl of [
      'member_shield_log', 'member_streak_milestones', 'member_xp_boosts',
      'member_gacha_spins', 'member_xp_log', 'member_gamification',
      'attendance_logs', 'transactions',
    ]) {
      await client.query(`DELETE FROM ${tbl} WHERE gym_id = $1`, [gymId]);
    }

    // Reset member expiry dates
    const membersRes = await client.query(
      `SELECT id, scan_token FROM members WHERE gym_id = $1 AND deleted_at IS NULL ORDER BY scan_token`,
      [gymId],
    );
    const members = membersRes.rows;

    // Expiry pattern: 8 active, 2 expiring soon, 2 expired (skip DEMO-M)
    const regulars = members.filter(m => m.scan_token !== DEMO_MEMBER_TOKEN);
    const demoMember = members.find(m => m.scan_token === DEMO_MEMBER_TOKEN);

    const expiryOffsets = [45, 60, 75, 30, 90, 35, 50, 70, 5, 4, -7, -10];
    for (let i = 0; i < regulars.length && i < expiryOffsets.length; i++) {
      await client.query(
        'UPDATE members SET expiry_date = $1 WHERE id = $2',
        [daysFromNow(expiryOffsets[i]), regulars[i].id],
      );
    }
    if (demoMember) {
      await client.query(
        'UPDATE members SET expiry_date = $1 WHERE id = $2',
        [daysFromNow(60), demoMember.id],
      );
    }

    // Seed attendance logs — past 30 days, Mon–Sat weighted
    const now = new Date();
    for (let daysAgo = 30; daysAgo >= 1; daysAgo--) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      const dow = date.getDay(); // 0=Sun, 6=Sat
      if (dow === 0) continue;  // skip Sundays

      // 4–7 check-ins per day
      const count = dow === 6 ? randomBetween(2, 4) : randomBetween(4, 7);
      const shuffled = [...regulars].sort(() => Math.random() - 0.5).slice(0, count);

      for (const member of shuffled) {
        const hour = randomBetween(6, 20);
        const min  = randomBetween(0, 59);
        const checkinAt = new Date(date);
        checkinAt.setHours(hour, min, 0, 0);
        const checkoutAt = new Date(checkinAt);
        checkoutAt.setMinutes(checkoutAt.getMinutes() + randomBetween(30, 90));

        await client.query(
          `INSERT INTO attendance_logs (gym_id, member_id, checked_in_at, checked_out_at)
           VALUES ($1, $2, $3, $4)`,
          [gymId, member.id, checkinAt.toISOString(), checkoutAt.toISOString()],
        );
      }
    }

    // Seed gamification for regular members (varied ranks)
    const rankProfiles = [
      { xp: 2400, rank: 'veteran',  visits: 55 },
      { xp: 1800, rank: 'regular',  visits: 42 },
      { xp: 1200, rank: 'regular',  visits: 30 },
      { xp:  800, rank: 'regular',  visits: 22 },
      { xp:  500, rank: 'regular',  visits: 15 },
      { xp:  300, rank: 'rookie',   visits: 10 },
      { xp:  200, rank: 'rookie',   visits:  7 },
      { xp:  100, rank: 'rookie',   visits:  4 },
      { xp:   80, rank: 'rookie',   visits:  3 },
      { xp:   50, rank: 'rookie',   visits:  2 },
      { xp:   20, rank: 'rookie',   visits:  1 },
      { xp:    0, rank: 'rookie',   visits:  0 },
    ];
    for (let i = 0; i < regulars.length && i < rankProfiles.length; i++) {
      const p = rankProfiles[i];
      await client.query(
        `INSERT INTO member_gamification
           (gym_id, member_id, total_xp, rank, total_visits, last_visit_date)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [gymId, regulars[i].id, p.xp, p.rank, p.visits],
      );
    }

    // Seed demo member (DEMO-M): rank=regular, 45 visits, 1 pending spin
    if (demoMember) {
      await client.query(
        `INSERT INTO member_gamification
           (gym_id, member_id, total_xp, rank, total_visits, pending_spins, last_visit_date)
         VALUES ($1, $2, 1800, 'regular', 45, 1, NOW())`,
        [gymId, demoMember.id],
      );

      // Pending gacha spin (visits milestone = 10)
      const spinRes = await client.query(
        `INSERT INTO member_gacha_spins
           (gym_id, member_id, streak_type, milestone_value, status)
         VALUES ($1, $2, 'visits', 10, 'pending')
         RETURNING id`,
        [gymId, demoMember.id],
      );
      await client.query(
        `INSERT INTO member_streak_milestones
           (gym_id, member_id, streak_type, milestone_value, spin_id)
         VALUES ($1, $2, 'visits', 10, $3)
         ON CONFLICT DO NOTHING`,
        [gymId, demoMember.id, spinRes.rows[0].id],
      );

      // Seed a few attendance logs for demo member
      for (let daysAgo = 5; daysAgo >= 1; daysAgo--) {
        const d = new Date(now);
        d.setDate(d.getDate() - daysAgo);
        d.setHours(9, randomBetween(0, 59), 0, 0);
        const out = new Date(d);
        out.setMinutes(out.getMinutes() + randomBetween(45, 90));
        await client.query(
          `INSERT INTO attendance_logs (gym_id, member_id, checked_in_at, checked_out_at)
           VALUES ($1, $2, $3, $4)`,
          [gymId, demoMember.id, d.toISOString(), out.toISOString()],
        );
      }
    }

    // Stamp reset time
    await client.query(
      'UPDATE gyms SET demo_reset_at = NOW() WHERE id = $1',
      [gymId],
    );

    await client.query('COMMIT');
    console.log(`[demo] Demo data reset for gym ${gymId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
