# PlatzPilot — Produkt-Roadmap

> **Wöchentliche Sitzung:** 29. März 2026  
> **Stand:** v1.1.0 (released 2026-03-26)  
> **Letzte Aktualisierung:** 2026-03-29 — Phase 1 abgeschlossen, Phase 2 (2.1–2.6) abgeschlossen, Phase 3 (3.1, 3.3, 3.4) abgeschlossen  
> **Erstellt durch:** Roundtable (Product Architect · Frontend UX · Backend Platform · Quality Security · DevOps Delivery · Data & Customer Insight)

---

## Legende

| Symbol | Bedeutung |
|---|---|
| 🏗️ | Fundament / technische Schuld |
| 🎨 | UX / Frontend |
| ⚙️ | Backend / API |
| 🔒 | Qualität / Sicherheit |
| 🚀 | DevOps / Delivery |
| 📊 | Daten / Analytics |
| 🧩 | Feature-Erweiterung |

**Überwachende Agents:**
- **PA** = Product Architect
- **FE** = Frontend UX
- **BE** = Backend Platform
- **QS** = Quality & Security
- **DD** = DevOps & Delivery
- **DI** = Data & Customer Insight

---

## Phase 1 — Fundament (Sprint 1–2, KW 14–17)

> Ziel: Keine neuen Features bauen, bevor das Fundament stabil ist.  
> Blockiert alle nachfolgenden Phasen.

### 1.1 🚀 CI Build-Gate (KRITISCH) ✅
**Agent:** DD  
**Priorität:** SOFORT  
**Abhängigkeiten:** keine  
**Status:** ABGESCHLOSSEN (2026-03-29)  
**Beschreibung:** GitHub Actions Workflow der bei jedem Push auf `main` sowie bei Pull Requests automatisch `npm run build` ausführt — für beide Repositories unabhängig. Verhindert, dass AI-Agent-Änderungen TypeScript-Fehler einschleppen.

**Akzeptanzkriterien:**
- [x] `.github/workflows/ci.yml` in `Table-Manager`-Repo: führt `npm ci && npm run build` aus
- [x] `.github/workflows/ci.yml` in `Backend-Table-Manager`-Repo: führt `npm ci && npm run build` aus
- [x] Build-Status-Badge in README beider Repos
- [x] Pipeline schlägt fehl wenn TypeScript-Fehler vorhanden
- [ ] `smoke-test.ps1` aus Backend-Repo wird als nachgelagerter Schritt ausgeführt (mit lokalem DB-Mock oder Skip-Flag)

**Technische Schritte:**
1. `Table-Manager`: Workflow-Datei mit `on: [push, pull_request]` + `jobs.build` mit Node 20 + `npm ci` + `npm run build`
2. `Backend-Table-Manager`: Identisch, zusätzlich `npm run build` prüft TypeScript-Kompilierung
3. Optional: Caching von `node_modules` per `actions/cache`

---

### 1.2 ⚙️ Backend-Persistenz für Club-Räume ✅
**Agent:** BE  
**Priorität:** HOCH  
**Abhängigkeiten:** keine  
**Status:** ABGESCHLOSSEN (2026-03-29) — Migration ausgeführt, Backend-Routes + Frontend-API-Umstellung live  
**Beschreibung:** Club-Raumdaten werden aktuell in localStorage unter `tm:clubrooms-${clubId}` gespeichert (`ClubEventDetail.tsx` Zeilen 49–55). Das verhindert Multi-Device-Nutzung und Datensicherung. Neue Backend-Route und Migration erforderlich.

**Akzeptanzkriterien:**
- [x] Migration: Tabelle `club_rooms` mit `id`, `club_id`, `name`, `data` (JSONB), `created_at`, `updated_at`
- [x] `GET /clubs/:clubId/rooms` — Liste aller Räume eines Clubs (erfordert Mitgliedschaft)
- [x] `POST /clubs/:clubId/rooms` — Neuen Raum erstellen
- [x] `PUT /clubs/:clubId/rooms/:roomId` — Raum aktualisieren
- [x] `DELETE /clubs/:clubId/rooms/:roomId` — Raum löschen (nur owner/vorstand)
- [x] `clubApi.ts` um entsprechende Funktionen erweitern
- [x] `ClubEventDetail.tsx`: `loadClubRooms` / `saveToClubLibrary` durch API-Calls ersetzen (mit localStorage-Migration)
- [x] `ClubRoomEditor.tsx`: Speichern-Aktion nutzt API statt localStorage
- [x] Migration-Datei: `migrations/20260401_club_rooms.sql`
- [ ] openapi.yaml: `/clubs/{clubId}/rooms` Endpunkte dokumentieren — **offen (openapi.yaml gelöscht, wird in 2.4 neu erstellt)**

