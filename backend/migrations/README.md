Migration: Feedback status -> 'new'

Files:
- 20260128_feedback_status_new.sql — updates the `feedback.status` column default to 'new' and migrates existing rows.

How to run:

Using psql (Postgres):

1. Make a DB backup first (strongly recommended).

```bash
psql "postgres://USER:PASS@HOST:PORT/DBNAME" -f backend/migrations/20260128_feedback_status_new.sql
```

2. Alternatively, connect and run the SQL interactively:

```bash
psql "postgres://USER:PASS@HOST:PORT/DBNAME"
# then inside psql:
\i backend/migrations/20260128_feedback_status_new.sql
```

Notes:
- The migration is idempotent for the ALTER DEFAULT, and the UPDATE statements are safe to re-run.
- Review rows after running: `SELECT status, COUNT(*) FROM feedback GROUP BY status;` to verify.
