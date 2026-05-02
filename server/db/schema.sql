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