**Technische Schritte:**
1. Migration schreiben und testen
2. Route `clubs.ts` erweitern: CRUD für `club_rooms`
3. Rollenbeschränkung: Lesen = mitglied+, Schreiben = vorstand+, Löschen = vorstand+
4. `clubApi.ts`: `getClubRooms`, `createClubRoom`, `updateClubRoom`, `deleteClubRoom`
5. Frontend: `ClubEventDetail` auf API umstellen, Ladezustand und Fehlerfall behandeln
6. localStorage-Keys `tm:clubrooms-*` entfernen + einmalige Migration-Hinweis-Banner

---

### 1.3 🎨 Mobile Bottom-Navigation ✅
**Agent:** FE  
**Priorität:** HOCH  
**Abhängigkeiten:** keine (parallel zu 1.1 und 1.2 möglich)  
**Status:** ABGESCHLOSSEN (2026-03-29)  
**Beschreibung:** `MOBILE_KONZEPT.md` beschreibt eine Bottom-Tab-Bar für Handy. `useDeviceType()` ist bereits in allen wichtigen Komponenten importiert. Die Top-Navbar muss auf Mobile durch eine 5-Tab Bottom-Bar ersetzt werden. Ohne diese ist die App auf Smartphones nicht nutzbar.

**Akzeptanzkriterien:**
- [x] Neue Komponente `src/components/layout/BottomNav.tsx`
- [x] 5 Tabs: Home (`/app`), Events (`/app/events`), Räume (`/app/rooms`), Club (`/app/club/:clubId/events` oder Übersicht), Profil (`/app/profile`)
- [x] Aktiver Tab: Lila Akzentfarbe (`#667eea`)
- [x] `safe-area-inset-bottom` für iPhone-Home-Indikator
- [x] `AppLayout.tsx`: BottomNav wird auf `device === 'mobile'` gerendert, obere Navbar ausgeblendet
- [x] CSS: `position: fixed; bottom: 0; left: 0; right: 0` + `padding-bottom: env(safe-area-inset-bottom)`
- [x] Content-Bereich: `padding-bottom` auf Mobile angepasst (nicht durch Bottom-Nav verdeckt)
- [x] Kein Club vorhanden: Club-Tab zeigt Modal-Trigger für Erstellen/Beitreten

**Technische Schritte:**
1. `BottomNav.tsx` Komponente mit 5 Tabs + aktiver Route-Erkennung via `useLocation`
2. `AppLayout.tsx`: konditionell BottomNav rendern statt Sidebar-Links
3. CSS-Variable `--bottom-nav-height: 60px` + `safe-area-inset-bottom`
4. `styles.css` / `layout.css`: Content-Scroll überarbeiten
5. Testen auf 375px, 390px (iPhone), 768px (iPad)

---

### 1.4 🎨 Tab-Overflow auf Mobile ✅
**Agent:** FE  
**Priorität:** MITTEL  
**Abhängigkeiten:** 1.3 (sinnvoll nach Bottom-Nav)  
**Status:** ABGESCHLOSSEN (2026-03-29)  
**Beschreibung:** `PrivateEventDetail` hat 9 Tabs, `ClubEventDetail` hat 6 Tabs. Auf einem 375px-Screen nicht darstellbar ohne Überlaufprobleme. Horizontales Scrollen der Tab-Leiste einführen.

**Akzeptanzkriterien:**
- [x] Tab-Leiste scrollt horizontal wenn Tabs nicht in die Breite passen
- [x] Aktiver Tab ist immer sichtbar (scroll-into-view) — `scrollIntoView` in beiden Komponenten
- [x] Kein visueller Overflow / kein Abschneiden von Tab-Labels
- [ ] Tablet (768–1023px): 2-Reihen-Darstellung oder kompakte Icons — **visueller Test ausstehend**
- [x] Kein funktionaler Abbau — alle Tabs erreichbar

