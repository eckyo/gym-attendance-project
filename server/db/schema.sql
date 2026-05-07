-- Requires PostgreSQL 13+ for gen_random_uuid() built-in.
-- For older versions: CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS gyms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        UUID NOT NULL REFERENCES gyms(id),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gym_id, email)
);

CREATE TABLE IF NOT EXISTS members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     UUID NOT NULL REFERENCES gyms(id),
  name       TEXT NOT NULL,
  scan_token UUID NOT NULL DEFAULT gen_random_uuid(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gym_id, scan_token)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         UUID NOT NULL REFERENCES gyms(id),
  member_id      UUID NOT NULL REFERENCES members(id),
  checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_scan_token_gym
  ON members(gym_id, scan_token);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_member
  ON attendance_logs(member_id, gym_id);

CREATE INDEX IF NOT EXISTS idx_attendance_open
  ON attendance_logs(member_id, gym_id)
  WHERE checked_out_at IS NULL;

-- Add admin PIN support (idempotent for existing databases)
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS admin_pin_hash TEXT;

-- Sequential GYM ID counter per gym
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS member_id_counter INTEGER NOT NULL DEFAULT 0;

-- Superadmin: allow users without a gym (gym_id nullable)
ALTER TABLE users ALTER COLUMN gym_id DROP NOT NULL;

-- Superadmin role support
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'staff', 'member', 'superadmin'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Unique email index for superadmin (gym_id IS NULL) rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_superadmin_email
  ON users(email) WHERE gym_id IS NULL;

