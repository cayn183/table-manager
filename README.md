# 🪑 Table Manager

[![Version](https://img.shields.io/github/v/release/Cayn183/Table-Manager)](https://github.com/Cayn183/Table-Manager/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Table Manager hilft dir dabei, Räume und Tische zu modellieren und Gästegruppen automatisch oder manuell einzuteilen – ideal für Hochzeiten, Firmenfeiern und andere Events.

## Features

- Raum-Editor mit benutzerdefinierten Tischkonfigurationen
- CSV-Import von Gästelisten sowie eine Best-Fit Auto-Zuweisung
- Manuelle Verwaltung per Drag & Drop und Speichern/Exportieren von Sessions
- Moderne, responsive UI auf React/Vite mit Routing, Styling und CSV-Parsing

## Schnellstart

Alle Details zum Installieren, Entwickeln und optionalen lokalen Backend findest du in [anleitungen/quickstart.md](anleitungen/quickstart.md).

## Deployment & Betrieb

Docker, Deployments, Postgres-Umgebungen, Build-Args und Wartungshinweise sind in [anleitungen/deployment.md](anleitungen/deployment.md) gesammelt.

## Security Setup (Required)

- `JWT_SECRET` muss gesetzt sein (Backend startet sonst nicht).
- `CORS_ORIGIN` setzen, wenn Frontend und Backend unterschiedliche Origins haben (Komma-separiert).
- `METRICS_TOKEN` setzen, um `/metrics` per `Authorization: Bearer <token>` freizuschalten.
- Optional: `AUTH_COOKIE_NAME`, `COOKIE_SAMESITE`, `COOKIE_SECURE`, `COOKIE_DOMAIN` fuer Cookie-Auth.

## Naechste Schritte

- Backend starten: im Ordner [backend](backend) `npm install` und `npm run dev`.
- Frontend starten: im Repo-Root `npm install` und `npm run dev`.
- Tests: aktuell keine automatisierten Tests vorhanden.

## Landing Page & App

- Die Marketing-Startseite liegt auf `/` und funktioniert ohne Frontdomain direkt unter eventplaner.caydan.de.
- Der eigentliche Planner ist unter `/app` erreichbar; Login/Register laufen ueber `/login` bzw. `/register`.

## Sonstiges

- [CHANGELOG.md](CHANGELOG.md) beschreibt konkrete Versionsänderungen
- Contributions willkommen – bitte fork + PR
- Lizenz: MIT (siehe [LICENSE](LICENSE))