**Technische Schritte:**
1. CSS: `overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch` auf Tab-Container
2. Aktiver Tab: `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })` bei Tab-Wechsel
3. `ClubEventDetail.tsx` und `PrivateEventDetail.tsx`: gemeinsamen Tab-Container extrahieren oder CSS-Regel angleichen

---

## Phase 2 — Feature-Reife (Sprint 3–5, KW 18–24)

> Ziel: Bestehende Module stabilisieren und abrunden. Neue Features auf solidem Fundament aufbauen.

### 2.1 🔒 Input-Validierung mit Zod (Backend) ✅
**Agent:** QS  
**Priorität:** HOCH  
**Abhängigkeiten:** 1.1 (CI muss laufen)  
**Status:** ABGESCHLOSSEN (2026-03-29)  
**Beschreibung:** Routen-Handler validieren Eingaben inkonsistent. `events.ts` und `clubs.ts` prüfen einzelne Felder manuell, aber nicht vollständig. Zod bietet typsichere Schema-Validierung und reduziert Security-Risiken.

**Akzeptanzkriterien:**
- [x] `zod` als Dependency installiert (v4)
- [x] Zod-Schema für alle POST/PATCH-Endpunkte in `events.ts`, `clubs.ts` und `auth.ts` — `src/schemas/index.ts`
- [x] Fehlerhafte Eingaben → aussagekräftige 400-Antwort mit Feldangabe — `src/middleware/validate.ts`
- [x] Keine sensiblen Daten (Passwörter, Tokens) in Fehlermeldungen
- [ ] `openapi.yaml` Schemas entsprechen den Zod-Schemas — **verschoben zu 2.4 (openapi.yaml Rebuild)**

**Technische Schritte:**
1. `npm install zod` in Backend
2. Schema für `POST /events` (title, date, Pflichtfelder)
3. Schema für `POST /clubs` (name, Länge)
4. Schema für `PATCH /clubs/:id/members/:userId` (role enum)
5. Middleware-Helper `validateBody(schema)` für Express

---

### 2.2 🔒 Unit-Tests für RSVP-Merge-Logik ✅
**Agent:** QS  
**Priorität:** HOCH  
**Abhängigkeiten:** 1.1 (CI muss Tests ausführen)  
**Status:** ABGESCHLOSSEN (2026-03-29) — 9/9 Tests grün  
**Beschreibung:** Die Funktion `mergeRsvpData` in `events.ts` ist kritische Business-Logik ohne Tests. AI-Agent-Refactorings könnten sie unbewusst brechen. Mindestens 5 Unit-Tests erforderlich.

**Akzeptanzkriterien:**
- [x] `vitest` als Test-Framework installiert (v4.1.2) + `vitest.config.ts`
- [x] Testdatei: `src/routes/__tests__/mergeRsvp.test.ts` (9 Tests)
- [x] Test: RSVP-Felder werden aus DB übernommen wenn `dbTime > inTime`
- [x] Test: RSVP-Felder bleiben vom Incoming wenn `inTime >= dbTime`
- [x] Test: Kein Token → kein Merge (graceful skip)
- [x] Test: Leere invitations-Arrays → keine Fehler
- [x] Test: Rollenhierarchie `hasMinRole` (owner ≥ vorstand ≥ mitglied) — `src/routes/__tests__/hasMinRole.test.ts` (11 Tests)
- [x] CI-Pipeline führt Tests aus (`npm test` in ci.yml)

---

### 2.3 🎨 URL Deep-Linking für Events und Räume ✅
**Agent:** FE  
**Priorität:** MITTEL  
**Abhängigkeiten:** keine  
**Status:** ABGESCHLOSSEN (2026-03-29) — Agent hat LoadEvent, LoadRoom, Room, RoomEditor überarbeitet  
**Beschreibung:** `SEO_IMPROVEMENT_PLAN.md` Phase 1: `Room.tsx` und `LoadEvent.tsx` lesen Event-IDs noch nicht vollständig aus URL-Params. Routen `/app/events/:eventId` und `/app/rooms/:roomId` existieren, aber Komponenten nutzen teilweise noch localStorage.

