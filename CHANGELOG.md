# Changelog

Alle bemerkenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]
## [Unreleased]

## [0.8.1] - 2026-01-29

### Added
- Unload / keepalive sync: Frontend sends a compact batch to `/events/batch` using `fetch(..., { keepalive: true })` to persist latest events/rooms on page unload.
- Hydration on login: server events and rooms are imported into user‑scoped localStorage when signing in.

### Changed
- `syncUserData()` implements retry with exponential backoff and surfaces persistent errors to callers.
- Timeline rendering: height‑aware column segmentation and continuation headers to avoid mixed breaks across columns.
- Manual saves await server sync and show saving UI; autosave skips when no changes present.

### Fixed
- Backend: `POST /events` supports upsert by client id when owned by the user; `DELETE /events/:id` implemented.
- TypeScript and build fixes: added Vite import types, marked async functions, adjusted api calls to satisfy typings.



## [0.8.2] - 2026-02-03

### Added
- Neue GitHub Actions Workflows: `dev` und `release` zur automatischen Version-/SHA-Setzung und Release-Verwaltung.
- `RELEASE_GUIDE.md` mit detaillierter Anleitung zum Release-Prozess.
- User‑scoped LocalStorage: LocalStorage‑Keys werden nun pro Nutzer gekapselt; `AuthProvider.logout()` leitet zu `/login` weiter.

### Changed
- Entfernte alte Workflows: `docker-publish.yml`, `sync-version.yml`, `version-release.yml`.
- CI/Build: Dev-Workflow setzt `version='dev'`; Build verwendet bevorzugt `BUILD_SHA`/`BUILD_VERSION` Umgebungsvariablen.

### Fixed
- Backend version & SHA sync: `backend/package.json` wird in das Docker‑Image kopiert; Version‑Mismatch‑Check basiert nun auf SHA, damit Admin‑Panel korrekte Build‑Informationen anzeigt.
- Korrekte Übergabe von `BUILD_SHA`/`BUILD_VERSION` in Dockerfile und Vite‑Defines.
- Lockfiles (`package-lock.json`) wurden in Version‑Commits aufgenommen.
- Dev‑Package‑Version im Admin wurde normalisiert.

## [0.8.0] - 2026-01-27

### Added
- User-scoped storage: LocalStorage keys are now scoped to the authenticated user (`tm:<userId>:<key>`). This prevents leaking rooms/events between different accounts on the same browser.
- Logout redirect: `AuthProvider.logout()` now navigates to `/login` to ensure the UI returns to the authentication screen after sign-out.
- Backend Docker & entrypoint: Added a backend `Dockerfile`, improved entrypoint handling and initial DB migration support (MIGRATE_ON_START), and OpenAPI routes for auth/events.

### Changed
- CI / Docker: Improvements to build scripts and workflows (buildx/qemu setup, build-cache adjustments, combined frontend+backend image support), and various Dockerfile and compose tweaks for Unraid deployments.
- Frontend: Introduced `userStorage` helper and migrated components (`Room`, `RoomEditor`, `Home`, `LoadRoom`, `LoadEvent`, `PrintViewPage`, `Profile`) to use user-scoped keys with fallbacks to legacy keys.

### Fixed
- UI & storage fixes: Fixed issues around LoadRoom syntax and local-storage handling; ensured API base fallback and fetch error logging.
- Docker build issues: Addressed esbuild/Docker base-image problems and improved entrypoint copy behavior.

## [0.7.0] - 2026-01-23

### Added
- Print: Zeige die dritte "Bemerkung"-Zeile in Druck-Listenansicht und auf Kartenlabels (sichtbar als kleine Warn-Ikone)

### Changed
- UI: Ersetze gelbes Badge durch ein kleines "⚠️" bei Bemerkungen und setze das Icon vor den Namen in Listen und Karten
- UI: Verkleinere Icons und verringere den Abstand in `print-table-label`; erhöhe Schriftgröße der Tischnummer für Druckansichten
- Input: Erhöhe maximale Länge für Bemerkungen (`note`) auf 50 Zeichen (Importer, CSV-Vorschau, Room-Editor)

### Fixed
- Room: Kontextmenü-Bereitstellung nutzt nun die Platzierungs-Helper (`tryPlaceOnTable`), um Überlappungen bei Einzelplatzierungen zu vermeiden
- Placement: Erlaube rotierte Layout-Varianten für bestimmte Gruppengrößen (z. B. 6/8), indem Basisausrichtung auch virtuell generiert wird, damit geeignete Rotationen berücksichtigt werden


### Fixed
- Entfernt Scrollbar in der Liste "Zugewiesen" — Verhalten nun konsistent zu "Unzugewiesen"
- Entfernt Schloss-Symbol vor der Tischnummer in der Liste "Zugewiesen"

## [0.6.7] - 2026-01-22

### Added
- Verbesserte PrintView mit Zeitplan, Datum, Button-Styling, Listen-Sortierung
- Save-Toast nach Speichern (ersetzt Alert)
- Responsive Schriftgrößen für Familiennamen
- Automatische Zeichensatz-Erkennung beim CSV-Import (UTF-8, Windows-1252, UTF-16)

