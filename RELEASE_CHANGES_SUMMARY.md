Kurzfassung der in diesem Chat vorgenommenen Änderungen

Backend (Backend-Table-Manager/src/routes/admin.ts):
- Performance-Endpunkt robuster gemacht (Try/Catch um einzelne Queries)
- Cache-Hit-Ratio Berechnung vereinfacht und gegen Division-by-zero abgesichert
- Unused Indexes Query hinzugefügt (Top ungenutzte Indexes)
- Table/Index-Stats und Cache-Metriken defensiv abgefragt
- Pool-Statistik: echte pg-Pool-Internals (_clients, _idle, _queue) verwendet und max connections ausgelesen

Frontend (Table-Manager/src/components/shared/AdminPanel.tsx):
- Performance-Monitoring UI erweitert:
  - Connection-Pool Details (Aktive, Idle, Wartende, Max Limit)
  - Cache Hit Ratio Anzeige, robust gegenüber null/String-Werten
  - Unused Indexes Warnung
  - Slow Query Übersicht
  - Tabellen-Statistiken: Hinweis-Box zur Interpretation (Dead Rows Hervorhebung >10%)
  - Index-Nutzung: Hinweis-Box was gut/schlecht ist
- Fehlerbehebungen: Number-Konvertierung für cache ratio vor toFixed

Sonstiges:
- RELEASE_GUIDE.md: kurzer Trigger-Guide ergänzt (leerer Commit zum Auslösen des dev-push-workflows)

Empfohlenes Commit- und Push-Verhalten

1) Dateien zur Staging-Area hinzufügen und committen:

```bash
git add -A
git commit -m "feat: kurze Beschreibung deiner Änderung"
```

2) Auf `dev` pushen und Workflow auslösen:

```bash
git push origin dev
```

3) Prüfen: GitHub Actions → `dev-push.yml` prüfen, Footer-Version und backend/package.json Version verifizieren.

Wenn du willst, kann ich die Commit-Nachricht präziser formulieren oder die Änderungen in mehrere kleinere Commits aufteilen.