**Akzeptanzkriterien:**
- [x] `PrivateEventDetail.tsx`: `eventId` aus URL-Param vollständig verdrahtet
- [x] `LoadEvent.tsx`: Navigation nach Event-Erstellung nutzt `/app/events/:eventId`
- [x] `Room.tsx` / `LoadRoom.tsx`: `roomId` aus URL-Param löst Lade-Aktion aus
- [ ] Browser-Zurück-Taste funktioniert korrekt — **manueller Test ausstehend**
- [x] Direktaufruf einer Event-URL ohne vorheriges Navigieren → Event wird geladen
- [x] 404-Handling wenn Event/Raum nicht existiert

---

### 2.4 ⚙️ openapi.yaml vollständig machen ✅
**Agent:** BE (DD als Review)  
**Priorität:** MITTEL → **HOCH** (openapi.yaml wurde gelöscht — muss neu erstellt werden)  
**Abhängigkeiten:** 1.2 ✅  
**Status:** ABGESCHLOSSEN (2026-03-29) — openapi.yaml komplett neu erstellt mit allen Endpunkten (Auth, Events, Clubs, Public, Feedback, Admin, Webhooks).  
**Beschreibung:** `openapi.yaml` dokumentiert aktuell nur Auth-Endpunkte. Clubs-, Events- und Reservierungs-Routen fehlen komplett. AI-Agents können die API nicht zuverlässig ohne vollständige Spezifikation nutzen.

**Akzeptanzkriterien:**
- [x] Alle `clubs.ts`-Endpunkte dokumentiert (CRUD, Members, Invites, Events, Rooms)
- [x] Alle `events.ts`-Endpunkte dokumentiert
- [x] Alle `public.ts`-Endpunkte dokumentiert
- [x] Reservierungs-Endpunkte dokumentiert
- [x] Schemas für `Club`, `ClubEvent`, `ClubMember`, `Reservation`
- [x] Fehler-Responses (400, 401, 403, 404) konsistent dokumentiert
- [x] Zod-Schemas aus `src/schemas/index.ts` als SSOT nutzen

---

### 2.5 🧩 Club-Mitglieder Geburtstags-Notification ✅
**Agent:** BE (DI als Treiber)  
**Priorität:** NIEDRIG-MITTEL  
**Abhängigkeiten:** keine  
**Status:** ABGESCHLOSSEN (2026-03-29) — node-cron Daily-Job (07:00), birthdayNotificationEmail Template, Opt-out via `birthday_notifications_enabled` Spalte, Migration `20260329_club_birthday_notifications.sql`  
**Beschreibung:** `birth_date` ist seit Migration `20260310_add_birth_date.sql` vorhanden. Automatische E-Mail-Notification zum Geburtstag eines Mitglieds an den Vereinsvorstand — erster automatisierter Trigger.

**Akzeptanzkriterien:**
- [x] Scheduled Job (Cron via `node-cron` oder DB-Scheduler) läuft täglich
- [x] Findet alle Mitglieder die heute Geburtstag haben
- [x] Sendet E-Mail an owner/vorstand des Clubs via Mailgun
- [x] E-Mail-Template: Name, Alter, optionales Profilbild
- [x] Opt-out-Möglichkeit in Club-Einstellungen (Backend-Flag)
- [x] Keine Aktion wenn Mailgun nicht konfiguriert

---

### 2.6 🎨 RoomEditorMobile Touch-Interaktion ✅
**Agent:** FE  
**Priorität:** MITTEL  
**Abhängigkeiten:** 1.3 (Mobile-Navigation sollte zuerst stehen)  
**Status:** ABGESCHLOSSEN (2026-03-29) — Kompletter Touch-Rewrite: Pinch-Zoom (0.5x–3x), 1-Finger-Pan, Long-Press-Kontextmenü (Drehen/Löschen/Umbenennen/Verschieben), Drag-after-Activation, `touch-action: none` verhindert Browser-Konflikt.  
**Beschreibung:** `RoomEditorMobile.tsx` existiert, aber Pinch-Zoom und Long-Press sind noch nicht vollständig implementiert. Ohne diese ist das Kern-Feature auf Handy nicht verwendbar.

