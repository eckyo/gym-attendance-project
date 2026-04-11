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

-- Member expiry date
ALTER TABLE members ADD COLUMN IF NOT EXISTS expiry_date DATE;

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
