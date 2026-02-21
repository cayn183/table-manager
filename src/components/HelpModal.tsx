import React from 'react'
import { useHelp } from './HelpContext'
import type { HelpTab } from './HelpContext'

const TABS: { key: HelpTab; label: string; icon: string }[] = [
  { key: 'home',    label: 'Startseite',      icon: '🏠' },
  { key: 'room',    label: 'Tischplaner',     icon: '🪑' },
  { key: 'events',  label: 'Events laden',    icon: '📂' },
  { key: 'rooms',   label: 'Räume laden',     icon: '🏠' },
  { key: 'togo',    label: 'ToGo-Bestellungen', icon: '🥡' },
  { key: 'profile', label: 'Profil',          icon: '👤' },
]

// ─── Per-tab help content ───────────────────────────────────────────────────

function HelpHome() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Willkommen bei PlatzPilot" color="#eff6ff" borderColor="#bfdbfe" headColor="#1e3a8a">
        PlatzPilot hilft dir dabei, Sitzpläne zu erstellen, Gäste zu verwalten und ToGo-Bestellungen zu koordinieren.
        Wähle auf der Startseite eine der Kacheln, um loszulegen.
      </Section>
      <Section step="2" title="Veranstaltung erstellen oder laden">
        Eine <strong>Veranstaltung</strong> enthält deinen Sitzplan mit Tischen und Gästen.
        Erstelle eine neue Veranstaltung oder lade eine gespeicherte über <strong>📂 Events laden</strong>.
      </Section>
      <Section step="3" title="Raum verwalten">
        Ein <strong>Raum</strong> enthält das Grundlayout (Tischpositionen ohne Gäste).
        Lade oder erstelle einen Raum über <strong>🏠 Räume laden</strong>.
      </Section>
      <Section step="4" title="ToGo-Bestellungen">
        Unter <strong>🥡 ToGo-Bestellungen</strong> koordinierst du Essensbestellungen mit Zeitfenstern, Menükarte und CSV-Import.
      </Section>
    </div>
  )
}

function HelpRoom() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Tisch hinzufügen">
        Klicke auf <strong>Tisch hinzufügen</strong> in der Werkzeugleiste. Wähle die Tischform und die Anzahl der Plätze.
        Tische lassen sich mit der Maus frei verschieben und drehen.
      </Section>
      <Section step="2" title="Gäste zuweisen">
        Klicke auf einen freien Sitzplatz, um einen Gast zuzuweisen. Du kannst Gäste auch per CSV importieren
        (Spalten: <strong>Name</strong>, optional <strong>Tisch</strong> und <strong>Platz</strong>).
      </Section>
      <Section step="3" title="Tische bearbeiten">
        Einen Tisch anklicken, um ihn auszuwählen. Im Eigenschaftspanel rechts kannst du
        Name, Größe und Rotation ändern. Mit <strong>Entf</strong> oder dem Papierkorb-Icon wird der Tisch gelöscht.
      </Section>
      <Section step="4" title="Speichern & Drucken" color="#f0fdf4" borderColor="#bbf7d0" headColor="#065f46">
        Über <strong>💾 Speichern</strong> wird die Veranstaltung gespeichert. Mit <strong>🖨️ Drucken</strong>
        öffnet sich die Druckvorschau. Der Sitzplan kann als PDF exportiert werden.
      </Section>
      <Section step="5" title="CSV-Import">
        Über den CSV-Import-Button lassen sich Gäste aus einer Tabelle einfügen.
        Pflichtfelder: <strong>Name</strong>. Optional: <strong>Tisch</strong>, <strong>Platz</strong>, <strong>Notiz</strong>.
      </Section>
    </div>
  )
}

function HelpEvents() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Veranstaltung laden">
        Alle gespeicherten Veranstaltungen werden in der Liste aufgeführt.
        Klicke auf einen Eintrag, um ihn zu laden und direkt in den Tischplaner zu wechseln.
      </Section>
      <Section step="2" title="Veranstaltung löschen">
        Über das <strong>🗑️</strong>-Icon neben einem Eintrag kann die Veranstaltung dauerhaft gelöscht werden.
        Diese Aktion ist unwiderruflich.
      </Section>
      <Section step="3" title="Neue Veranstaltung">
        Auf der Startseite unter <strong>Neues Event erstellen</strong> legst du eine neue Veranstaltung an,
        gibst ihr einen Namen, ein Datum und optionale Uhrzeit.
        Anschließend kannst du einen vorhandenen Raum als Basis laden.
      </Section>
    </div>
  )
}

function HelpRooms() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Raum laden">
        Alle gespeicherten Raum-Layouts werden in der Liste angezeigt.
        Klicke auf einen Raum, um ihn in den Raumeditor zu laden.
      </Section>
      <Section step="2" title="Raum als Vorlage für Veranstaltungen">
        Ein Raum-Layout enthält die Tischpositionen ohne Gästezuweisungen.
        Beim Anlegen einer neuen Veranstaltung kannst du einen gespeicherten Raum als Vorlage auswählen.
      </Section>
      <Section step="3" title="Raum löschen">
        Über das <strong>🗑️</strong>-Icon neben einem Eintrag kann der Raum dauerhaft gelöscht werden.
      </Section>
      <Section step="4" title="Neuen Raum erstellen">
        Über <strong>Neuen Raum erstellen</strong> auf der Startseite startest du mit einem leeren Tischplan-Layout.
      </Section>
    </div>
  )
}