**Akzeptanzkriterien:**
- [x] Pinch-to-Zoom: Zwei-Finger-Geste ändert Zoom-Level des Canvas
- [x] Single-Tap auf Tisch: selektiert Tisch (wie Klick auf Desktop)
- [x] Long-Press auf Tisch: öffnet Kontext-Menü (Drehen, Löschen, Umbenennen)
- [x] Pan: Ein-Finger-Drag scrollt Canvas (nicht Tisch verschieben)
- [x] Drag ab Long-Press: Tisch verschieben nach Aktivierung
- [x] Kein Conflict zwischen Browser-Scroll und Canvas-Interaktion

---

## Phase 3 — Daten & Wachstum (Sprint 6–8, KW 25–32)

> Ziel: Daten-Layer aufbauen, Nutzungsmetriken erheben, datengetrieben priorisieren.

### 3.1 📊 Club Activity Log API + Admin-Dashboard ✅
**Agent:** DI (BE unterstützt)  
**Priorität:** HOCH  
**Abhängigkeiten:** 1.1 (CI)  
**Status:** ABGESCHLOSSEN (2026-03-29)  
**Beschreibung:** `club_activity_log` wird bereits befüllt (fire-and-forget in `clubs.ts`), aber es gibt keine Abfrage-API und kein Frontend-Dashboard. Vereins-Admins können keine Einblicke gewinnen.

**Akzeptanzkriterien:**
- [x] `GET /clubs/:clubId/activity?limit=50&before=<cursor>` — paginierte Abfrage
- [x] Filtern nach: Zeitraum, Aktion-Typ, User
- [x] Frontend: Neuer "Aktivität"-Tab in `ClubSettings.tsx`
- [x] Darstellung: Timeline-Liste mit Icon pro Aktion-Typ
- [x] Export als CSV möglich (Admin-only)
- [x] Datenschutz: Nur owner/vorstand kann Aktivitätslog sehen

---

### 3.2 📊 Selbst-gehostetes Analytics (Plausible)
**Agent:** DD (DI als Treiber)  
**Priorität:** MITTEL  
**Abhängigkeiten:** keine  
**Beschreibung:** Keine Nutzungsdaten = Priorisierung auf Basis von Annahmen. Plausible Analytics ist datenschutzkonform (DSGVO, kein Cookie-Banner), selbst-hostbar als Docker-Container.

**Akzeptanzkriterien:**
- [ ] Plausible-Container in `docker-compose.yml` ergänzt
- [ ] Script-Tag in `index.html` eingebunden
- [ ] Custom Events: `club_created`, `event_created`, `reservation_submitted`, `invite_opened`
- [ ] Dashboard erreichbar für Admins
- [ ] Kein Tracking von `/app/`-Sub-Pfaden mit personenbezogenen Daten
- [ ] `robots.txt` Plausible-Subdomain ausschließen

---

### 3.3 🔒 Penetration-Test kritischer Endpunkte ✅
**Agent:** QS  
**Priorität:** MITTEL  
**Abhängigkeiten:** 2.1 (Zod-Validierung sollte vorher stehen)  
**Status:** ABGESCHLOSSEN (2026-03-29)  
**Beschreibung:** OWASP Top 10 Review der kritischsten Endpunkte: RSVP-Mutation, Club-Member-Operations, Token-Authentifizierung für Reservierungen.

**Akzeptanzkriterien:**
- [x] IDOR-Check: kann User A Daten von Club von User B lesen/ändern?
- [x] Token-Replay-Angriff auf Reservierungs-Token: getestet
- [x] Rate-Limiting auf `/auth/login`, `/auth/forgot-password` verifiziert
- [x] JWT-Expiry korrekt geprüft (nicht nur Signatur)
- [x] Ergebnis: Sicherheits-Report als `docs/security-review-2026-Q2.md`

---

### 3.4 🧩 Private Event Modul-Aktivierung UI ✅
**Agent:** PA (FE umsetzt)  
**Priorität:** MITTEL  
**Abhängigkeiten:** keine  
**Status:** ABGESCHLOSSEN (2026-03-29) — War bereits in PrivateEventDetail.tsx implementiert  
**Beschreibung:** `PrivateEventDetail` zeigt 9 Tabs, davon nur aktive Module. Die Modul-Aktivierung ist backend-seitig vorhanden, aber es gibt kein UI um Module ein-/auszuschalten.

