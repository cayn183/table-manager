#!/bin/sh
set -e

# Run migrations on start unless explicitly disabled
if [ -z "${MIGRATE_ON_START}" ] || [ "${MIGRATE_ON_START}" = "true" ]; then
  echo "[entrypoint] Running migrations..."
  node /app/dist/migrate.js
fi

echo "[entrypoint] Starting backend..."
exec node /app/dist/index.js
