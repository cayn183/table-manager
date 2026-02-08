# Release v0.9.0 - ToGo Print & Release Prep

## What's New

### Added
- **ToGo: A4-Druckansicht (hochkant)**: Vollständige Druckausgabe für ToGo-Bestellungen im DIN-A4 Hochformat mit automatischer Seitenteilung.

### Changed
- **Kompakteres Drucklayout**: Header reduziert, Namen mit Zeitstempel (z. B. "Name (HH:MM Uhr)") und Bestellpositionen in einer Spalte, Items inline getrennt mit " | ".
- **Umsatz & Stand in Fußzeile**: Umsatz- und Standinformationen wurden in die Fußzeile verschoben.
- **Preisformatierung**: Ganze Euro-Werte werden ohne ",00" ausgegeben (z. B. "8€" statt "8,00€").
- **Schriftgrößen reduziert**: Name/Preis: 12px, Items: 11px, Bemerkungen: 10px für kompaktere Listen.

### Fixed
- **Verbesserte Seitenumbruch-Logik**: Heuristiken zur Abschätzung von Überschriften, Bestellkarten und Bemerkungen überarbeitet, damit Seitenumbrüche seltener und präziser erfolgen.

## Technical Details
- Version: `0.9.0`
- Release Date: `2026-02-08`
- Highlights: ToGo-Druckansicht (A4, hochkant) mit kompakter Darstellung und robusterer Pagination; vorbereitende Versionsbumps im Frontend und Backend; erweiterte Release-Notes im Changelog.
