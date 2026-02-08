# Deployment & Docker

## Images aus GitHub Container Registry

- Stable (main): `ghcr.io/cayn183/table-manager:latest` oder `ghcr.io/cayn183/table-manager:v0.6.1`
- Vorschau/Dev: `ghcr.io/cayn183/table-manager:dev-latest` oder `dev-<shortsha>`

## Lokaler Docker-Build

```bash
docker build -t table-manager .
docker run -d -p 5173:5173 --name table-manager-frontend table-manager
docker logs -f table-manager-frontend
```

## Docker Compose

```bash
docker-compose up
```

## Backend-Umgebungsvariablen

- `DATABASE_URL`: Postgres-Verbindungsstring (Fallback, wenn keine einzelnen `POSTGRES_*`-Variablen gesetzt sind)
- `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`: bevorzugte Einzel-Variablen
- `POSTGRES_SSL`: `true` oder `false`
- `JWT_SECRET`: mindestens 32 Zeichen, zufälliger Secret-String
- `PORT`: optional (Standard `4000`)
- `NODE_ENV`: `production` empfohlen
- `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`: optional für Fehler-Monitoring

Das Backend verwendet explizite `POSTGRES_*`-Variablen wenn definiert und fällt sonst auf `DATABASE_URL` zurück.

## Frontend-Umgebungsvariablen

- `VITE_API_URL`: URL zur Backend-API (z. B. `http://localhost:4000` oder `http://backend:4000`)
- `VITE_SENTRY_DSN`: optional
- `VITE_BUILD_VERSION`, `VITE_BUILD_SHA`: werden über Build-Args gesetzt (CI/Docker)

## Beispiel: Compose-Snippet für Unraid oder lokale Deployments

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: tablemanager-db
    environment:
      POSTGRES_USER: tm_user
      POSTGRES_PASSWORD: verysecurepassword
      POSTGRES_DB: tablemanager
    volumes:
      - /mnt/user/appdata/table-manager/postgres:/var/lib/postgresql/data
    restart: unless-stopped

  table-manager:
    image: ghcr.io/cayn183/table-manager:latest
    container_name: table-manager
    ports:
      - "5173:5173"
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=${POSTGRES_USER:-tm_user}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-verysecurepassword}
      - POSTGRES_DB=${POSTGRES_DB:-tablemanager}
      - POSTGRES_SSL=${POSTGRES_SSL:-false}
      - DATABASE_URL=postgres://${POSTGRES_USER:-tm_user}:${POSTGRES_PASSWORD:-verysecurepassword}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-tablemanager}
      - JWT_SECRET=replace_with_a_strong_secret
      - NODE_ENV=production
      - VITE_API_URL=http://localhost:4000
    depends_on:
      - postgres
    volumes:
      - /mnt/user/appdata/table-manager:/app/data
    restart: unless-stopped
```

## Datenbank & Migration

- Die Schema-Definition lebt in `backend/db/schema.sql`.
- Alternativ bietet `backend/src/routes/migration.ts` einen Endpunkt zum Import in geschützten Umgebungen.
- Für schnelle Tests lohnt sich das Backend-Skript `smoke-test.ps1`.

```bash
psql "postgres://tm_user:verysecurepassword@localhost:5432/tablemanager" -f backend/db/schema.sql
```

## Sicherheits-Hinweise

- `JWT_SECRET` muss lang und zufällig sein (`openssl rand -hex 32`).
- Secure Passwörter für Postgres und restriktive Netzwerkregeln (z. B. in Unraid) verwenden.
- Sentry-Daten nur in sicheren Umgebungen konfigurieren.

## Build-Argumente

```bash
docker build --build-arg BUILD_SHA=$(git rev-parse --short HEAD) --build-arg BUILD_VERSION=$(jq -r .version package.json) -t table-manager:dev .
```

Diese Argumente ermöglichen es, Versionsinformationen im UI anzuzeigen.

## Wartung & Support

- Backend schreibt strukturierte Logs (`docker logs table-manager`).
- Datenbank-Backups: z. B. Backup des Postgres-Volumes `/mnt/user/appdata/table-manager/postgres`.
- API-Spezifikation: `backend/openapi.yaml`
- Release-Infos: `CHANGELOG.md`
