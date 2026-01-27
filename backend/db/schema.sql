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
