# Mobile-Konzept: Table-Manager

> **Ziel:** Tablet- und Handy-Ansicht für den Table-Manager  
> **Erstellt:** 27.03.2026  

---

## 1. Breakpoint-Strategie

| Geräteklasse | Breakpoint | Beispielgeräte | CSS-Klasse |
|---|---|---|---|
| **Desktop** | `≥ 1024px` | Laptops, Monitore | – (Standard) |
| **Tablet** | `768px – 1023px` | iPad, Galaxy Tab, Surface | `.tablet` |
| **Handy** | `≤ 767px` | iPhone, Galaxy S, Pixel | `.mobile` |

### CSS-Variablen (neu)

```css
:root {
  --breakpoint-mobile: 767px;
  --breakpoint-tablet: 1023px;
}
```

### Media Queries (einheitlich)

```css
/* Tablet */
@media (max-width: 1023px) { ... }

/* Handy */
@media (max-width: 767px) { ... }

/* Touch-Geräte (bereits vorhanden) */
@media (hover: none) and (pointer: coarse) { ... }
```

### React Hook: `useDeviceType()`

```tsx
// src/utils/useDeviceType.ts
type DeviceType = 'desktop' | 'tablet' | 'mobile'

function useDeviceType(): DeviceType {
  // matchMedia-basiert, kein resize-Listener nötig
  // Returns 'mobile' | 'tablet' | 'desktop'
}
```

---

## 2. Betroffene Bereiche & Anpassungen

### 2.1 Layout-Ebene

| Bereich | Desktop | Tablet | Handy |
|---|---|---|---|
| **Navigation** | Horizontale Navbar | Horizontale Navbar (kompakt) | Bottom-Navigation (Tab-Bar) |
| **Sidebar** | Links, 560px | Einklappbar/Overlay | Sheet von unten (Bottom-Sheet) |
| **Modals** | Zentriert, max-width | Zentriert, 90vw | Fullscreen |
| **Context-Menus** | Rechtsklick | Long-Press → Overlay | Long-Press → Action-Sheet |

#### Navigation: Bottom-Tab-Bar (Handy)

Auf dem Handy wird die obere Navbar durch eine fixierte Bottom-Tab-Bar ersetzt:

```
┌─────────────────────────┐
│  Inhalt                 │
│                         │
│                         │
├─────────────────────────┤
│ 🏠  📂  🪑  👥  👤    │  ← Bottom-Bar
│ Home Events Raum Club Me│
└─────────────────────────┘
```

- 5 Tabs: Home, Events, Raum, Club, Profil
- Aktiver Tab: Lila Akzentfarbe
- `safe-area-inset-bottom` für iPhones mit Home-Indikator

---

### 2.2 Home-Dashboard

| Desktop | Tablet | Handy |
|---|---|---|
| 2-Spalten Action-Grid | 2-Spalten (kompakter) | 1-Spalte, Cards gestapelt |
| Welcome-Banner groß | Banner mittel | Banner kompakt, 1 Zeile |

Keine funktionale Vereinfachung nötig – reines CSS-Responsive.

---

### 2.3 Room (Sitzplan-Ansicht) – **Vereinfacht auf Handy**

Dies ist das komplexeste Modul. Auf dem Handy muss die Interaktion grundlegend vereinfacht werden.

#### Desktop (Ist-Zustand)
```
┌──────────────────────────────────────┐
│ Sidebar (560px)  │  Grid (28×20)    │ Undo/Redo
│ ┌──────────────┐ │  ┌────────────┐  │ ┌──┐
│ │ + Familie    │ │  │ Tisch 1    │  │ │↩ │
│ │ ✨ Auto-Zuw. │ │  │ ████████   │  │ │↪ │
│ │ 📥 Import   │ │  │            │  │ │──│
│ ├──────────────┤ │  │ Tisch 2    │  │ │🔄│
│ │ Unzugewiesen │ │  │ ██████     │  │ └──┘
│ │ [Gruppe 1]   │ │  └────────────┘  │
│ │ [Gruppe 2]   │ │                   │
│ │ ...          │ │                   │
│ └──────────────┘ │                   │
│ 💾 🖨️           │                   │
└──────────────────────────────────────┘
```

