-- Migration: Set default feedback status to 'new' and migrate existing rows
-- Created: 2026-01-28
-- Purpose: Align database with application change where new feedback entries are 'new' (unviewed).

BEGIN;

-- 1) Update schema default (idempotent)
ALTER TABLE IF EXISTS feedback ALTER COLUMN status SET DEFAULT 'new';

-- 2) Migrate existing rows:
--    - Rows with NULL status -> set to 'new'
--    - Rows with status='open' and resolved_at IS NULL -> keep 'open'
--    - Rows with status='resolved' -> keep 'resolved'
--    - Rows with any other legacy values -> map to 'open'

UPDATE feedback
SET status = 'new'
WHERE status IS NULL;

UPDATE feedback
SET status = 'open'
WHERE status NOT IN ('new', 'open', 'resolved') OR status = '';

-- Optional: if you want to treat very recent submissions as 'new' even if they were 'open', you can adjust here.

COMMIT;
