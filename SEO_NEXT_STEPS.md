## SEO Checklist für PlatzPilot nach Fixes

### ✅ Was bereits implementiert ist:

1. **Statische HTML-Generierung (SSG)**
   - Prerender.js erstellt separate index.html für jede Route
   - Meta-Tags sind korrekt injiziert
   - Canonical URLs sind gesetzt

2. **robots.txt & Sitemap**
   - `/public/robots.txt` erlaubt Crawling
   - `/public/sitemap.xml` listet alle 4 Landing Pages

3. **Build-Prozess**
   - `npm run build` erstellt und validiert alle SEO-Dateien

### 📝 Manuelle Maßnahmen (Du musst diese durchführen):

1. **Google Search Console aufrufen**
   - https://search.google.com/search-console
   - "Abrufen wie Googlebot" verwenden für beide Seiten:
     - https://platzpilot.de/sitzplan-hochzeit
     - https://platzpilot.de/gaesteliste
   - "URL inspizieren" für beide URLs
   - "In Index aufnehmen" klicken

2. **Sitemap neu einreichen**
   - Google Search Console → Sitemaps
   - https://platzpilot.de/sitemap.xml neu einreichen

3. **Redeploy durchführen**
   - Frontend neu bauen und deployen mit neuem Build-Skript
   - Stellen Sie sicher, dass `npm run build` zuerst lokal erfolgreich ist

### 🔍 Überprüfen ob es funktioniert:

1. **curl/wget Test**
   ```bash
   # Prüfe ob richtige Meta-Tags serviert werden:
   curl -I https://platzpilot.de/sitzplan-hochzeit
   # Sollte den korrekten <title> in den HTML-Headers haben
   ```

2. **Google Lighthouse**
   - PageSpeed Insights für beide Landing Pages
   - Prüfe "Mobile Friendly" Status

3. **Warte 1-2 Wochen**
   - Google braucht Zeit zum Re-Crawl
   - Monitoring in Search Console

### ⚠️ Bekannte Einschränkungen:

**Vite Preview Server (aktuelles Setup)**
- Ist für Development/Testing gedacht, nicht für Production
- Empfehlung für Production: Nginx + static file serving
  - Würde garantieren, dass die vorgenerierten HTML-Dateien serviert werden
  - Bessere Performance als Vite Preview

Möchtest du nginx-Config implementieren oder erst mal abwarten, ob die aktuelle Setup funktioniert?
