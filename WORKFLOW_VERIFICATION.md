# Workflow & Version Verification

## ✅ Status: All Workflows Corrected and Ready

### Workflow Configuration Summary

#### 1. **docker-publish.yml** ✅ VERIFIED
- **Trigger:** Push to `main`, `dev`, and tags matching `v*`
- **Purpose:** Build and push Docker images to GHCR
- **Status:** Working correctly
- **Tags Applied:**
  - `main` branch → `latest`, `dev`, `prod`
  - `dev` branch → `dev`, `development`
  - `v*` tags → version-specific tags

#### 2. **version-release.yml** ✅ FIXED
- **Trigger:** Push to tags matching `v*` only
- **Purpose:** Create GitHub Release on version tags
- **Status:** Corrected from broken main-branch trigger
- **Actions:**
  - Extract version from tag
  - Create GitHub Release with changelog reference

#### 3. **sync-version.yml** ✅ CREATED
- **Trigger:** Push to `dev` with changes to `package.json`
- **Purpose:** Auto-sync version to Footer component and CHANGELOG
- **Status:** New workflow, ready to use
- **Actions:**
  - Extract version from package.json
  - Update src/components/Footer.tsx release date
  - Add/update CHANGELOG.md entry
  - Auto-commit with [skip ci] flag

---

## Versioning Strategy

### Development Branch (dev)
```
Version Display: "dev (COMMIT_SHA)"
Example: "dev (c69c76a)"
Source: src/components/Footer.tsx with BUILD_SHA env var
Trigger: sync-version.yml on package.json changes
```

### Main Branch & Releases
```
Version Display: "SEMANTIC_VERSION (COMMIT_SHA)"
Example: "0.6.3 (8e63c17)"
Source: package.json (single source of truth)
Release: Manual version bump → git tag → version-release.yml
```

---

## Complete Workflow Flow

### Flow 1: Development (Automatic)
```
1. Commit code to dev branch
2. docker-publish.yml triggers → builds Docker image tagged 'dev'
3. If package.json changes → sync-version.yml triggers → updates Footer + CHANGELOG + commits
```

### Flow 2: Release (Manual + Automatic)
```
1. Developer bumps version in package.json on dev
2. sync-version.yml updates Footer.tsx and CHANGELOG.md
3. Merge dev → main (via GitHub PR)
4. Create git tag: git tag -a v0.6.4 && git push origin v0.6.4
5. version-release.yml triggers on tag → creates GitHub Release
6. docker-publish.yml builds image tagged with version number
```

---

## Files Modified

| File | Change | Reason |
|------|--------|--------|
| .github/workflows/version-release.yml | Recreated clean | Removed corrupted old logic, kept simple tag-based trigger |
| .github/workflows/sync-version.yml | Created new | Auto-sync version changes from package.json to Footer + CHANGELOG |
| .github/workflows/docker-publish.yml | Added back BUILD_SHA arg | Restore commit SHA injection for Docker builds |

---

## Git State

```
main:     7cc5dcd (1 commit ahead of origin/main)
origin/main: 45e30a2 (no sync-version workflow yet)
dev:      a8e0612 (synced with origin/dev)
origin/dev: a8e0612 (workflows up-to-date)
```

### Next Step: Merge dev → main
```powershell
git checkout main
git merge dev
git push origin main
```

After main is updated:
- Main branch will have both workflows (docker-publish + version-release)
- Dev branch has all three workflows (docker-publish + sync-version + version-release)
- Protected branch rules only allow merge commits, no direct pushes ✓

---

## Testing the Workflow

### Test 1: Dev Docker Build
```
1. Commit to dev
2. Check GitHub Actions → docker-publish runs
3. Docker image available as ghcr.io/cayn183/table-manager:dev
```

### Test 2: Version Sync on Dev
```
1. Edit package.json version on dev
2. Commit change
3. sync-version.yml auto-updates:
   - src/components/Footer.tsx release date
   - CHANGELOG.md with new version entry
   - Auto-commits with [skip ci]
```

### Test 3: Release Creation
```
1. Merge dev → main (includes version updates)
2. Tag: git tag -a v0.6.4 && git push origin v0.6.4
3. version-release.yml creates GitHub Release
4. docker-publish.yml builds images tagged v0.6.4, latest, prod
```

---

## Critical Notes

- ✅ Version-release only triggers on `v*` tags (protected branch safe)
- ✅ Sync-version uses `[skip ci]` to prevent recursion
- ✅ All workflows include proper permissions (`contents: write`)
- ✅ Docker builds on all channels (main, dev, tags)
- ✅ Main branch protected: merges only, no direct pushes
