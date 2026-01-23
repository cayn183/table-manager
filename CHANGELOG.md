# Changelog

Alle bemerkenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [0.6.8] - 2026-01-23

### Fixed
- Entfernt Scrollbar in der Liste "Zugewiesen" — Verhalten nun konsistent zu "Unzugewiesen"
- Entfernt Schloss-Symbol vor der Tischnummer in der Liste "Zugewiesen"


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