### Changed
- Infoboxen: Weißer Hintergrund für Labels
- Kompakte Labels für vertikale 2er-Gruppen (wie Einzelpersonen, inkl. Personenzahl)
- Platzierungs-Algorithmus: verhindert Gruppensplits, bessere Kompaktheit, TOP3-Debug
- PrintView-Header sichtbar, Print-Footer ausgeblendet, Button- und Listen-UI überarbeitet

### Fixed
- Drag & Drop: Fehler bei fehlenden IDs und Typen behoben
- PrintView: Listen-Sortierung, Zeitplan, Button-Styling
- CSV-Import: Zeichensatzprobleme werden automatisch erkannt und korrigiert

## [0.6.6] - 2026-01-17

### Added
- Mehrfachauswahl für unzugewiesene und zugewiesene Familien inkl. Batch-Aktionen (zu Tisch zuweisen, verschieben, Zuweisung entfernen, löschen)
- UUID-basierte Identifikation aller Familien für stabile Auswahl- und Löschvorgänge
- Visuelle Auswahl-Indikatoren (Checkbox/✔) in beiden Listen

### Changed
- Kontextmenüs gestrafft und eindeutige Beschriftungen für Einzel-/Mehrfachaktionen
- Automatisches Deselektieren beim Listenwechsel (Unzugewiesen ↔ Zugewiesen)
- Event-Speichern-Button bleibt sichtbar, unabhängig von der aktiven Liste

### Fixed
- Batch-Löschen und Tischzuweisung-aufheben in der zugewiesenen Liste funktionierten nicht zuverlässig
- n+1 Zählfehler in Bestätigungs-Dialogs behoben
- Fehlende IDs bei Drag & Drop und beim Bearbeiten unzugewiesener Familien führten zu Typ-/Auswahlfehlern
## [0.6.4] - 2026-01-16

### Changed
- Corrected GitHub Actions workflows: version-release.yml now triggers on version tags (v*) instead of main branch pushes
- Added sync-version.yml workflow to automatically sync package.json version to Footer component and CHANGELOG on dev branch
- Improved release creation automation with proper workflow trigger configuration

## [0.6.3] - 2026-01-15

### Added
- Improved view toggle controls in header with better styling and "Kartenansicht" / "Planansicht" labels
- Event speichern button moved to sidebar footer with compact status indicators
- Compact auto-save countdown display (MM:SS format) and last save timestamp
- Print button integrated into event save section

### Changed
- Restructured layout: moved view controls to main header, event save controls to sidebar footer
- Enhanced visual hierarchy with better toggle button styling and frosted glass effect
- Improved form factor: removed floating sidebar, integrated controls into main UI
- Compact status labels (11px) for auto-save and last save indicators

### Fixed
- Removed duplicate Event speichern button and status displays from header
- Cleaned up floating sidebar UI elements

## [0.6.2] - 2026-01-14

### Fixed
- remove unnecessary scrollbar by adjusting viewport height handling

## [0.6.1] - 2026-01-14

### Fixed
- release notes formatting by using body_path instead of escaped body

## [0.6.0] - 2026-01-14

### Added
- add versioning footer and optimize release workflow

### Fixed
- complete workflow overhaul with robust error handling
- add tag creation before GitHub release
- correct GitHub Actions permissions
Fix: Bind Vite to 0.0.0.0 for Docker access

### Changed
- comprehensive German README with features, installation and Docker support

### Changed
- Fix list container heights to 400px in CSS and inline styles
- Fix build: remove duplicated TimelineView and improve timeline layout
- Improve Timeline view: better spacing, readability, gradient headers, and 3-column layout with up to 20 families per column
- Room: respect R-rotation during drag (previewRotation-driven), initialize rotation at drag start; add autosave countdown UI
- Room: autosave (10min) with silent save + header notice; CSV import uses silent save; RoomEditor: rotate with R while dragging
- RoomEditor: add R-key rotation, right-click context menu (size/delete), and updated help text
- Fix drag & drop: use dragend event and check mouse buttons for right-click rotation
- Add mirroring support: right-click cycles through 8 orientations (4 rotations + 4 mirrored)
- Improve drag & drop: global drop handler and right-click rotation
- Implement DPI-based intelligent UI scaling
- Add drag preview for tables and manual zoom slider
- Add responsive design and touch support for mobile devices
- Fix Dockerfile: install all dependencies for build
- Add Docker workflow and compose files

## [0.5.3] - 2026-01-14

### Fixed
- Komplett überarbeiteter Release-Workflow mit robuster Fehlerbehandlung
- Automatische Badge-Updates im README
- Intelligente Changelog-Generierung nach Conventional Commits
- Validierung gegen doppelte Releases

### Changed
- Workflow läuft nun auch bei Änderungen in `.github/workflows/`
- Bessere Kategorisierung von Commits (feat, fix, docs)
- Merge-Commits werden übersprungen

## [0.5.2] - 2026-01-14

### Changed
- Umfassendes deutsches README mit Features, Installation, Docker-Support
- Verbesserte GitHub-Projektseite mit Badges und strukturierter Dokumentation

### Added
- Detaillierte Projektstruktur-Dokumentation
- CSV-Format Beispiele
- Docker und Docker Compose Anleitungen

## [0.5.0] - 2026-01-14

### Added
- Initial release
- Footer mit Versionsnummer, Creator und Release-Datum
- Room-Verwaltungsfunktionalität
- Event-Import und -Verwaltung
- Automatisierte Versionierung via GitHub Actions
