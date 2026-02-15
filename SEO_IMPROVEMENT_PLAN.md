# SEO & Nutzerfreundlichkeits-Verbesserungen für PlatzPilot

## ✅ Durchgeführte Änderungen

### 1. SEO-Foundation
- ✅ `react-helmet-async` installiert für dynamische Meta-Tags
- ✅ Individuelle `<title>` und `<meta description>` für jede Landing Page
- ✅ `robots.txt` erstellt (erlaubt Indexierung von Marketing-Seiten, blockt `/app/` und `/admin`)

### 2. Routing-Struktur
- ✅ Klare Trennung: Öffentliche Seiten vs. App-Bereich
- ✅ `PublicLayout` für Marketing-Seiten (mit Navigation + Footer)
- ✅ `AppLayout` für geschützte App-Seiten (mit User-Menu)
- ✅ Legacy-Routen redirecten zu neuer Struktur

### 3. SEO Landing Pages
- ✅ `/sitzplan-verein` - Fokus: Vereine, ToGo-Bestellungen, Events
- ✅ `/sitzplan-hochzeit` - Fokus: Hochzeiten, Tischplanung, Gästelisten

---

## 🚀 Empfohlene nächste Schritte

### **Phase 1: URL-Struktur & Deep Linking (PRIORITÄT HOCH)**

#### Problem
Aktuell verwenden Komponenten wie `Room.tsx` und `LoadEvent.tsx` localStorage, um den aktuellen Event/Room zu speichern. URLs wie `/app/events/:eventId` sind definiert, aber die Komponenten lesen die IDs noch nicht aus.

#### Lösung
**1.1 Room.tsx: URL-Parameter einlesen**
```tsx
// In Room.tsx
import { useParams } from 'react-router-dom'

export default function Room() {
  const { eventId } = useParams()  // ← Liest :eventId aus der URL
  
  useEffect(() => {
    if (eventId) {
      // Event aus Backend/Storage laden basierend auf ID
      loadEventById(eventId)
    }
  }, [eventId])
}
```

**1.2 LoadEvent.tsx: Navigation mit Event-ID**
```tsx
// Statt: navigate('/room')
// Neu:
navigate(`/app/events/${event.id}`)
```

**Vorteil:**
- ✅ Nutzer können Event-URLs teilen/bookmarken
- ✅ Bessere UX (Browser-Zurück funktioniert korrekt)
- ✅ Einfacheres Debugging (URL zeigt aktuellen State)

---

### **Phase 2: SEO-Optimierung (PRIORITÄT MITTEL)**

#### 2.1 Open Graph & Social Media Tags
Füge in jede Landing Page hinzu:
```tsx
<Helmet>
  {/* Existing tags */}
  <meta property="og:title" content="Sitzplan für Hochzeiten - PlatzPilot" />
  <meta property="og:description" content="..." />
  <meta property="og:image" content="https://platzpilot.de/og-image-wedding.jpg" />
  <meta property="og:url" content="https://platzpilot.de/sitzplan-hochzeit" />
  <meta name="twitter:card" content="summary_large_image" />
</Helmet>
```

**Erstelle Bilder:**
- `public/og-image-wedding.jpg` (1200x630px)
- `public/og-image-club.jpg` (1200x630px)

#### 2.2 Sitemap erstellen
Erstelle `public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://platzpilot.de/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://platzpilot.de/sitzplan-hochzeit</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://platzpilot.de/sitzplan-verein</loc>
    <priority>0.9</priority>
  </url>
</urlset>
```

Aktualisiere `robots.txt`:
```txt
Sitemap: https://platzpilot.de/sitemap.xml
```

#### 2.3 Structured Data (Schema.org)
Füge JSON-LD zu Landing Pages hinzu:
```tsx
<Helmet>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "PlatzPilot",
      "applicationCategory": "BusinessApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      },
      "description": "Sitzplan-Software für Hochzeiten und Events"
    })}
  </script>
</Helmet>
```

---

### **Phase 3: User Experience (PRIORITÄT HOCH)**

#### 3.1 Login-Redirect verbessern
Aktuell: Nach Login wird immer zu `/app` weitergeleitet.  
**Problem:** Wenn ein Nutzer auf `/sitzplan-hochzeit` ist und sich registriert, sollte er direkt zur App gelangen.

**Lösung in Login.tsx:**
```tsx
import { useLocation, useNavigate } from 'react-router-dom'

function Login() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const handleLogin = async () => {
    // ... login logic
    const from = location.state?.from?.pathname || '/app'
    navigate(from, { replace: true })
  }
}
```

**In PublicLayout.tsx Link anpassen:**
```tsx
<Link to="/login" state={{ from: { pathname: '/app' } }}>
  Anmelden
</Link>
```

