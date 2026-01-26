# 🪑 Table Manager

[![Version](https://img.shields.io/badge/version-0.6.7-blue.svg)](https://github.com/Cayn183/Table-Manager/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Eine webbasierte Anwendung zur automatischen Verwaltung und Zuweisung von Gästen an Tischen für Events und Veranstaltungen.

## 📋 Überblick

Table Manager ist eine moderne React-Anwendung, die es ermöglicht, Räume mit Tischen zu definieren und Gästegruppen automatisch oder manuell zuzuweisen. Perfekt für Hochzeiten, Firmenfeiern oder andere Events mit Sitzordnung.

### ✨ Features

- **🏗️ Raum-Editor**: Erstelle und verwalte Räume mit benutzerdefinierten Tischkonfigurationen
- **📊 CSV-Import**: Importiere Gästelisten direkt aus CSV-Dateien
- **🤖 Auto-Zuweisung**: Intelligenter Best-Fit-Algorithmus zur optimalen Tischverteilung
- **✏️ Manuelle Verwaltung**: Drag & Drop oder manuelle Gästezuweisung
- **💾 Speichern & Laden**: Exportiere und importiere Event-Konfigurationen
- **🎨 Moderne UI**: Responsive Design mit React Router

## 🚀 Quick Start

### Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn

### Installation

```bash
# Repository klonen
git clone https://github.com/Cayn183/Table-Manager.git
cd Table-Manager

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Die Anwendung ist dann verfügbar unter `http://localhost:5173`

### Local backend (optional)

If you want to run the local backend (for user accounts & persistent storage) follow these steps:

1. Create a Postgres database and update `backend/.env` with `DATABASE_URL` and `JWT_SECRET`.
2. Start backend:

```powershell
cd backend
npm install
npm run dev
```

3. Start frontend (project root) with `VITE_API_URL` pointing to backend:

```powershell
$env:VITE_API_URL = 'http://localhost:4000'
npm run dev
```

4. There are helper scripts in `backend/`:

- `smoke-test.ps1` — registers a test user and imports sample data.
- `check-events.js` — prints recent events from the DB.
- `cleanup-test-data.js` — removes test users/events created by the smoke test.


### Produktions-Build

```bash
# Build erstellen
npm run build

# Build lokal testen
npm run preview
```

### 📝 Entwicklungs-Hinweis

- **Nächste Schritte**: `npm install`, danach `npm run dev`.
- **Tests**: Aktuell sind keine Tests eingerichtet.

## 🐳 Docker

**Images aus GHCR**

- Stable (main): `ghcr.io/cayn183/table-manager:latest` oder eine feste Version wie `:v0.6.1`
- Dev/Preview: `ghcr.io/cayn183/table-manager:dev-latest` (oder `dev-<shortsha>`)

**Lokal bauen**

```bash
# Docker Image bauen
docker build -t table-manager .

# Container starten
docker run -p 5173:5173 table-manager
```

**Docker Compose**

```bash
docker-compose up
```

## 📖 Verwendung

1. **Raum erstellen**: Definiere Tische mit Namen und Kapazitäten
2. **Gäste importieren**: Lade eine CSV-Datei mit Spalten `family,count` oder `group,size`
3. **Auto-Zuweisung**: Nutze den Best-Fit-Algorithmus für optimale Verteilung
4. **Manuelle Anpassungen**: Verschiebe Gäste bei Bedarf zwischen Tischen
5. **Export**: Speichere deine Event-Konfiguration für späteren Zugriff

### CSV-Format Beispiel

```csv
family,count
Müller,4
Schmidt,2
Weber,3
```

## 🛠️ Technologien

- **Frontend**: React 18, TypeScript
- **Build Tool**: Vite 5
- **Routing**: React Router v7
- **CSV-Parsing**: PapaParse
- **Styling**: CSS Modules

## 📦 Projektstruktur

```
Table-Manager/
├── src/
│   ├── components/     # React-Komponenten
│   ├── utils/          # Hilfs-Funktionen (z.B. Platzierungs-Algorithmus)
│   ├── styles/         # CSS-Dateien
│   └── main.tsx        # App-Einstiegspunkt
├── public/             # Statische Assets
├── docker-compose.yml  # Docker Compose Config
└── Dockerfile          # Docker Image Definition
```

## 🤝 Beitragen

Contributions sind willkommen! Bitte erstelle einen Fork und einen Pull Request.

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe [LICENSE](LICENSE) Datei für Details.

## 👤 Autor

**Cayn183**

- GitHub: [@Cayn183](https://github.com/Cayn183)

## 🔖 Changelog

Siehe [CHANGELOG.md](CHANGELOG.md) für Details zu Versionsänderungen.

## 📦 Deployment auf Unraid (Kurz-Guide)

Dieser Abschnitt beschreibt die minimale Umgebung und die wichtigsten Environment-Variablen, die benötigt werden, wenn du Table‑Manager auf Unraid (Docker) betreiben willst. Es wird empfohlen, die Datenbank persistent zu betreiben (`/mnt/user/appdata/...`).

Wichtige Dienste:
- PostgreSQL (Produktion)
- Table‑Manager (Frontend + optional Backend im selben Image)

Wichtige Environment-Variablen

- Backend (serverseitig, im `backend`-Container oder in `table-manager` wenn Backend integriert):
	- `DATABASE_URL` — Postgres-Verbindungsstring, z.B. `postgres://tm_user:tm_pass@postgres:5432/tablemanager`
	- Alternativ (bevorzugt): separate Postgres-Variablen, die das Backend jetzt unterstützt:
		- `POSTGRES_HOST` — Hostname oder IP-Adresse des Postgres-Servers (z. B. `postgres`)
		- `POSTGRES_PORT` — Port (Standard: `5432`)
		- `POSTGRES_USER` — Datenbank-Benutzer
		- `POSTGRES_PASSWORD` — Passwort für den Postgres-Benutzer
		- `POSTGRES_DB` — Name der Datenbank
		- `POSTGRES_SSL` — `true`/`false`, aktiviert SSL-Verbindung zum DB-Server (z. B. für verwaltete DBs)
		
		Das Backend verwendet die `POSTGRES_*`-Variablen wenn vorhanden und fällt ansonsten auf `DATABASE_URL` zurück.
	- `JWT_SECRET` — sicherer, zufälliger Secret-String für JWT (z. B. 32+ zufällige Zeichen)
	- `PORT` — optional (Standard: `4000`) — Hinweis: das Backend verwendet jetzt standardmäßig Port `4000`, ein `PORT`-Env ist nicht erforderlich.
	- `NODE_ENV` — `production` empfohlen
	- `SENTRY_DSN` — optional, für Fehler-Reporting
	- `SENTRY_TRACES_SAMPLE_RATE` — optional, z.B. `0.05`

- Frontend (Vite build / Laufzeit in Container):
	- `VITE_API_URL` — URL zur Backend-API, z. B. `http://localhost:4000` oder `http://backend:4000`
	- `VITE_SENTRY_DSN` — optional
	- `VITE_BUILD_VERSION` / `VITE_BUILD_SHA` — werden während des Builds gesetzt (CI / Docker build-args)

Postgres (Beispiel für `docker-compose` / Unraid)

Ein einfaches Compose‑Snippet (lokal / Unraid benutzerdefiniert) — passe `POSTGRES_PASSWORD` und Volumes an:

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
			# Prefer separate POSTGRES_* variables (backend supports these)
			- POSTGRES_HOST=postgres
			- POSTGRES_PORT=5432
			- POSTGRES_USER=${POSTGRES_USER:-tm_user}
			- POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-verysecurepassword}
			- POSTGRES_DB=${POSTGRES_DB:-tablemanager}
			- POSTGRES_SSL=${POSTGRES_SSL:-false}
			# DATABASE_URL still supported as fallback
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

DB-Migration / Schema
- Die initiale DB-Struktur ist in `[backend/db/schema.sql]` hinterlegt. Du kannst die Datei mit `psql` in die DB importieren, z. B.: 

```bash
# lokal oder in einem temporären Postgres-Container
psql "postgres://tm_user:verysecurepassword@localhost:5432/tablemanager" -f backend/db/schema.sql
```

Alternativ kann das Backend beim ersten Start eine Migration endpoint anbieten (siehe `backend/src/routes/migration.ts`), welches importiert werden kann — nur für lokale/geschützte Umgebungen verwenden.

Sicherheits-Hinweise
- Setze `JWT_SECRET` auf einen ausreichend langen, zufälligen Wert (z. B. `openssl rand -hex 32`).
- Verwende sichere Passwörter für Postgres und sichere Zugriffsregeln in Unraid.
- Wenn du Sentry nutzt, setze `SENTRY_DSN` nur in Secrets/Environment-Settings.

Build-Argumente für Docker
- Beim Erstellen des Images über CI/Unraid kannst du `BUILD_SHA` und `BUILD_VERSION` als Build-Args übergeben, damit die Footer-Anzeige die korrekte Version / den Commit anzeigt:

```bash
# Beispiel
docker build --build-arg BUILD_SHA=$(git rev-parse --short HEAD) --build-arg BUILD_VERSION=$(cat package.json | jq -r .version) -t table-manager:dev .
```

Debug & Wartung
- Logs: Standardmäßig schreibt das Backend strukturierte Logs; schau in die Container-Logs (`docker logs table-manager`) bei Fehlern.
- Backups: Sichere das Postgres-Volume regelmäßig (`/mnt/user/appdata/table-manager/postgres`).

Support & Weiteres
- Weitere Informationen und API-Spezifikation: siehe [backend/openapi.yaml](backend/openapi.yaml)
- Wenn du möchtest, erstelle ich ein fertiges `docker-compose.unraid.yml`-Template, das sich direkt in Unraid verwenden lässt.

***

Wenn du willst, pushe ich diese README-Änderung direkt auf `dev` (oder erstelle eine PR). Soll ich pushen? 