**Akzeptanzkriterien:**
- [x] "Übersicht"-Tab zeigt Modul-Schalter (Toggle für jedes Modul)
- [x] Toggle aktiviert/deaktiviert Modul sofort (API-Call + lokales Update)
- [x] Nur aktivierte Module erscheinen als Tabs
- [x] Deaktivierung eines Moduls löscht keine Daten (nur ausgeblendet)
- [x] Mobile: Modul-Schalter im Compact-View

---

## Phase 4 — Skalierung & Vision (Sprint 9+, ab KW 33)

> Längerfristige Vorhaben. Reihenfolge abhängig von Nutzungsdaten aus Phase 3.

### 4.1 🧩 PWA / Offline-Fähigkeit
**Agent:** FE (DD unterstützt)  
**Abhängig von:** 1.2 (Backend-Persistenz), 1.3 (Mobile-Navigation)  
**Beschreibung:** Service Worker für Kern-Features (Raumplan lesen, Gästeliste ansehen) im Offline-Modus. Basis für potenzielle App-Store-Veröffentlichung.

---

### 4.2 🧩 Multi-Club-Verwaltung
**Agent:** PA (BE umsetzt)  
**Abhängig von:** 2.3 (Deep-Linking)  
**Beschreibung:** Vollständige Multi-Club-UX: Club-Switcher, getrennte Dashboards. Frontend (Home.tsx, ClubDashboard) behandelt aktuell primär einen aktiven Club.

---

### 4.3 🧩 Kalender-Integration / iCal-Export
**Agent:** BE (FE UI)  
**Abhängig von:** keine  
**Beschreibung:** Club-Events als iCal-Feed exportierbar. Integration in Google Calendar, Apple Calendar, Outlook. Server-seitiger iCal-Generator pro Club (authentifiziert via Token).

---

### 4.4 📊 RSVP-Statistiken Dashboard
**Agent:** DI (FE umsetzt)  
**Abhängig von:** 3.1 (Activity Log API)  
**Beschreibung:** Auswertungs-Dashboard für Event-Veranstalter: Zusagen / Absagen / Ausstehend, Diät-Hinweise aggregiert, Zeitreihe der RSVP-Eingänge.

---

### 4.5 🚀 Staging-Environment
**Agent:** DD  
**Abhängig von:** 1.1 (CI)  
**Beschreibung:** Separates Deployment für Staging-Tests vor Produktion. Automatischer Deploy nach `main`-Merge auf Staging, manueller Trigger für Produktion.

---

### 4.6 🧩 Club-Mitglieder Selbst-Eintragung mit Profil-Wizard
**Agent:** FE (BE ergänzt)  
**Abhängig von:** `20260228_club_member_profiles.sql` (vorhanden)  
**Beschreibung:** Neues Mitglied tritt via Invite-Code bei → Wizard fordert Profil-Daten an. Reduziert manuellen Admin-Aufwand bei Neu-Mitgliedern.

---

## Prüfkriterien für Phase 1 (Definition of Done)

| Punkt | Prüfbar durch |
|---|---|
| CI schlägt bei TypeScript-Fehler an | Push eines kaputten Commits → Pipeline rot |
| Club-Räume nach Browser-Wechsel vorhanden | Raum auf Desktop speichern, auf Handy öffnen |
| Mobile-Nutzer erreichen alle App-Bereiche | Test auf 375px (Chrome DevTools) ohne Top-Nav |
| RSVP-Merge hat ≥ 5 Unit-Tests | `npm test` läuft grün |

---

---

## Auswertung Sitzung 2026-03-29

