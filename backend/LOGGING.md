Logging strategy
----------------

This file documents the lightweight logging approach used in this repository and recommended next steps for production.

1) Basics
- Backend: `backend/src/logger.ts` — structured, timestamped logs with level filtering via `LOG_LEVEL` (default `info`).
- Frontend: `src/utils/logger.ts` — browser logger with `VITE_LOG_LEVEL` (default `debug` for dev builds).
- Helper scripts (CommonJS): `backend/cli-logger.js` — for `node` scripts that run outside TS build.

2) Request tracing
- `backend/src/middleware/requestId.ts` generates or accepts `X-Request-Id` and exposes `req.log(level, tag, payload)` so route handlers can log with the same request id.
- Frontend `src/api/apiClient.ts` now sends `X-Request-Id` per request to correlate client/server traces.

3) Environment controls
- Set `LOG_LEVEL` in the environment to control backend verbosity (e.g. `debug`, `info`, `warn`, `error`).
- Set `VITE_LOG_LEVEL` at build time for frontend logs.

4) Production recommendations
- Send errors to an errors sink (Sentry) and structured logs to a log aggregator (ELK/Logstash, Datadog, or hosted service).
- Use JSON output for aggregators (replace `console` sinks with a JSON transport). Consider `pino` or `winston` for advanced needs.
- Rotate and retain logs according to legal/regulatory requirements.

5) Next steps we can implement for you
- Add a `req.log` TypeScript definition helper (`declare global`) to avoid casts.
- Wire a small file sink (rolling) for non-container setups.
- Add Sentry error reporting and attach `requestId` to error events.