#### Tablet (Angepasst)
```
┌──────────────────────────────────────┐
│       Grid (28×20, zoombar)          │
│  ┌────────────────────────────────┐  │
│  │ Tisch 1  ████████             │  │
│  │ Tisch 2  ██████               │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  [📋 Gruppen] [🪑 Zugewiesen]       │  ← Tabs
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │Grp 1   │ │Grp 2   │ │Grp 3   │   │  ← Horizontal scroll
│  └────────┘ └────────┘ └────────┘   │
│  ✨ Auto  📥 Import  💾  🖨️         │
└──────────────────────────────────────┘
```

**Tablet-Änderungen:**
- Grid oben, Gruppenleiste unten (wie bereits bei 1024px-Breakpoint)
- Drag & Drop funktioniert weiterhin (Touch-Drag unterstützt)
- Pinch-to-Zoom auf dem Grid
- Sidebar wird zum Bottom-Panel

#### Handy – **Vereinfachte Ansicht** ⭐

```
┌─────────────────────┐
│  📍 Kartenansicht    │  ← Header mit Ansicht-Toggle
├─────────────────────┤
│                     │
│    Mini-Map         │  ← Tische als farbige Blöcke
│    (Übersicht)      │     Grün = frei, Gelb = teilweise
│    [T1] [T2] [T3]  │     Rot = voll
│    [T4] [T5]       │
│                     │
├─────────────────────┤
│  Unzugewiesen (12)  │  ← Scrollbare Liste
│  ┌─────────────────┐│
│  │ 👨‍👩‍👧 Müller (4)  ││  ← Tap → Tisch-Auswahl
│  │ 14:30 · Notiz   ││
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │ 👨‍👩‍👧 Schmidt (2) ││
│  │ 15:00           ││
│  └─────────────────┘│
├─────────────────────┤
│ [+ Anlegen] [✨Auto]│  ← Aktion-Buttons
│        [💾 Speichern]│
└─────────────────────┘
```

**Handy-Vereinfachungen:**
1. **Kein Drag & Drop** → Stattdessen: **Tap-to-Assign**
   - Tap auf Gruppe → Tisch-Auswahl-Sheet öffnet sich
   - Tische als große Kacheln mit Kapazitätsanzeige
   - Tap auf Tisch → Gruppe wird automatisch platziert (Best-Fit)
2. **Mini-Map statt volles Grid**
   - Tische als vereinfachte farbige Blöcke (nicht einzelne Zellen)
   - Ampel-Farben: Grün (frei), Gelb (teilweise belegt), Rot (voll)
   - Tap auf Tisch → Detail-Popup mit Gästeliste
3. **Keine Rotation/Mirror-Steuerung**
   - Automatische Platzierung wählt beste Rotation
4. **Keine Multi-Select** → Einzelaktionen
5. **Keine Keyboard-Shortcuts** (nicht relevant auf Touch)
6. **Kein Undo/Redo in der UI** (Platz sparen), aber intern weiterhin verfügbar
7. **Context-Menu → Action-Sheet**
   - Long-Press auf Gruppe → Sheet von unten mit Aktionen

---

### 2.4 RoomEditor (Raum-Design) – **Vereinfacht auf Handy**

#### Desktop (Ist-Zustand)
```
┌────────────────────────────────────┐
│ Sidebar (320px) │ Grid (28×20)     │
│ 🏷️ Raumname    │ [Tisch1] [Tisch2]│
│ Größe: [4]     │                   │
│ [+ Tisch]      │ [Tisch3]          │
│ [Ansicht def.] │                   │
│ [💾 Speichern]  │                   │
│ [↩ Undo]       │                   │
└────────────────────────────────────┘
```

#### Handy – **Vereinfachte Ansicht**
```
┌─────────────────────┐
│  🏷️ Mein Raum       │  ← Header
├─────────────────────┤
│                     │
│   Grid (zoombar)    │  ← Pinch-to-Zoom
│   [T1] [T2]        │
│   [T3]              │  ← Tap = Auswählen
│                     │     Long-Press = Verschieben
├─────────────────────┤
│ Tischgröße: [─ 4 +] │  ← Stepper statt freier Input
│ [+ Tisch hinzufügen]│
│ [💾 Speichern]       │
└─────────────────────┘
```

