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

    // 4. Packages — deduplicate first (no unique constraint on gym_id+name),
    //    then select-or-insert to stay idempotent across restarts.
    //    Must re-point members to the surviving package before deleting extras.
    const keepPkgs = await client.query(
      `SELECT DISTINCT ON (name) id, name
       FROM membership_packages WHERE gym_id = $1 ORDER BY name, created_at ASC`,
      [gymId],
    );
    for (const row of keepPkgs.rows) {
      // Point any member referencing a duplicate to the surviving id
      await client.query(
        `UPDATE members SET package_id = $1
         WHERE gym_id = $2 AND package_id IN (
           SELECT id FROM membership_packages
           WHERE gym_id = $2 AND name = $3 AND id <> $1
         )`,
        [row.id, gymId, row.name],
      );
    }
    await client.query(
      `DELETE FROM membership_packages
       WHERE gym_id = $1
         AND id NOT IN (
           SELECT DISTINCT ON (name) id
           FROM membership_packages
           WHERE gym_id = $1
           ORDER BY name, created_at ASC
         )`,
      [gymId],
    );

    const packages = [
      { name: 'Bulanan',   days: 30,  price: 150000 },
      { name: 'Tri Bulan', days: 90,  price: 400000 },
      { name: 'Tahunan',   days: 365, price: 1200000 },
    ];
    const pkgIds = {};
    for (const pkg of packages) {
      const existing = await client.query(
        'SELECT id FROM membership_packages WHERE gym_id=$1 AND name=$2 LIMIT 1',
        [gymId, pkg.name],
      );
      if (existing.rows.length > 0) {
        pkgIds[pkg.name] = existing.rows[0].id;
      } else {
        const r = await client.query(
          'INSERT INTO membership_packages (gym_id, name, duration_days, price) VALUES ($1,$2,$3,$4) RETURNING id',
          [gymId, pkg.name, pkg.days, pkg.price],
        );
        pkgIds[pkg.name] = r.rows[0].id;
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

    // Seed demo member (DEMO-M): veteran rank, 32 visits, 2 claimable spins,
    //   active XP boost, and 60 days of attendance history.
    if (demoMember) {
      await client.query(
        `INSERT INTO member_gamification
           (gym_id, member_id, total_xp, rank, total_visits, pending_spins, last_visit_date)
         VALUES ($1, $2, 3200, 'veteran', 32, 2, NOW())`,
        [gymId, demoMember.id],
      );

      // 2 pending gacha spins for visit milestones 10 and 30
      for (const milestone of [10, 30]) {
        const spinRes = await client.query(
          `INSERT INTO member_gacha_spins
             (gym_id, member_id, streak_type, milestone_value, status)
           VALUES ($1, $2, 'visits', $3, 'pending')
           RETURNING id`,
          [gymId, demoMember.id, milestone],
        );
        await client.query(
          `INSERT INTO member_streak_milestones
             (gym_id, member_id, streak_type, milestone_value, spin_id)
           VALUES ($1, $2, 'visits', $3, $4)
           ON CONFLICT (gym_id, member_id, streak_type, milestone_value) DO NOTHING`,
          [gymId, demoMember.id, milestone, spinRes.rows[0].id],
        );
      }

      // Active XP boost (rare, 1.25×, expires in 5 days) from a completed spin
      const completedSpin = await client.query(
        `INSERT INTO member_gacha_spins
           (gym_id, member_id, streak_type, milestone_value, status, spun_at,
            rarity, reward_type, reward_detail)
         VALUES ($1, $2, 'visits', 20, 'completed', NOW() - INTERVAL '2 days',
                 'rare', 'xp_boost', '{"multiplier":1.25,"durationDays":7}')
         RETURNING id`,
        [gymId, demoMember.id],
      );
      await client.query(
        `INSERT INTO member_xp_boosts
           (gym_id, member_id, source_spin, rarity, multiplier, expires_at)
         VALUES ($1, $2, $3, 'rare', 1.25, NOW() + INTERVAL '5 days')`,
        [gymId, demoMember.id, completedSpin.rows[0].id],
      );

      // 60 days of attendance history — 3–4x/week, varied hours
      const checkinHours = [7, 8, 9, 12, 17, 18, 19, 20];
      for (let daysAgo = 60; daysAgo >= 1; daysAgo--) {
        const d = new Date(now);
        d.setDate(d.getDate() - daysAgo);
        const dow = d.getDay();
        // ~3-4x per week: skip ~30% of days randomly, always skip Sunday
        if (dow === 0) continue;
        if (Math.random() < 0.30) continue;
        const hour = checkinHours[Math.floor(Math.random() * checkinHours.length)];
        d.setHours(hour, randomBetween(0, 59), 0, 0);
        const out = new Date(d);
        out.setMinutes(out.getMinutes() + randomBetween(45, 90));
        await client.query(
          `INSERT INTO attendance_logs (gym_id, member_id, checked_in_at, checked_out_at)
           VALUES ($1, $2, $3, $4)`,
          [gymId, demoMember.id, d.toISOString(), out.toISOString()],
        );
      }
    }

    // Seed transactions — 6 months of history for Business Dashboard metrics
    const pkgRes = await client.query(
      `SELECT id, name, price FROM membership_packages WHERE gym_id = $1`,
      [gymId],
    );
    const pkgs = {};
    for (const p of pkgRes.rows) pkgs[p.name] = { id: p.id, price: parseInt(p.price, 10) };
    const txPkgNames = ['Bulanan', 'Tri Bulan'];

    for (let mo = 5; mo >= 0; mo--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - mo, 1);
      const mLastDay = new Date(now.getFullYear(), now.getMonth() - mo + 1, 0).getDate();

      // new_member: 2–3 per month
      for (let i = 0; i < randomBetween(2, 3); i++) {
        const d = new Date(mStart.getFullYear(), mStart.getMonth(), randomBetween(1, mLastDay), randomBetween(8, 20));
        if (d > now) continue;
        const pkgName = txPkgNames[randomBetween(0, 1)];
        const m = regulars[randomBetween(0, regulars.length - 1)];
        await client.query(
          `INSERT INTO transactions (gym_id, member_id, type, amount, package_id, created_at)
           VALUES ($1,$2,'new_member',$3,$4,$5)`,
          [gymId, m.id, pkgs[pkgName].price, pkgs[pkgName].id, d.toISOString()],
        );
      }

      // renewal: 3–5 per month
      for (let i = 0; i < randomBetween(3, 5); i++) {
        const d = new Date(mStart.getFullYear(), mStart.getMonth(), randomBetween(1, mLastDay), randomBetween(8, 20));
        if (d > now) continue;
        const pkgName = txPkgNames[randomBetween(0, 1)];
        const m = regulars[randomBetween(0, regulars.length - 1)];
        await client.query(
          `INSERT INTO transactions (gym_id, member_id, type, amount, package_id, created_at)
           VALUES ($1,$2,'renewal',$3,$4,$5)`,
          [gymId, m.id, pkgs[pkgName].price, pkgs[pkgName].id, d.toISOString()],
        );
      }

      // walk_in: 5–8 per month at Rp 30,000 each
      for (let i = 0; i < randomBetween(5, 8); i++) {
        const d = new Date(mStart.getFullYear(), mStart.getMonth(), randomBetween(1, mLastDay), randomBetween(8, 20));
        if (d > now) continue;
        await client.query(
          `INSERT INTO transactions (gym_id, member_id, type, amount, created_at)
           VALUES ($1,NULL,'walk_in',30000,$2)`,
          [gymId, d.toISOString()],
        );
      }
    }

    // Ensure "Today" filter is never empty — seed 1 renewal + 2 walk-ins for today
    const todayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    await client.query(
      `INSERT INTO transactions (gym_id, member_id, type, amount, package_id, created_at)
       VALUES ($1,$2,'renewal',$3,$4,$5)`,
      [gymId, regulars[0].id, pkgs['Bulanan'].price, pkgs['Bulanan'].id, todayBase.toISOString()],
    );
    for (let i = 0; i < 2; i++) {
      const wt = new Date(todayBase);
      wt.setHours(11 + i * 3);
      await client.query(
        `INSERT INTO transactions (gym_id, member_id, type, amount, created_at)
         VALUES ($1,NULL,'walk_in',30000,$2)`,
        [gymId, wt.toISOString()],
      );
    }

    // Stamp reset time + reset onboarding so each demo starts at the wizard
    await client.query(
      `UPDATE gyms
       SET demo_reset_at = NOW(),
           onboarding_setup_type = NULL,
           onboarding_completed_steps = '[]',
           onboarding_checklist_dismissed = false
       WHERE id = $1`,
      [gymId],
    );

    // Reset tour state for all users in the demo gym
    await client.query(
      `UPDATE users SET onboarding_tours_seen = '{}' WHERE gym_id = $1`,
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