function HelpToGo() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Speisekarte anlegen">
        Über <strong>⚙️ Speisekarte</strong> Speisen mit Preis anlegen.
        Die Speisennamen werden später für den CSV-Import genutzt.
      </Section>
      <Section step="2" title="Bestellungen erfassen">
        Bestellungen manuell über <strong>Neue Bestellung</strong> oder per CSV-Import erfassen.
      </Section>
      <Section step="3" title="CSV-Import" color="#fff7ed" borderColor="#fed7aa" headColor="#9a3412">
        CSV mit folgenden Spalten: <strong>Name</strong>, <strong>Zeit</strong>, Mengen pro Speise
        (Spaltenname = Speisename) und <strong>Bemerkung</strong> am Ende.{' '}
        <strong>Trennzeichen wird automatisch erkannt</strong> (Semikolon empfohlen).
        Alternativ eine Spalte <strong>Bestellung/Items</strong> (z.B.{' '}
        <em>"2x Currywurst; 1x Schnitzel"</em>). Namen mit Komma sind problemlos
        (z.B. <em>"Mueller, Klaus"</em>).
      </Section>
      <Section step="4" title="Drucken & Export">
        Nach dem Erfassen kannst du die Liste drucken oder als CSV exportieren.
      </Section>
      <Section step="5" title="Zeitfenster">
        Bestellungen werden automatisch in Zeitfenster gruppiert. Zeitfenster ohne Uhrzeit
        erscheinen am Ende unter <em>Ohne Zeitangabe</em>.
      </Section>
    </div>
  )
}

function HelpProfile() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Profildaten ändern">
        Unter <strong>Profil</strong> kannst du deinen Anzeigenamen und deine E-Mail-Adresse ändern.
        Nach einer E-Mail-Änderung erhältst du eine Bestätigungs-E-Mail.
      </Section>
      <Section step="2" title="Passwort ändern">
        Über <strong>Passwort ändern</strong> kannst du dein aktuelles Passwort durch ein neues ersetzen.
        Mindestlänge: 8 Zeichen.
      </Section>
      <Section step="3" title="E-Mail-Verifizierung">
        Falls deine E-Mail noch nicht bestätigt wurde, erscheint oben ein gelber Banner.
        Klicke auf <strong>Bestätigungs-E-Mail erneut senden</strong>, um die Mail nochmal zu erhalten.
      </Section>
      <Section step="4" title="Konto löschen" color="#fef2f2" borderColor="#fecaca" headColor="#991b1b">
        Ganz unten im Profil findest du die Option zum <strong>Konto löschen</strong>.
        Alle gespeicherten Daten werden unwiderruflich entfernt.
      </Section>
    </div>
  )
}

// ─── Reusable section card ──────────────────────────────────────────────────

interface SectionProps {
  step: string
  title: string
  color?: string
  borderColor?: string
  headColor?: string
  children: React.ReactNode
}

function Section({ step, title, color = '#f8fafc', borderColor = '#e2e8f0', headColor = '#64748b', children }: SectionProps) {
  return (
    <div style={{ padding: '12px 14px', background: color, border: `1px solid ${borderColor}`, borderRadius: 10 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', color: headColor, fontWeight: 700, marginBottom: 6 }}>
        {step}. {title}
      </div>
      <div style={{ color: '#1e293b', fontSize: 14 }}>{children}</div>
    </div>
  )
}

// ─── Main Modal Component ───────────────────────────────────────────────────

export default function HelpModal() {
  const { isOpen, activeTab, closeHelp, openHelp } = useHelp()

  if (!isOpen) return null

  const tabContent: Record<HelpTab, React.ReactNode> = {
    home:    <HelpHome />,
    room:    <HelpRoom />,
    events:  <HelpEvents />,
    rooms:   <HelpRooms />,
    togo:    <HelpToGo />,
    profile: <HelpProfile />,
  }

  return (
    <div
      onClick={closeHelp}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          width: 820,
          maxWidth: '95vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 22px',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            📖 Anleitung
          </h3>
          <button
            onClick={closeHelp}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
            aria-label="Schließen"
          >×</button>
        </div>

        {/* Body: sidebar + content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Vertical Tab Sidebar */}
          <div style={{
            width: 190,
            flexShrink: 0,
            background: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            overflowY: 'auto',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            {TABS.map(tab => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => openHelp(tab.key)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: 'none',
                    borderRadius: 8,
                    background: active ? '#667eea' : 'transparent',
                    color: active ? 'white' : '#475569',
                    fontWeight: active ? 700 : 400,
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.12s, color 0.12s',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: 22, overflowY: 'auto' }}>
            {tabContent[activeTab]}
          </div>
        </div>
      </div>
    </div>
  )
}
