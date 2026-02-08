# Schnellstart

## Voraussetzungen

- Node.js 18 oder höher
- npm oder yarn

## Projekt einrichten

```bash
git clone https://github.com/Cayn183/Table-Manager.git
cd Table-Manager
npm install
```

Zum Starten des Frontends:

```bash
npm run dev
```

Die Anwendung läuft danach unter http://localhost:5173.

## Optionales lokales Backend

1. PostgreSQL-Datenbank anlegen und `backend/.env` mit `DATABASE_URL` sowie `JWT_SECRET` füllen.
2. Backend starten:

```powershell
cd backend
npm install
npm run dev
```

3. Frontend mit `VITE_API_URL` auf die Backend-URL zeigen lassen:

```powershell
$env:VITE_API_URL = 'http://localhost:4000'
npm run dev
```

> Die Skripte im `backend/`-Ordner helfen beim Testen:
> - `smoke-test.ps1` legt einen Testuser an und importiert Beispiel-Daten.
> - `check-events.js` zeigt aktuelle Events aus der Datenbank.
> - `cleanup-test-data.js` entfernt vom Smoke-Test erzeugte Daten.

## Produktions-Build

```bash
npm run build
npm run preview
```

## Tests

Aktuell gibt es keine automatisierten Tests. Weitere Anleitungen findest du unter [anleitungen/deployment.md](anleitungen/deployment.md) für Deployments und Docker.