**Handy-Vereinfachungen:**
1. **Tap statt Drag** für Tisch-Auswahl
2. **Long-Press + Drag** für Verschieben
3. **Doppeltap** für Tisch rotieren
4. **Swipe-Left** auf Tisch → Löschen
5. Sidebar-Steuerung → Bottom-Bar / Floating Action Button

---

### 2.5 Events & Listen

| Desktop | Tablet | Handy |
|---|---|---|
| Tabelle/Grid-Ansicht | Tabelle (kompakter) | Karten-Liste |
| Badges inline | Badges inline | Badges unter Titel |
| Hover-Details | Hover-Details | Tap → Expand |

---

### 2.6 Club-Bereich

| Desktop | Tablet | Handy |
|---|---|---|
| Dashboard mit Grid | Dashboard (2-Spalten) | Dashboard (1-Spalte) |
| Mitgliederliste | Liste (kompakt) | Karten |
| Settings: Formular | Formular | Formular (fullscreen) |

---

### 2.7 Reservierungsseite (Öffentlich)

Bereits weitgehend mobil-optimiert (`max-width: 520px`, Touch-Buttons).

**Noch zu tun:**
- Counter-Buttons größer auf Handy (48px statt 36px)
- Fullscreen-Modal für Menüauswahl
- Sticky "Absenden"-Button am untern Rand

---

## 3. Technische Umsetzung

### 3.1 Architektur-Entscheidung: CSS-First + Conditional Rendering

Kein separater Mobile-Branch oder eigene Routen. Stattdessen:

```
Stufe 1: CSS Media Queries (Layout, Spacing, Visibility)
Stufe 2: useDeviceType() Hook für bedingte Logik
Stufe 3: Vereinfachte Komponenten-Varianten (nur wo nötig)
```

### 3.2 Neue Dateien

```
src/
  utils/
    useDeviceType.ts          ← Hook: 'desktop' | 'tablet' | 'mobile'
  components/
    room/
      RoomMobile.tsx           ← Vereinfachte Sitzplan-Ansicht (Handy)
      RoomEditorMobile.tsx     ← Vereinfachter Raum-Editor (Handy)
      TablePickerSheet.tsx     ← Bottom-Sheet Tisch-Auswahl
      MiniMap.tsx              ← Vereinfachte Tisch-Übersicht
    layout/
      BottomTabBar.tsx         ← Mobile Navigation
      BottomSheet.tsx          ← Wiederverwendbares Bottom-Sheet
      MobileHeader.tsx         ← Kompakter Header für Handy
  styles/
    mobile.css                 ← Alle mobilen Overrides
    tablet.css                 ← Alle Tablet-Overrides
```

### 3.3 Komponenten-Routing (bedingt)

```tsx
// In Room-Route:
const device = useDeviceType()

if (device === 'mobile') return <RoomMobile {...props} />
return <Room {...props} />  // Desktop + Tablet
```

Room und RoomEditor bekommen jeweils eine eigene Mobile-Variante.  
Alle anderen Komponenten werden rein per CSS angepasst.

### 3.4 Gesten-Handling (Mobile)

```
Tap           → Auswählen / Zuweisen
Long-Press    → Context-Menu (Action-Sheet)
Doppeltap     → Rotieren (RoomEditor)
Pinch         → Zoom (Grid-Ansicht)
Swipe links   → Löschen-Aktion
Pull-to-Refresh → Daten neu laden
```

Keine zusätzliche Library nötig – native Touch-Events + `pointer`-Events reichen.

### 3.5 CSS-Strategie: Mobile Overrides

Die bestehenden Media Queries werden **beibehalten und erweitert**.  
Neue Breakpoints werden konsolidiert:

```css
/* === BESTEHEND (beibehalten) === */
@media (max-width: 1400px) { /* Large Desktop Adjustments */ }
@media (max-width: 1200px) { /* Medium Desktop */ }

/* === NEU: Tablet === */
@media (max-width: 1023px) {
  /* Sidebar → Bottom-Panel */
  /* Grid → Full-Width */
  /* Nav → Kompakt */
}

/* === NEU: Handy === */
@media (max-width: 767px) {
  /* Bottom-Tab-Bar sichtbar */
  /* Obere Nav versteckt */
  /* Cards statt Tabellen */
  /* Modals → Fullscreen */
  /* Sidebar → Hidden (Bottom-Sheet bei Bedarf) */
}

/* === BESTEHEND (beibehalten) === */
@media (hover: none) and (pointer: coarse) {
  /* Touch-Targets 44px+ */
}
```

