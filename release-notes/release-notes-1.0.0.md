# Release v1.0.0 - Landingpage & Multi-Container-Workflow

## What's New

### Added
- Eine neue Marketing-Landingpage (`src/components/LandingPage.tsx`) mit Hero, Feature-Grid, Showcase, Einsatzbereichen, Preisübersicht und klaren CTAs auf `/`, damit Besucher die kostenlose Eventplaner-Erfahrung sofort entdecken.
- Ausführliche Schnellstart- und Deployment-Anleitungen (`anleitungen/quickstart.md` & `anleitungen/deployment.md`), die den 2-Container-Stack, GHCR-Images, Docker-Compose-Beispiele und die relevanten Frontend/Backend-Umgebungsvariablen (inkl. `VITE_LOG_LEVEL`) dokumentieren.
- Das neue `scripts/preview-with-loglevel.js`-Skript erlaubt die Vorschau-/Start-Umgebung mit `VITE_LOG_LEVEL`-Steuerung und dokumentiert den erlaubten Hosts-Kontext für Container-Deployments.

### Changed
- Der Backend-Code wurde aus diesem Repository entfernt; Frontend und Backend bleiben jetzt als getrennte Container in eigenen Repositories, und README/Compose-Dateien verweisen auf die jeweiligen GHCR-Images und API-URLs.
- `AuthContext` lädt beim Start `/auth/me`, speichert keine Tokens mehr im LocalStorage, synchronisiert nutzerspezifische Storage-Daten beim Login/Unload und führt `/auth/logout` aus, wodurch Cookie-Sessions härter und weniger fehleranfällig werden.
- App-Routing zeigt die neue Landingpage auf `/` und belässt `/app` als geschützte Planner-Oberfläche hinter der Anmeldung.

### Fixed
- Preview-/Start-Skript respektiert jetzt `VITE_LOG_LEVEL` (inkl. `debug`) und loggt das effektive Level sowie die erlaubten Hosts, damit Container-Logs in Unraid & Co. zuverlässig steuerbar sind.

## Technical Details
- Version: `1.0.0`
- Release Date: `2026-02-11`
- Highlights: Landingpage, Dokumentations-Refresh, Multi-Container-Stack, gehärtete Authentifizierung und log-levelfähige Vorschau.
