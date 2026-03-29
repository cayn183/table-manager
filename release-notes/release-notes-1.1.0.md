# Release v1.1.0 - Guest List, Event Modules & Invite System

## What's New

### Added
- **Vereins-/Club-Feature**: Vollständiges neues Modul für Vereinsverwaltung:
  - `ClubDashboard` als Einstiegspunkt für Vereinsmitglieder
  - `ClubMembers` und `ClubMemberModal` zur Mitgliederverwaltung
  - `InviteMembers` für das Einladen neuer Vereinsmitglieder
  - `ClubSettings` für Vereinskonfiguration
  - `ClubJoinModal` und `ClubCreateModal` für Beitritt und Neugründung
  - `ClubContext` als zentraler State-Provider für das gesamte Club-Modul
  - Vollständiges Routing für alle Club-Seiten

- **Club-Event-Wizard**: Mehrstufige Event-Erstellung im Vereinskontext:
  - `ClubEventWizardModal` für geführte Event-Erstellung
  - `ClubEventDetail` mit Tab-Navigation (Raumplanung, ToGo, Einladungen)
  - `ClubEvents`-Übersicht mit Event-Liste und Statusanzeige
  - `ClubRoomEditor` und `ClubToGo` als vereinsintegrierte Versionen der bestehenden Module

- **Reservierungs-System**: Neues Modul für öffentliche Tischreservierungen:
  - `ReservationPage`: Öffentlich zugängliche Reservierungs-Seite für Gäste
  - `ReservationConfigPanel`: Manager-UI zur Konfiguration von Reservierungsoptionen
  - Integration in Room- und ToGo-Views mit Token-Authentifizierung
  - Unterstützung für raum-freie Events mit Reservierungs-Seiten-Toggle

- **Einladungs-System**:
  - `EventInvitePage`: Personalisierte Einladungs-Links für einzelne Gäste
  - `EventOpenInvitePage`: Öffentliche Einladungsseite für allgemeine Einladungen

- **Gästeliste-Landingpage**: Neue Landing-Page-Sektionen für Clubs und Hochzeitsplanung mit konsistentem Banner-Design und zwei separaten Bereichen (Vereinsmanagement / Hochzeitsplanung).

### Changed
- **Komponenten-Reorganisation**: Alle React-Komponenten in thematische Unterverzeichnisse umstrukturiert:
  - `auth/` — Authentifizierungs-Komponenten
  - `club/` — Club-Feature-Komponenten
  - `landing/` — Landingpage-Komponenten
  - `layout/` — Layout- und Navigation-Komponenten (inkl. verschobene `Footer.tsx`)
  - `reservation/` — Reservierungs-Modul
  - `room/` — Raumplanung-Komponenten
  - `shared/` — Gemeinsam genutzte UI-Komponenten
  - `togo/` — ToGo-Bestellungs-Komponenten
- **AppLayout-Header**: Zeigt nun Event-Titel und Uhrzeit; RoomEditor navigiert korrekt zurück zur aufrufenden Club-Event-Seite.
- **Landingpages**: Aktualisiert mit konsistenten Bannern und getrennten Sektionen für Vereins- und Hochzeitskontext.

### Fixed
- Token-Parameter zu allen Club-API-Aufrufen hinzugefügt (verhindert 401-Fehler bei Club-Abfragen).
- `Footer.tsx`-Pfad im `dev-push`-Workflow auf neuen Komponentenpfad (`src/components/layout/`) korrigiert.
- Dockerfile: Node.js 18 → 20 aktualisiert (react-router-dom v7 erfordert Node ≥ 20).
- Fehlende transitive Abhängigkeit `@floating-ui/dom` in `package-lock.json` ergänzt.
- Implizites Type-Loading in `tsconfig.json` deaktiviert, um false-positive TypeScript-Fehler zu unterdrücken.

## User Benefits
- **Vereinsverwaltung**: Vereine können Events planen, Mitglieder verwalten und Einladungen verschicken
- **Gäste-Self-Service**: Gäste können sich über öffentliche Links selbst anmelden und Reservierungen vornehmen
- **Modulare Struktur**: Saubere Trennung von Room-, ToGo- und Club-Funktionalität ermöglicht gezielte Nutzung
- **Einladungsworkflow**: Personalisierte und offene Einladungslinks für flexible Gästesteuerung

## Technical Details
- Version: `1.1.0`
- Release Date: `2026-03-26`
- Highlights: Club-Feature, Reservierungs-System, Einladungs-Seiten, Komponenten-Reorganisation, Node.js 20
