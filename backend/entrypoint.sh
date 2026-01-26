#!/bin/sh
set -e

log() { echo "[entrypoint] $1"; }

# Ensure persistent data dir exists and backend log file is present for Unraid/host visibility
DATA_DIR=${DATA_DIR:-/app/data}
if [ ! -d "$DATA_DIR" ]; then
  log "Creating data directory $DATA_DIR"
  mkdir -p "$DATA_DIR"
fi
LOGFILE="$DATA_DIR/backend.log"
if [ ! -f "$LOGFILE" ]; then
  log "Creating backend log file $LOGFILE"
  touch "$LOGFILE"
fi
# Export LOG_FILE so logger picks it up if it checks env
export LOG_FILE="$LOGFILE"

# Determine possible dist paths to support different image layouts (/app/dist or /app/backend/dist)
find_migrate() {
  CANDIDATES="/app/dist/migrate.js /app/dist/src/migrate.js /app/backend/dist/migrate.js ./dist/migrate.js ./dist/src/migrate.js"
  for p in $CANDIDATES; do
    if [ -f "$p" ]; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

find_index() {
  CANDIDATES="/app/dist/index.js /app/backend/dist/index.js ./dist/index.js"
  for p in $CANDIDATES; do
    if [ -f "$p" ]; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

MIGRATE_CMD=$(find_migrate || true)
INDEX_CMD=$(find_index || true)

if [ -z "${MIGRATE_ON_START}" ] || [ "${MIGRATE_ON_START}" = "true" ]; then
  if [ -n "$MIGRATE_CMD" ]; then
    log "Running migrations using $MIGRATE_CMD"
    # run migrations and surface output
    node "$MIGRATE_CMD" || { log "Migration command failed"; exit 1; }
    log "Migrations applied"
  else
    log "No migrate script found (looked for dist/migrate.js). Skipping migrations."
  fi
else
  log "MIGRATE_ON_START disabled; skipping migrations"
fi

if [ -n "$INDEX_CMD" ]; then
  log "Starting backend using $INDEX_CMD"
  exec node "$INDEX_CMD"
else
  log "Start binary not found (dist/index.js). Trying npm start"
  exec npm run start
fi
