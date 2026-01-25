# Table-Manager backend (notes)

This folder contains a minimal API specification and a database schema to bootstrap a production backend for Table-Manager.

Recommended stack
- Postgres database (recommended for production)
- Node.js + Express (or Fastify) for the API
- Use bcrypt/argon2 for password hashing
- Use JWT (access + refresh) or HttpOnly cookies for sessions

Files added
- `openapi.yaml` — OpenAPI 3 spec for auth and event endpoints
- `db/schema.sql` — Example SQL schema (creates `users`, `events`, `rooms`, `tables`, `groups`, `assigned_groups`)

Migration & local-data import
- Client should POST local data (the `STORAGE_KEY` payload) to a migration endpoint during first login.
- A server migration handler should map/translate in-app IDs to persistent IDs and create `events`/`rooms` rows under the authenticated `user_id`.

Development notes
- For quick local development you can use SQLite (file-based) and the same schema, switching JSON column handling as required.
- For production use Postgres; create migrations using your preferred tool (Prisma/TypeORM/Knex).

Next steps (I can implement these for you):
1. Scaffold an Express TypeScript backend with endpoints defined in `openapi.yaml`.
2. Implement auth (register/login/me) using bcrypt and JWT; connect to Postgres.
3. Add a migration route to import localStorage data on first login.
4. Provide a small client adapter in the frontend and wire `AuthContext` to call the API.

Quickstart (local)
1. Ensure Postgres is running and `DATABASE_URL` in `backend/.env` points to your DB.
2. Install backend deps and start dev server:
```powershell
cd backend
npm install
npm run dev
```
3. From project root start frontend (Vite):
```powershell
cd ..
$env:VITE_API_URL = 'http://localhost:4000'
npm install
npm run dev
```

Smoke-test & cleanup
- `backend/smoke-test.ps1` — PowerShell script that registers a test user and imports a sample payload.
- `backend/check-events.js` — Node helper to list recent events.
- `backend/cleanup-test-data.js` — removes test users/events created by the smoke test.

Note: Automatic client->server migration during login/register is currently disabled. The server still exposes
`POST /migration/import` for manual imports; call it intentionally if you want to migrate a specific local payload.

