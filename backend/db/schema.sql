-- Schema for Table-Manager (Postgres / SQLite compatible SQL)
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events (top-level saved configurations / "rooms set")
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Optional: multiple rooms per event (if app models rooms separately)
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT,
  width INTEGER,
  height INTEGER,
  meta JSON,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Tables (seat groups, placements) — stored as JSON for flexibility
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  data JSON,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Groups (logical groupings of tables)
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  name TEXT,
  data JSON,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Assigned groups (person -> group) stored in JSON or normalized depending on needs
CREATE TABLE IF NOT EXISTS assigned_groups (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  person_id TEXT,
  group_id TEXT,
  meta JSON,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Simple indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_event_id ON rooms(event_id);

-- Ensure admin-related columns exist for existing installations
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_granted_by TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_granted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

CREATE TABLE IF NOT EXISTS admin_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit(action);

-- Feedback table: collects system-wide feedback submitted by users or anonymously.
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  email text NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
