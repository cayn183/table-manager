#!/bin/sh
set -e

log() { echo "[entrypoint] $1"; }

# ---- Generate runtime config from environment variables ----
# Vite embeds VITE_* vars at build time, so they can't be changed at runtime.
# This script injects a runtime-config.js into the built dist/ folder that the
# browser loads before the app, making VITE_API_URL configurable per container.

RUNTIME_FILE="/app/dist/runtime-config.js"

cat > "$RUNTIME_FILE" <<EOF
window.__RUNTIME_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-}",
};
EOF

log "Runtime config written to $RUNTIME_FILE"
log "  VITE_API_URL=${VITE_API_URL:-<not set — browser will use hostname:4000 fallback>}"
log "  VITE_LOG_LEVEL=${VITE_LOG_LEVEL:-info}"
log "  VITE_PREVIEW_ALLOWED_HOSTS=${VITE_PREVIEW_ALLOWED_HOSTS:-<not set>}"

# ---- Start the preview server (CMD from Dockerfile) ----
exec "$@"
