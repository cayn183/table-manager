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
