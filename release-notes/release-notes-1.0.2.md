# Release v1.0.2 - Keyboard Shortcuts & Redo/Undo mit Action Panel

## What's New

### Added
- **Umfassende Keyboard-Shortcuts** für beide Seiten (`/room` und `/roomeditor`):
  - `ESC`: Bricht Ziehen ab und setzt Element auf ursprüngliche Position zurück
  - `Ctrl+Z`: Macht letzte Aktion rückgängig (max. 5 Schritte)
  - `Ctrl+Y` / `Ctrl+Shift+Z`: Wiederholt rückgängig gemachte Aktionen
  - `Ctrl+S`: In `/room` stilles Speichern, in `/roomeditor` Speichern-Dialog öffnen
  - `R` (nur während Ziehen): Familie/Tisch drehen
  - `T` (nur während Ziehen): Familie spiegeln

- **Redo/Undo-Funktionalität mit visuellen Indikatoren**:
  - Getrennte Undo- und Redo-Stacks mit je max. 5 Schritten
  - Schrittzähler im UI zeigt verfügbare Steps an
  - Neue Aktion nach Undo löscht Redo-Stack (Standard-Verhalten)

- **Schmale Action-Spalte rechts in `/room`** mit 4 Icon-Buttons:
  - **Zurück** (↩): Rückgängig mit Schrittzähler
  - **Vorwärts** (↪): Wiederholen mit Schrittzähler
  - **Drehen** (↻): Familie während Ziehen drehen
  - **Spiegeln** (⇔): Familie während Ziehen spiegeln
  - Buttons sind kontextabhängig aktiviert/deaktiviert (Drehen/Spiegeln nur beim Ziehen)

- **Erweiterte Help-Modal** mit aktualisierten Tastatur-Referenzen für beide Seiten

### Changed
- Aus Seitenleiste entfernter Undo-Button (redundant mit Action-Spalte)
- Help-Modal-System mit Tab-basierter Navigation (RoomEditor-Hilfe hinzugefügt)
- Verbesserte Seitenleisten-Layouts für bessere Konsistenz

### Fixed
- Refactoring der Keyboard-Shortcut-Handler zur Vermeidung von Duplikaten

## User Benefits
- **Schnellere Workflows**: Keyboard-Shortcuts für Power-User
- **Fehlertoleranz**: Undo/Redo für schnelle Korrektionen
- **Ergonomie**: Visuelle Action-Spalte ohne Seitenleisten-Ablenkung
- **Flexibilität**: Mehrere Wege für gleiche Aktion (Button, Shortcut, Tastatur)

## Technical Details
- Version: `1.0.2`
- Release Date: `2026-02-23`
- Highlights: Umfassende Keyboard-Navigation, Undo/Redo mit beiden Stacks, kompakte Action-UI