#### 3.2 Loading States
Füge Skeleton Screens oder Spinner hinzu:
```tsx
// In Room.tsx, LoadEvent.tsx etc.
{loading && <div className="spinner">Lädt...</div>}
```

#### 3.3 Error Boundaries erweitern
Füge ein Nutzerfreundliches Fehler-UI hinzu (aktuell gibt es schon ErrorBoundary.tsx, aber mit minimalem UI).

---

### **Phase 4: Performance (PRIORITÄT NIEDRIG, aber wichtig für SEO)**

#### 4.1 Code Splitting
Lazy-load App-Routen (die öffentlichen Seiten sollten sofort laden):
```tsx
const Room = lazy(() => import('./components/Room'))
const AdminPanel = lazy(() => import('./components/AdminPanel'))
```

#### 4.2 Image Optimization
- Konvertiere Bilder zu WebP
- Nutze responsive Images (`srcset`)

#### 4.3 Lighthouse Score
Teste mit Google Lighthouse:
```bash
npm run build
npm run preview
# Öffne Chrome DevTools > Lighthouse
```

**Ziele:**
- Performance: >90
- SEO: 100
- Accessibility: >90

---

### **Phase 5: Analytics & Conversion Tracking (PRIORITÄT MITTEL)**

#### 5.1 Google Analytics 4 einbinden
```tsx
// In main.tsx
import ReactGA from 'react-ga4'

if (import.meta.env.PROD) {
  ReactGA.initialize('G-XXXXXXXXXX')
}
```

#### 5.2 Conversion Events tracken
- Registrierung abgeschlossen
- Event erstellt
- Sitzplan exportiert

#### 5.3 Heatmaps (optional)
- Hotjar oder Microsoft Clarity einbinden
- Verstehen, wo Nutzer klicken/abbrechen

---

### **Phase 6: Content-Erweiterung (PRIORITÄT NIEDRIG, langfristig wichtig)**

#### 6.1 Weitere Landing Pages
- `/sitzplan-erstellen` (generisch, hohe Suchvolumen)
- `/tischplan-erstellen`
- `/gaesteliste-import`
- `/features`
- `/preise`
- `/hilfe` oder `/docs`

**Warum?**
Jede Seite mit Keywords = mehr Google-Traffic.

#### 6.2 Blog (langfristig)
- `/blog/sitzplan-hochzeit-tipps`
- `/blog/vereinsfest-planen`

**Vorteil:** Backlinks, mehr Suchbegriffe abdecken.

---

## 📊 Technische Metriken (aktuell & Ziel)

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| Lighthouse SEO | ? | 100 |
| Lighthouse Performance | ? | >90 |
| Lighthouse Accessibility | ? | >90 |
| First Contentful Paint | ? | <1.5s |
| Time to Interactive | ? | <3s |
| Google-Index | 0 Seiten | 3+ Seiten |

---

## 🛠️ Entwickler-Setup

### Testing
```bash
# Build für Production
npm run build

# Preview Production Build
npm run preview

# Teste URLs:
# http://localhost:4173/
# http://localhost:4173/sitzplan-hochzeit
# http://localhost:4173/sitzplan-verein
# http://localhost:4173/app (should redirect to /login)
# http://localhost:4173/robots.txt
```

### SEO-Check
1. **Google Search Console** einrichten (nach Deployment)
2. **Google PageSpeed Insights** testen
3. **Meta-Tags prüfen:** https://metatags.io/

---

## 🎯 Priorisierung (Was sofort umsetzen?)

### Sofort (Heute/Morgen):
1. ✅ **URL-Parameter in Room.tsx einlesen** (Deep Linking)
2. ✅ **Login-Redirect verbessern**
3. ✅ **Sitemap.xml erstellen**

### Diese Woche:
4. Open Graph Images erstellen
5. Structured Data (JSON-LD) hinzufügen
6. Lighthouse-Test durchführen

### Nächster Monat:
7. Google Analytics einrichten
8. Weitere Landing Pages (`/sitzplan-erstellen`, `/features`)
9. Code Splitting

---

## 📝 Checkliste vor Launch

- [ ] Alle Meta-Tags auf allen Seiten vorhanden
- [ ] robots.txt erreichbar unter `/robots.txt`
- [ ] sitemap.xml erreichbar unter `/sitemap.xml`
- [ ] Open Graph Images (1200x630px) für Social Media
- [ ] Lighthouse SEO Score = 100
- [ ] 404-Seite erstellen (aktuell nur Redirect zu `/`)
- [ ] Impressum & Datenschutz-Links im Footer
- [ ] HTTPS aktiviert (für Production)
- [ ] Google Search Console verifiziert

---

**Erstellt:** 2026-02-11  
**Status:** In Bearbeitung  
**Nächster Review:** Nach Phase 1 Implementierung
