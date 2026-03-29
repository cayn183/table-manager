# Release v1.2.0 - Mobile UX, Security & Data Platform

## What's New

### Added
- **Mobile Bottom-Navigation**: 5-Tab Bottom-Bar (Home, Events, Räume, Club, Profil) mit `safe-area-inset-bottom` für iPhones. Desktop-Navbar wird auf Mobile automatisch ausgeblendet.
- **Tab-Overflow Scrolling**: Horizontales Scrollen der Tab-Leiste wenn Tabs die Bildschirmbreite überschreiten. Aktiver Tab scrollt automatisch ins Sichtfeld.
- **RoomEditor Mobile Touch**: Kompletter Touch-Rewrite — Pinch-to-Zoom (0.5x–3x), Ein-Finger-Pan, Long-Press-Kontextmenü (Drehen/Löschen/Umbenennen/Verschieben), Drag-after-Activation, MiniMap und TablePickerSheet.
- **URL Deep-Linking**: Direkte URLs für Events und Räume. 404-Handling bei nicht existierenden Ressourcen.
- **Club Activity Log Dashboard**: Neuer "Aktivität"-Tab in Club-Einstellungen mit Timeline-Darstellung, Filter nach Zeitraum/Aktion/User und CSV-Export.
- **Club Rooms API**: Raumdaten serverseitig persistiert (ersetzt localStorage). Multi-Device-Nutzung möglich.
- **CI Build-Gate**: GitHub Actions Workflow für automatischen Build-Check bei Push/PR in beiden Repos.
- **Birthday Notifications** (Backend): Täglicher Cron-Job sendet E-Mail an Vereinsvorstände bei Mitglieder-Geburtstagen. Opt-out möglich.
- **Unit Tests** (Backend): 24 Tests mit Vitest (RSVP-Merge, Rollenhierarchie, Birthday-Cron).

### Changed
- **Zod Input-Validierung** (Backend): 15 Schemas für alle POST/PATCH-Endpunkte mit typsicherer Validierung.
- **openapi.yaml** (Backend): Komplett neu erstellt mit allen Endpunkten und Schemas.

### Fixed
- **Security Hardening**: OWASP Top 10 Review mit 2 Fixes (Logo-Upload Extension-Validation, Admin ILIKE Wildcard-Injection).
- **npm Vulnerabilities**: brace-expansion, path-to-regexp, picomatch in beiden Repos gepatcht.
- **Docker Build**: package-lock.json für Node 18 Docker-Kompatibilität regeneriert.

## Technical Details
- Version: `1.2.0`
- Release Date: `2026-03-29`
- Highlights: Mobile-First UX, OWASP Security Hardening, Activity Data Platform, 24 Unit Tests, 0 npm Vulnerabilities
