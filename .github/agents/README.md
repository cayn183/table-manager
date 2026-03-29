# Custom Agents

Eigene Copilot-Agents für das Frontend-Projekt.

## Verwendung

Agents werden automatisch in der Copilot Chat Agent-Auswahl angezeigt.
Neue Agents als `<name>.agent.md` Dateien in diesem Ordner anlegen.

## Vorlage

```markdown
---
name: "MeinAgent"
description: "Beschreibung wann dieser Agent verwendet werden soll"
tools: [search, read, edit, execute]
---
Du bist ein Spezialist für ...
```

## Verfügbare Tool-Aliase

| Alias     | Zweck                        |
|-----------|------------------------------|
| `execute` | Shell-Befehle ausführen      |
| `read`    | Dateien lesen                |
| `edit`    | Dateien bearbeiten           |
| `search`  | Dateien/Text durchsuchen     |
| `agent`   | Subagents aufrufen           |
| `web`     | URLs abrufen / Web-Suche     |
| `todo`    | Aufgabenlisten verwalten     |
