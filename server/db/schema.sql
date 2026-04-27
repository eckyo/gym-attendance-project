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