-- Kiosk active/inactive flag
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Member expiry date
ALTER TABLE members ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Member phone number (Indonesian format)
ALTER TABLE members ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Convert scan_token from UUID type to TEXT (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'scan_token' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE members ALTER COLUMN scan_token TYPE TEXT USING scan_token::text;
    ALTER TABLE members ALTER COLUMN scan_token DROP DEFAULT;
  END IF;
END $$;

-- Membership packages
CREATE TABLE IF NOT EXISTS membership_packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        UUID NOT NULL REFERENCES gyms(id),
  name          TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price         INTEGER NOT NULL DEFAULT 0,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_membership_packages_gym ON membership_packages(gym_id);

ALTER TABLE members ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES membership_packages(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Registration fee per membership package
ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS has_registration_fee BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS registration_fee INTEGER NOT NULL DEFAULT 0;

-- Visitor / walk-in support
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_visitor BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS visitor_price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS visitor_id_counter INTEGER NOT NULL DEFAULT 0;

-- Standby check-in QR code per gym (static, admin can reset via DB if needed)
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS checkin_code UUID UNIQUE DEFAULT gen_random_uuid();
UPDATE gyms SET checkin_code = gen_random_uuid() WHERE checkin_code IS NULL;

-- Member self-service password (backfilled via migrate.js)
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Registration fee grace period rule per gym
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS reg_fee_rule_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS reg_fee_grace_months INTEGER NOT NULL DEFAULT 3;

-- Gym code / login URL slug (e.g. "fitzone" → kiosgym.com/g/fitzone)
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS gym_code TEXT UNIQUE;

-- ─── Package ID Prefix ────────────────────────────────────────────────────────
-- Short code (1–3 uppercase alphanumeric) on each package, used as member ID prefix
ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS code TEXT;

-- Per-gym feature flag: when true, new/updated member IDs include the package prefix
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS use_package_prefix BOOLEAN NOT NULL DEFAULT false;

-- Stores the raw counter value used when the member's scan_token was generated,
-- enabling same-number reuse when the same person gains a second membership
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_number INTEGER;

-- ─── Transactions (revenue ledger) ───────────────────────────────────────────
-- Append-only. No updated_at by design. Amount in IDR (integer).
-- member_id nullable for walk-ins using ephemeral visitor records.

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('new_member', 'renewal', 'walk_in');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     UUID             NOT NULL REFERENCES gyms(id),
  member_id  UUID             REFERENCES members(id),
  type       transaction_type NOT NULL,
  amount     INTEGER          NOT NULL CHECK (amount >= 0),
  package_id UUID             REFERENCES membership_packages(id),
  created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_gym_created
  ON transactions(gym_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_gym_type_created
  ON transactions(gym_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_member
  ON transactions(member_id) WHERE member_id IS NOT NULL;

-- ─── Group / Family Packages ─────────────────────────────────────────────────

-- Mark a package as a group/family package
ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT false;

-- Group entity: multiple members share one expiry and one transaction
CREATE TABLE IF NOT EXISTS member_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES gyms(id),
  name        TEXT NOT NULL,
  package_id  UUID NOT NULL REFERENCES membership_packages(id),
  expiry_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_groups_gym ON member_groups(gym_id);

-- Link each member to a group (nullable — existing individual members unaffected)
ALTER TABLE members ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES member_groups(id);

-- Track group-level transactions (member_id stays NULL for group billing)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES member_groups(id);

-- ─── Gamification ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member_gamification (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                  UUID        NOT NULL REFERENCES gyms(id),
  member_id               UUID        NOT NULL REFERENCES members(id),
  total_xp                INTEGER     NOT NULL DEFAULT 0,
  rank                    TEXT        NOT NULL DEFAULT 'rookie'
                            CHECK (rank IN ('rookie','regular','veteran','elite','legend')),
  daily_streak            INTEGER     NOT NULL DEFAULT 0,
  daily_streak_best       INTEGER     NOT NULL DEFAULT 0,
  last_checkin_date       DATE,
  weekly_streak           INTEGER     NOT NULL DEFAULT 0,
  weekly_streak_best      INTEGER     NOT NULL DEFAULT 0,
  last_week_key           TEXT,
  monthly_streak          INTEGER     NOT NULL DEFAULT 0,
  monthly_streak_best     INTEGER     NOT NULL DEFAULT 0,
  last_month_key          TEXT,
  shield_count            INTEGER     NOT NULL DEFAULT 0 CHECK (shield_count BETWEEN 0 AND 3),
  last_shield_grant_month TEXT,
  pending_spins           INTEGER     NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gym_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_member_gamification_member ON member_gamification(member_id, gym_id);

CREATE TABLE IF NOT EXISTS member_xp_log (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id           UUID         NOT NULL REFERENCES gyms(id),
  member_id        UUID         NOT NULL REFERENCES members(id),
  checkin_log_id   UUID         REFERENCES attendance_logs(id),
  xp_earned        INTEGER      NOT NULL,
  base_xp          INTEGER      NOT NULL DEFAULT 100,
  multiplier_total NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  breakdown        JSONB        NOT NULL DEFAULT '{}',
  rank_at_time     TEXT         NOT NULL,
  total_xp_after   INTEGER      NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_xp_log_member ON member_xp_log(member_id, gym_id, created_at DESC);

CREATE TABLE IF NOT EXISTS member_gacha_spins (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID        NOT NULL REFERENCES gyms(id),
  member_id       UUID        NOT NULL REFERENCES members(id),
  streak_type     TEXT        NOT NULL CHECK (streak_type IN ('daily','weekly','monthly')),
  milestone_value INTEGER     NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  spun_at         TIMESTAMPTZ,
  rarity          TEXT        CHECK (rarity IN ('common','rare','epic')),
  reward_type     TEXT,
  reward_detail   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_gacha_spins_pending
  ON member_gacha_spins(member_id, gym_id, status) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS member_xp_boosts (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID         NOT NULL REFERENCES gyms(id),
  member_id   UUID         NOT NULL REFERENCES members(id),
  source_spin UUID         REFERENCES member_gacha_spins(id),
  rarity      TEXT         NOT NULL CHECK (rarity IN ('common','rare','epic')),
  multiplier  NUMERIC(3,2) NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_xp_boosts_active
  ON member_xp_boosts(member_id, gym_id, expires_at) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS member_streak_milestones (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID        NOT NULL REFERENCES gyms(id),
  member_id       UUID        NOT NULL REFERENCES members(id),
  streak_type     TEXT        NOT NULL CHECK (streak_type IN ('daily','weekly','monthly')),
  milestone_value INTEGER     NOT NULL,
  spin_id         UUID        REFERENCES member_gacha_spins(id),
  awarded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gym_id, member_id, streak_type, milestone_value)
);
CREATE INDEX IF NOT EXISTS idx_member_streak_milestones_member
  ON member_streak_milestones(member_id, gym_id, streak_type);

CREATE TABLE IF NOT EXISTS member_shield_log (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                UUID        NOT NULL REFERENCES gyms(id),
  member_id             UUID        NOT NULL REFERENCES members(id),
  event_type            TEXT        NOT NULL CHECK (event_type IN ('granted_auto','granted_admin','used','expired')),
  shield_count_after    INTEGER     NOT NULL,
  granted_by_user_id    UUID        REFERENCES users(id),
  streak_type_protected TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_shield_log_member
  ON member_shield_log(member_id, gym_id, created_at DESC);

-- ─── Visit-based milestone system ─────────────────────────────────────────────

ALTER TABLE member_gamification
  ADD COLUMN IF NOT EXISTS total_visits    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit_date DATE;

ALTER TABLE member_gacha_spins
  DROP CONSTRAINT IF EXISTS member_gacha_spins_streak_type_check,
  ADD CONSTRAINT member_gacha_spins_streak_type_check
    CHECK (streak_type IN ('daily','weekly','monthly','visits'));

ALTER TABLE member_streak_milestones
  DROP CONSTRAINT IF EXISTS member_streak_milestones_streak_type_check,
  ADD CONSTRAINT member_streak_milestones_streak_type_check
    CHECK (streak_type IN ('daily','weekly','monthly','visits'));


-- ── Gamification Platform Config (global singleton) ───────────────────────────

CREATE TABLE IF NOT EXISTS gamification_platform_config (
  id                  INTEGER      PRIMARY KEY DEFAULT 1,
  base_xp             INTEGER      NOT NULL DEFAULT 100,
  max_multiplier      NUMERIC(4,2) NOT NULL DEFAULT 3.0,
  rank_xp_thresholds  JSONB        NOT NULL DEFAULT '{"rookie":0,"regular":500,"veteran":2000,"elite":5000,"legend":12000}',
  rank_multipliers    JSONB        NOT NULL DEFAULT '{"rookie":1.0,"regular":1.1,"veteran":1.25,"elite":1.4,"legend":1.6}',
  visit_milestones    JSONB        NOT NULL DEFAULT '[10,30,60,90,120,180,240,365]',
  gacha_table         JSONB        NOT NULL DEFAULT '[{"rarity":"common","weight":60,"multiplier":1.10,"durationDays":3},{"rarity":"rare","weight":30,"multiplier":1.25,"durationDays":7},{"rarity":"epic","weight":10,"multiplier":1.50,"durationDays":3}]',
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT singleton_row CHECK (id = 1)
);
INSERT INTO gamification_platform_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Demo gym columns ──────────────────────────────────────────────────────────

ALTER TABLE gyms ADD COLUMN IF NOT EXISTS is_demo       BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS demo_reset_at TIMESTAMPTZ;