### Abgeschlossen
| Task | Agent | Verifiziert |
|---|---|---|
| 1.1 CI Build-Gate | DD | ✅ Workflows erstellt, lokaler Build grün |
| 1.2 Backend Club-Rooms | BE | ✅ Migration + 4 CRUD-Routes + Frontend-API-Umstellung |
| 1.3 Mobile Bottom-Nav | FE | ✅ BottomNav.tsx + AppLayout integriert |
| 1.4 Tab-Overflow | FE | ✅ scrollIntoView in beiden Detail-Komponenten |
| 2.1 Zod-Validierung | QS | ✅ 15 Schemas, validate-Middleware auf auth/clubs/events |
| 2.2 RSVP Unit-Tests | QS | ✅ 9/9 Tests grün (vitest) |
| 2.3 URL Deep-Linking | FE | ✅ LoadEvent/LoadRoom/Room/RoomEditor überarbeitet |
| 2.4 openapi.yaml | BE | ✅ Komplett neu erstellt — alle Routen dokumentiert |
| 2.5 Birthday Notification | BE | ✅ node-cron Daily-Job, E-Mail-Template, Opt-out-Flag |
| 2.6 RoomEditorMobile Touch | FE | ✅ Pinch-Zoom, Pan, Long-Press, Drag, Context-Menu |
| 3.1 Activity Log API + Dashboard | DI/BE | ✅ Cursor-Pagination, Filter, CSV-Export, Timeline-UI |
| 3.3 Security Review | QS | ✅ OWASP Top 10, 2 Fixes, Report in docs/ |
| 3.4 Modul-Aktivierung UI | PA/FE | ✅ Bereits vollständig in PrivateEventDetail.tsx implementiert |

### Offen / Probleme
| Task | Problem | Nächster Schritt |
|---|---|---|
| 1.1 | smoke-test.ps1 nicht in CI | Optional — braucht Postgres-Service in GH Actions |
| 1.4 | Tablet 2-Reihen-Layout nicht verifiziert | Visueller Test nötig |
| 2.3 | Browser-Back nicht manuell getestet | Manueller Test im Browser |

### Geänderte Dateien (kein Git-Push bisher)

**Backend-Table-Manager:**
- Neue: `ci.yml`, `20260401_club_rooms.sql`, `validate.ts`, `schemas/index.ts`, `mergeRsvp.test.ts`, `hasMinRole.test.ts`, `birthdayNotification.test.ts`, `vitest.config.ts`, `openapi.yaml`, `birthdayCron.ts`, `20260329_club_birthday_notifications.sql`
- Geändert: `clubs.ts` (+ export hasMinRole/ROLE_LEVEL, + birthday_notifications_enabled, + Activity-Endpoint Rewrite: Cursor-Pagination, Filter, CSV-Export, Rollenbeschränkung), `events.ts` (+ Logo-Extension-Validation), `admin.ts` (+ ILIKE Wildcard Escaping), `auth.ts`, `index.ts` (+ startBirthdayCron), `emailTemplates.ts` (+ birthdayNotificationEmail), `schemas/index.ts` (+ birthday field), `package.json` (+ node-cron), `README.md` (CI-Badge), `db/schema.sql` (+ birthday_notifications_enabled)
- Neue (3.3): `docs/security-review-2026-Q2.md`

**Table-Manager:**
- Neue: `ci.yml`, `ROADMAP.md`, `BottomNav.tsx`, `BottomTabBar.tsx`, `EventTabContext.tsx`, `BottomSheet.tsx`, `RoomEditorMobile.tsx`, `RoomMobile.tsx`, `MiniMap.tsx`, `TablePickerSheet.tsx`, `mobile.css`, `tablet.css`, `useDeviceType.ts`
- Geändert: 30+ Komponenten (App.tsx, AppLayout.tsx, ClubEventDetail.tsx, PrivateEventDetail.tsx, Home.tsx, Room.tsx, RoomEditor.tsx, LoadEvent.tsx, LoadRoom.tsx, etc.)
- Geändert: `README.md` (CI-Badge), `ROADMAP.md` (Statusupdates 2.1–2.6, 3.1), `RoomEditorMobile.tsx` (kompletter Touch-Rewrite)
- Geändert (3.1): `clubApi.ts` (ActivityQuery, ActivityPage, getClubActivityCsvUrl), `ClubSettings.tsx` (Aktivitätsprotokoll-Sektion mit Filter + Timeline + CSV), `ClubDashboard.tsx` (neues API-Format), `types/club.ts` (ACTIVITY_LABELS erweitert, ACTIVITY_ICONS neu)

---

*Letzte Aktualisierung: 2026-03-29 | Nächste Sitzung: KW 15*
