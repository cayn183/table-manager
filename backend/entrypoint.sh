#!/bin/sh
set -e

log() { echo "[entrypoint] $1"; }

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