---

## 4. Umsetzungs-Reihenfolge (Phasen)

### Phase 1: Foundation (Layout & Navigation)
- [ ] `useDeviceType()` Hook implementieren
- [ ] `mobile.css` und `tablet.css` erstellen
- [ ] `BottomTabBar.tsx` für Handy-Navigation
- [ ] `AppLayout.tsx` anpassen (bedingte Navigation)
- [ ] `BottomSheet.tsx` Basis-Komponente
- [ ] Bestehende Modals responsive machen (Fullscreen auf Handy)

### Phase 2: Einfache Module responsive machen (CSS-only)
- [ ] Home-Dashboard: 1-Spalte auf Handy
- [ ] Events-Liste: Karten-Ansicht auf Handy
- [ ] Club-Dashboard: 1-Spalte auf Handy
- [ ] Club-Mitglieder: Karten-Ansicht
- [ ] Profil-Seite: Fullscreen-Formular
- [ ] Reservierungsseite: Feintuning

### Phase 3: Vereinfachte Module (Room & RoomEditor)
- [ ] `MiniMap.tsx` – Tisch-Übersicht für Handy
- [ ] `TablePickerSheet.tsx` – Tap-to-Assign Bottom-Sheet
- [ ] `RoomMobile.tsx` – Vereinfachte Sitzplan-Ansicht
- [ ] `RoomEditorMobile.tsx` – Vereinfachter Editor
- [ ] Pinch-to-Zoom auf Grid-Ansichten
- [ ] Gesten-Integration (Long-Press, Swipe)

### Phase 4: Polish & Testing
- [ ] Touch-Feedback-Animationen (Ripple, Haptics)
- [ ] Safe-Area-Inset für iPhone-Notch
- [ ] Orientation-Lock Hinweise (Landscape empfohlen für Sitzplan)
- [ ] Performance: Lazy-Loading für Mobile-Varianten
- [ ] PWA-Optimierung (schon `site.webmanifest` vorhanden)

---

## 5. Testing: Mobile-Emulator in VS Code

### Installiert: "Mobile Preview - Phone & Tablet Simulator"

**Nutzung:**
1. Dev-Server starten: `npm run dev` (läuft auf `localhost:5173`)
2. In VS Code: `Ctrl+Shift+P` → "Mobile Preview: Open"
3. URL eingeben: `http://localhost:5173`
4. Gerät auswählen:
   - **iPhone 14 Pro** (393 × 852px) – Handy-Test
   - **iPad Air** (820 × 1180px) – Tablet-Test
   - **Galaxy S23** (360 × 780px) – Android-Handy
5. Live-Reload funktioniert automatisch mit Vite HMR

### Alternative: Chrome DevTools Device Mode
- F12 → Toggle Device Toolbar (Ctrl+Shift+M)
- Geräte-Presets auswählen
- Touch-Simulation aktivieren

---

## 6. Zusammenfassung

| Modul | Tablet | Handy | Aufwand |
|---|---|---|---|
| Layout/Nav | CSS + BottomTabBar | BottomTabBar + MobileHeader | Mittel |
| Home | CSS (2→2 Spalten) | CSS (2→1 Spalte) | Gering |
| Events | CSS (kompakter) | CSS (Karten) | Gering |
| Club | CSS (kompakter) | CSS (1-Spalte) | Gering |
| **Room** | CSS + Touch-Drag | **Neue Komponente** (RoomMobile) | **Hoch** |
| **RoomEditor** | CSS + Touch | **Neue Komponente** (RoomEditorMobile) | **Hoch** |
| Reservierung | CSS (Feintuning) | CSS (Feintuning) | Gering |
| Profil | CSS | CSS (Fullscreen) | Gering |

**Kernprinzip:** So viel wie möglich über CSS, eigene Komponenten nur dort wo die Interaktion fundamental anders sein muss (Room, RoomEditor).
