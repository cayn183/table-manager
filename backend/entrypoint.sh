#!/bin/sh
set -e

DATA_DIR=${DATA_DIR:-/app/data}
LOGFILE=${LOG_FILE:-$DATA_DIR/backend.log}

log() { echo "[entrypoint] $1"; }

# Ensure persistent data dir and log
if [ ! -d "$DATA_DIR" ]; then
  log "Creating data directory $DATA_DIR"
  mkdir -p "$DATA_DIR"
fi
if [ ! -f "$LOGFILE" ]; then
  log "Creating backend log file $LOGFILE"
  touch "$LOGFILE"
fi
export LOG_FILE="$LOGFILE"

run_migrations() {
  # find migrate script in common locations
  for p in /app/backend/dist/migrate.js /app/dist/migrate.js /app/dist/src/migrate.js ./dist/migrate.js; do
    if [ -f "$p" ]; then
      log "Running migrations using $p"
      node "$p" >> "$LOGFILE" 2>&1 || { log "Migration command failed (see $LOGFILE)"; return 1; }
      log "Migrations applied"
      return 0
    fi
  done
  log "No migrate script found; skipping migrations"
  return 0
}

start_backend() {
  # run migrations if requested
  if [ "${MIGRATE_ON_START:-false}" = "true" ]; then
    run_migrations || log "Migrations failed, continuing to start backend"
  fi

  # prefer backend dist
  if [ -f /app/backend/dist/index.js ]; then
    log "Starting backend from /app/backend/dist/index.js"
    exec node /app/backend/dist/index.js >> "$LOGFILE" 2>&1
  elif [ -f /app/dist/index.js ]; then
    log "Starting backend from /app/dist/index.js"
    exec node /app/dist/index.js >> "$LOGFILE" 2>&1
  else
    log "No backend start file found; attempting npm start"
    exec npm run start >> "$LOGFILE" 2>&1
  fi
}

start_frontend() {
  log "Starting frontend (vite preview)"
  if [ -x /app/node_modules/.bin/vite ]; then
    exec /app/node_modules/.bin/vite preview --host 0.0.0.0 --port 5173 >> "$LOGFILE" 2>&1
  elif command -v vite >/dev/null 2>&1; then
    exec vite preview --host 0.0.0.0 --port 5173 >> "$LOGFILE" 2>&1
  else
    log "vite not found; cannot start frontend"
    exit 1
  fi
}

case "${SERVICE:-}" in
  backend)
    start_backend
    ;;
  frontend)
    start_frontend
    ;;
  "")
    # default to backend for backwards compatibility
    log "SERVICE not set; defaulting to backend"
    start_backend
    ;;
  *)
    log "Unknown SERVICE='${SERVICE}'"
    exit 1
    ;;
esac

