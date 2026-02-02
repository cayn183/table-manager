# Release Guide

Diese Anleitung beschreibt den korrekten Ablauf für Development-Pushes und Production-Releases.

---

## 🔷 Development Workflow (Branch: `dev`)

### Schritte zum Pushen auf `dev`

1. **Entwickle Features/Fixes lokal auf dem `dev` Branch**
   ```powershell
   git checkout dev
   git pull origin dev
   # ... deine Änderungen ...
   ```

2. **Committe deine Änderungen**
   ```powershell
   git add .
   git commit -m "feat: deine neue Funktion"
   ```

3. **Pushe auf `dev`**
   ```powershell
   git push origin dev
   ```

### Was passiert automatisch? (Workflow: `dev-push.yml`)

Nach dem Push auf `dev` wird **automatisch** folgendes ausgeführt:

✅ **Version-Update:**
- `src/components/Footer.tsx` → `version: 'dev'`
- `backend/package.json` → `version: 0.0.0-dev`
- Release Date wird auf aktuelles Datum gesetzt

✅ **Git Commit:**
- Änderungen werden automatisch committed mit `[skip ci]`
- Verhindert endlose Workflow-Loops

✅ **Docker Build & Push:**
- Build-Args: `BUILD_VERSION=dev`, `BUILD_SHA=<short-sha>`
- Docker Tags: 
  - `ghcr.io/cayn183/table-manager:dev`
  - `ghcr.io/cayn183/table-manager:dev-<short-sha>`
  - `ghcr.io/cayn183/table-manager:dev-latest`

### Wichtige Hinweise

- ⚠️ **KEINE manuellen Version-Änderungen** auf `dev` nötig
- ⚠️ Footer und Backend-Version werden **immer** auf `dev` gesetzt
- ✅ Der SHA-Hash wird automatisch im Footer angezeigt (z.B. "dev (a1b2c3d)")

---

## 🚀 Production Release Workflow (Branch: `main`)

### Voraussetzungen

- Alle Features sind auf `dev` getestet
- `dev` Branch ist stabil und bereit für Production

### Schritte für ein Release

#### 1️⃣ Version in `package.json` erhöhen (auf `dev`)

```powershell
# Auf dev Branch
git checkout dev
git pull origin dev

# Version erhöhen (z.B. von 0.6.3 auf 0.6.4)
npm version patch   # für Bugfixes (0.6.3 → 0.6.4)
npm version minor   # für neue Features (0.6.3 → 0.7.0)
npm version major   # für Breaking Changes (0.6.3 → 1.0.0)

# Oder manuell in package.json ändern
```

#### 2️⃣ CHANGELOG.md aktualisieren

Öffne `CHANGELOG.md` und füge unter `## [Unreleased]` die Änderungen ein:

```markdown
## [Unreleased]

### Added
- Neue Feature X
- Neue Feature Y

### Changed
- Verbesserung Z

### Fixed
- Bug-Fix A
```

**Wichtig:** Die Version-Nummer wird **automatisch** vom Release-Workflow hinzugefügt!

#### 3️⃣ Änderungen committen und pushen

```powershell
git add package.json CHANGELOG.md
git commit -m "chore: prepare release v0.6.4"
git push origin dev
```

#### 4️⃣ Pull Request von `dev` nach `main` erstellen

1. Gehe zu GitHub
2. Erstelle einen Pull Request: `dev` → `main`
3. Titel: `Release v0.6.4`
4. Beschreibung: Kurze Zusammenfassung der Änderungen
5. **Review & Merge** den PR

### Was passiert automatisch? (Workflow: `release.yml`)

Nach dem **Merge** auf `main` wird **automatisch** folgendes ausgeführt:

✅ **Version-Update:**
- `src/components/Footer.tsx` → `version: '0.6.4'` (aus package.json)
- `package.json` → Version bestätigt
- `backend/package.json` → `version: 0.6.4`
- Release Date auf aktuelles Datum

✅ **CHANGELOG Update:**
- Fügt Versions-Header hinzu: `## [0.6.4] - 2026-02-02`
- Falls bereits vorhanden, aktualisiert nur das Datum

✅ **Git Tag:**
- Erstellt Tag: `v0.6.4`
- Pusht Tag zu GitHub

✅ **GitHub Release:**
- Erstellt automatisch ein GitHub Release
- Release Notes werden aus `CHANGELOG.md` extrahiert
- Release ist öffentlich sichtbar

✅ **Docker Build & Push:**
- Build-Args: `BUILD_VERSION=0.6.4`, `BUILD_SHA=<short-sha>`
- Docker Tags:
  - `ghcr.io/cayn183/table-manager:v0.6.4`
  - `ghcr.io/cayn183/table-manager:0.6.4`
  - `ghcr.io/cayn183/table-manager:latest`
  - `ghcr.io/cayn183/table-manager:sha-<short-sha>`

---

## 📋 Manueller Release (Alternative)

Falls du einen Release **ohne PR** erstellen möchtest:

1. Gehe zu GitHub → Actions
2. Wähle Workflow: `Release to Main`
3. Klicke auf `Run workflow`
4. Gib die Version ein (z.B. `0.6.4`)
5. Der Workflow läuft wie oben beschrieben

---

## 🔍 Workflow-Übersicht

| Branch | Trigger | Version | Docker Tags | Workflow |
|--------|---------|---------|-------------|----------|
| `dev` | Push | `dev` | `dev`, `dev-<sha>`, `dev-latest` | `dev-push.yml` |
| `main` | PR Merge | `x.y.z` | `vx.y.z`, `x.y.z`, `latest`, `sha-<sha>` | `release.yml` |

---

## ⚠️ Wichtige Regeln

### ✅ DO's
- Arbeite **immer** auf `dev` für neue Features
- Erhöhe die Version in `package.json` **vor** dem Merge zu `main`
- Aktualisiere `CHANGELOG.md` mit allen Änderungen
- Teste auf `dev` bevor du auf `main` merged

### ❌ DON'Ts
- **NIE** direkt auf `main` pushen (außer Hotfixes)
- **NIE** manuell Tags erstellen (Workflow macht das)
- **NIE** Version in Footer.tsx manuell ändern (Workflow macht das)
- **NIE** Docker Images manuell bauen/pushen (Workflow macht das)

---

## 🛠️ Troubleshooting

### Problem: Workflow läuft nicht nach Push auf `dev`
- Überprüfe GitHub Actions Tab
- Stelle sicher, dass Workflows aktiviert sind
- Prüfe `.github/workflows/dev-push.yml`

### Problem: Release-Workflow erstellt keinen Tag
- Überprüfe, ob der PR **gemerged** wurde (nicht nur geschlossen)
- Prüfe GitHub Actions Logs
- Stelle sicher, dass `GITHUB_TOKEN` Permissions hat

### Problem: Docker Push schlägt fehl
- Überprüfe GHCR Permissions
- Stelle sicher, dass der Runner eingeloggt ist
- Prüfe Docker Buildx Setup

---

## 📚 Weiterführende Informationen

- [GitHub Actions Workflows](.github/workflows/)
- [CHANGELOG Format](https://keepachangelog.com/de/1.0.0/)
- [Semantic Versioning](https://semver.org/lang/de/)
