# UTF-8 Umlaute - Setup und Troubleshooting

## Status
✅ **UTF-8 Umlaute sind konfiguriert und funktionieren korrekt**

## Implementierte Lösungen

### 1. **Vite Middleware (vite.config.ts)**
Eine dedizierte Middleware wurde hinzugefügt, die bei jedem HTTP-Response automatisch `charset=utf-8` zu HTML und JSON setzt:

```typescript
// Middleware to ensure UTF-8 charset in all responses
function utf8CharsetMiddleware() { ... }
```

**What it does:**
- Stellt sicher, dass alle HTML und JSON Responses mit `Content-Type: text/html; charset=utf-8` serviert werden
- Verhindert Encoding-Probleme bei der Anzeige von deutschen Umlauten (ä, ö, ü, Ä, Ö, Ü, ß)

### 2. **HTML Meta Charset (index.html)**
```html
<html lang="de">
  <head>
    <meta charset="utf-8" />
    ...
  </head>
</html>
```

**What it does:**
- Informiert den Browser dass die HTML Seite in UTF-8 encodiert ist
- Dies ist die erste Meta-Declaration im `<head>` Tag (als best practice)

### 3. **React Helmet Provider (main.tsx)**
```typescript
<HelmetProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</HelmetProvider>
```

**What it does:**
- Ermöglicht Dynamic Meta Tags Management in React-Komponenten
- Sichert correct charset für SSR und verschiedene Seiten

## Betroffene Komponenten mit Umlauten

Die folgenden neuen Seiten verwenden deutsche Umlaute:
- ✅ `src/components/landing/LandingPage.tsx` - Hauptlandingpage
- ✅ `src/components/landing/WeddingLandingPage.tsx` - Hochzeitsspezifische Landingpage
- ✅ `src/components/landing/ClubLandingPage.tsx` - Vereinsspezifische Landingpage
- ✅ `src/components/shared/TiptapEditor.tsx` - Editor Toolbar mit deutschen Labels
- ✅ `src/components/shared/Home.tsx` - Dashboard mit "Willkommen", "Gäste", etc.
- ✅ `src/components/reservation/*.tsx` - Reservierungsseiten
- ✅ `src/components/club/ClubMembers.tsx` - "Eigentümer", "Mitglieder"
- ✅ `src/components/club/ClubDashboard.tsx` - Dashboard mit Umlauten
- ✅ `src/types/club.ts` - ROLE_LABELS mit "Eigentümer" (FIXED)

## Best Practices für zukünftige Entwicklung

### ✅ DO
1. **UTF-8 Encoding verwenden**: Stelle sicher dass VS Code/Editor auf UTF-8 Encoding eingestellt ist
   - VS Code: Unten rechts "UTF-8" anzeigen
   
2. **Umlaute direkt eingeben**: Tippe deutsche Umlaute direkt ein (ä, ö, ü, Ä, Ö, Ü, ß)
   ```jsx
   <title>Sitzplan für Hochzeiten & Events erstellen</title>
   <p>Gäste optimal platzieren</p>
   ```

3. **React Helmet für Meta-Tags verwenden**: Für neue Seiten
   ```jsx
   <Helmet>
     <title>Sitzplan für Hochzeiten & Events erstellen - PlatzPilot</title>
     <meta name="description" content="Erstellen Sie den perfekten Sitzplan..." />
   </Helmet>
   ```

### ❌ DON'T
1. **HTML Entity encoding vermeiden**: ❌ `&auml;` statt `ä`
   - Die Middleware sorgt bereits für korrekte Encoding

2. **Escape Sequences nicht verwenden**: ❌ `\\u00e4` statt `ä`
   - Direkte Umlaute sind besser lesbar und funktionieren

3. **Alternative Umlaute nicht verwenden**: ❌ `ae` statt `ä`
   - Die UTF-8 Middleware macht echte Umlaute möglich

## Testing

Überprüfe dass Umlaute korrekt angezeigt werden:

1. **Dev Mode starten**:
   ```bash
   npm run dev
   ```

2. **Seiten im Browser öffnen**:
   - http://localhost:5173/
   - http://localhost:5173/sitzplan-hochzeit
   - http://localhost:5173/sitzplan-verein

3. **Inspector überprüfen**: DevTools → Network → index.html (sollte `charset=utf-8` Header haben)

## Troubleshooting

### Problem: Umlaute werden als `?` oder `ï¿½` angezeigt

**Lösung 1**: Starten Sie npm dev neu
```bash
npm run dev
```

**Lösung 2**: Überprüfe dass die Datei mit UTF-8 gespeichert ist
- VS Code: Unten rechts "UTF-8" anzeigen
- Falls "UTF-8 with BOM": → Click → "UTF-8" (without BOM)
- Falls "Windows-1252": → Click → "UTF-8"

**Lösung 3**: Encoding-Fixer ausführen
```bash
node scripts/fix-encoding.js
```
Dieses Skript repariert automatisch beschädigte Umlaute in TypeScript/React Dateien.

**Lösung 4**: Clear Browser Cache
- DevTools → Application → Storage → Clear site data
- CTRL+Shift+DELETE → Clear all (incognito window)

**Lösung 5**: Commit und VS Code neu starten
- Git: `git add .` und `git commit`
- VS Code: `Ctrl+Shift+P` → Developer: Reload Window

### Problem: "Eigentümer" wird als "Eigentämer" oder "Eigent³mer" angezeigt

**Root Cause**: Die Datei wurde nicht in UTF-8 gespeichert (wahrscheinlich Windows-1252)

**Lösung**: 
1. Öffne `src/types/club.ts`
2. Unten rechts auf "UTF-8 with BOM" oder "Windows-1252" klicken
3. Wähle "UTF-8" (ohne BOM)
4. Datei wird automatisch neu gespeichert
5. `npm run dev` neu starten

## Production Build

Bei `npm run build`:
- Vite generiert optimierte HTML/JS/CSS
- Die Middleware ist nur im Dev Mode aktiv
- Browser wird die charset vom Vite Server HTTP Header verwenden

Für Production (z.B. nginx):
```nginx
# /etc/nginx/mime.types
text/html utf-8 html htm;
application/json utf-8 json;
```

## Referenzen

- [MDN: meta charset](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
- [UTF-8 RFC 3629](https://tools.ietf.org/html/rfc3629)
- [React Helmet Async](https://github.com/staylor/react-helmet-async)
