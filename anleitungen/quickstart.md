# Schnellstart

## Voraussetzungen

- Node.js 18 oder höher
- npm oder yarn
- Docker (für Backend)

## Frontend einrichten (Entwicklung)

```bash
git clone https://github.com/Cayn183/table-manager.git
cd table-manager
npm install
npm run dev
```

Die Anwendung läuft danach unter http://localhost:5173.

## Backend einrichten (separates Repository)

Das Backend befindet sich in einem separaten Repository: [Cayn183/backend-table-manager](https://github.com/Cayn183/backend-table-manager)

### Option 1: Docker (empfohlen)

```bash
docker run -d \
  --name table-manager-backend \
  -p 4000:4000 \
  -e POSTGRES_HOST=your-db-host \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=tm_user \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=tablemanager \
  -e JWT_SECRET=your-secret \
  -e MIGRATE_ON_START=true \
  ghcr.io/cayn183/backend-table-manager:latest
```

### Option 2: Lokale Entwicklung

```bash
git clone https://github.com/Cayn183/backend-table-manager.git
cd backend-table-manager
npm install
# .env Datei mit Datenbank-Zugangsdaten erstellen
npm run dev
```

## Frontend mit Backend verbinden

```powershell
$env:VITE_API_URL = 'http://localhost:4000'
npm run dev
```

Oder als Environment-Variable in `.env.local`:

```
VITE_API_URL=http://localhost:4000
```

## Docker Compose (Full Stack)

Für einen kompletten Stack mit Frontend, Backend und PostgreSQL:

```bash
docker-compose up -d
```

## Produktions-Build

```bash
npm run build
npm run preview
```

## Weitere Anleitungen

- [Deployment & Docker](deployment.md) - Ausführliche Deployment-Dokumentation
- [Backend README](https://github.com/Cayn183/backend-table-manager#readme) - Backend-Dokumentation
