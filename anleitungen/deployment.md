# Deployment & Docker

## Container-Architektur

Table-Manager verwendet eine 2-Container-Architektur:

| Container | Image | Port | Repository |
|-----------|-------|------|------------|
| Backend | `ghcr.io/cayn183/backend-table-manager:latest` | 4000 | [Cayn183/backend-table-manager](https://github.com/Cayn183/backend-table-manager) |
| Frontend | `ghcr.io/cayn183/table-manager:latest` | 5173 | [Cayn183/table-manager](https://github.com/Cayn183/table-manager) |

## Images aus GitHub Container Registry

**Frontend:**
- Stable: `ghcr.io/cayn183/table-manager:latest`
- Dev: `ghcr.io/cayn183/table-manager:dev-latest`

**Backend:**
- Stable: `ghcr.io/cayn183/backend-table-manager:latest`
- Dev: `ghcr.io/cayn183/backend-table-manager:dev-latest`

## Docker Compose (empfohlen)

```bash
docker-compose up -d
```

Für Unraid-spezifische Konfiguration verwende `docker-compose.unraid.yml`.

## Backend-Umgebungsvariablen

- `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`: Datenbank-Verbindung
- `POSTGRES_SSL`: `true` oder `false`
- `JWT_SECRET`: mindestens 32 Zeichen, zufälliger Secret-String
- `PORT`: optional (Standard `4000`)
- `NODE_ENV`: `production` empfohlen
- `MIGRATE_ON_START`: `true` für automatische Migrationen beim Start
- `LOG_FILE`: Pfad zur Log-Datei (Standard `/app/data/backend.log`)
- `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`: optional für Fehler-Monitoring
- `APP_BASE_URL`: Oeffentliche App-URL fuer Links in E-Mails
- `PASSWORD_RESET_PATH`: Pfad fuer Passwort-Reset Links (Default `/reset-password`)
- `PASSWORD_RESET_TTL_MINUTES`: Gueltigkeit des Reset-Tokens (Default `30`)
- `PASSWORD_RESET_TOKEN_SECRET`: Optionaler Secret fuer Reset-Token (Default `JWT_SECRET`)
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`: Mailgun Settings fuer E-Mail Versand
- `MAILGUN_API_URL`: Mailgun API Base (EU: `https://api.eu.mailgun.net`)
- `MAILGUN_REPLY_TO`: Optionaler Reply-To Header

## Frontend-Umgebungsvariablen

- `VITE_API_URL`: URL zur Backend-API (z. B. `http://localhost:4000`)
- `VITE_SENTRY_DSN`: optional
- `VITE_BUILD_VERSION`, `VITE_BUILD_SHA`: werden über Build-Args gesetzt (CI/Docker)
- `VITE_LOG_LEVEL`: Log-Level für den Preview-Server (`info|warn|error|silent|debug`)

## Logging

**Backend:**
- Logs werden nach `/app/data/backend.log` geschrieben
- Bei Unraid: `/mnt/user/appdata/table-manager/backend-data/backend.log`
- Auch via `docker logs table-manager-backend` verfügbar

**Frontend:**
- Nur stdout/stderr (stateless)
- Via `docker logs table-manager-frontend` verfügbar
- Optional: `VITE_LOG_LEVEL=debug` für mehr Preview-Server-Logs

**PostgreSQL:**
- Via `docker logs tablemanager-db` verfügbar

## Beispiel: 2-Container-Setup für Unraid

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

  backend:
    image: ghcr.io/cayn183/backend-table-manager:latest
    container_name: table-manager-backend
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=tm_user
      - POSTGRES_PASSWORD=verysecurepassword
      - POSTGRES_DB=tablemanager
      - JWT_SECRET=replace_with_a_strong_secret
      - NODE_ENV=production
      - MIGRATE_ON_START=true
      - LOG_FILE=/app/data/backend.log
    depends_on:
      - postgres
    ports:
      - "4000:4000"
    volumes:
      - /mnt/user/appdata/table-manager/backend-data:/app/data
    restart: unless-stopped

  frontend:
    image: ghcr.io/cayn183/table-manager:latest
    container_name: table-manager-frontend
    environment:
      - VITE_API_URL=http://YOUR_SERVER_IP:4000
    depends_on:
      - backend
    ports:
      - "5173:5173"
    restart: unless-stopped
```

## Datenbank & Migration

- Die Schema-Definition liegt im Backend-Repository unter `db/schema.sql`
- Migrationen werden automatisch ausgeführt wenn `MIGRATE_ON_START=true`
- Migrations-Dateien befinden sich in `migrations/`

## Sicherheits-Hinweise

- `JWT_SECRET` muss lang und zufällig sein (`openssl rand -hex 32`)
- Sichere Passwörter für Postgres verwenden
- In Unraid: restriktive Netzwerkregeln konfigurieren

## Build-Argumente (für lokale Builds)

**Frontend:**
```bash
docker build --build-arg BUILD_SHA=$(git rev-parse --short HEAD) --build-arg BUILD_VERSION=dev -t table-manager:dev .
```

**Backend:**
```bash
cd backend-table-manager
docker build --build-arg BUILD_SHA=$(git rev-parse --short HEAD) --build-arg BUILD_VERSION=dev -t backend-table-manager:dev .
```

## Wartung & Support

- Backend-Logs: `/mnt/user/appdata/table-manager/backend-data/backend.log` (Unraid)
- Datenbank-Backups: Backup des Postgres-Volumes `/mnt/user/appdata/table-manager/postgres`
- API-Spezifikation: siehe Backend-Repository `openapi.yaml`
- Release-Infos: `CHANGELOG.md`
