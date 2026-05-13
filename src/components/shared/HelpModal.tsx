import React from 'react'
import { useHelp } from './HelpContext'
import type { HelpTab } from './HelpContext'
import { useDeviceType } from '../../utils/useDeviceType'

const TABS: { key: HelpTab; label: string; icon: string }[] = [
  { key: 'home',          label: 'Startseite',        icon: '🏠' },
  { key: 'privateEvents', label: 'Private Events',    icon: '🎉' },
  { key: 'clubModules',   label: 'Vereinsmodule',     icon: '🏆' },
  { key: 'room',          label: 'Tischplaner',       icon: '🪑' },
  { key: 'roomeditor',    label: 'Raum bearbeiten',   icon: '✏️' },
  { key: 'togo',          label: 'ToGo-Bestellungen', icon: '🥡' },
  { key: 'profile',       label: 'Profil',            icon: '👤' },
]

// ─── Per-tab help content ───────────────────────────────────────────────────

function HelpHome() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Willkommen bei PlatzPilot" color="#eff6ff" borderColor="#bfdbfe" headColor="#1e3a8a">
        PlatzPilot hilft dir dabei, Events zu planen – ob privat oder im Verein.
        Erstelle Sitzpläne, verwalte Gästelisten, plane Menüs und koordiniere den gesamten Ablauf.
      </Section>
      <Section step="2" title="Private Events">
        Unter <strong>🎉 Private Events</strong> planst du persönliche Veranstaltungen wie Hochzeiten,
        Geburtstage, Jubiläen oder Firmenfeiern. Du wählst aus verschiedenen Modulen (Raumplanung,
        Menü, Budget, Checkliste u.v.m.) genau die Funktionen, die du brauchst.
      </Section>
      <Section step="3" title="Vereinsmodule">
        Unter <strong>🏆 Vereinsmodule</strong> verwaltest du Vereine mit Mitgliedern, Rollen und
        Vereins-Events. Lade Mitglieder per Einladungscode ein, plane Vereinsfeste oder Versammlungen
        und nutze Sitzplanung, Speiseplanung und Reservierungen.
      </Section>
      <Section step="4" title="Weitere Funktionen">
        <strong>🪑 Tischplaner</strong> – Gäste per Drag &amp; Drop den Tischen zuweisen.<br />
        <strong>✏️ Raumplanung</strong> – Tisch-Layouts direkt im Event erstellen oder aus Vorlagen übernehmen.<br />
        <strong>🥡 ToGo-Bestellungen</strong> – Außer-Haus-Bestellungen mit Zeitfenstern verwalten.<br />
        <strong>👤 Profil</strong> – Konto, Passwort und E-Mail verwalten.
      </Section>
    </div>
  )
}

/* ─── Private Events Module ──────────────────────────────────────────────── */

function HelpPrivateEvents() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Event erstellen" color="#eff6ff" borderColor="#bfdbfe" headColor="#1e3a8a">
        Auf der Startseite über <strong>✨ Neues Event anlegen</strong> startest du den Assistenten.
        Im ersten Schritt gibst du Titel, Datum und Uhrzeit ein und wählst eine Vorlage:<br />
        💒 <strong>Hochzeit</strong> · 🎂 <strong>Geburtstag</strong> · 🎉 <strong>Jubiläum</strong> · 🏢 <strong>Firmenfeier</strong><br />
        Die Vorlage aktiviert automatisch passende Module, die du im zweiten Schritt anpassen kannst.
      </Section>

      <Section step="2" title="📊 Übersicht">
        Die Übersicht zeigt alle wichtigen Infos auf einen Blick: Titel, Datum, Uhrzeit und
        Schnellzugriff-Karten für alle aktivierten Module. Klicke auf eine Karte, um direkt
        zum jeweiligen Modul zu springen. Hier kannst du auch Module nachträglich aktivieren oder deaktivieren.
      </Section>

      <Section step="3" title="🏠 Raumplanung">
        Erstelle das Grundlayout deiner Veranstaltung: Platziere Tische auf einer Zeichenfläche,
        bestimme Form, Größe und Position. Das Layout dient als Basis für die Tischplanung.
        Du kannst auch persönliche Raum-Vorlagen direkt in diesem Modul laden.
      </Section>

      <Section step="4" title="🪑 Tischplanung">
        Weise Gäste und Gruppen den Tischen zu. Per Drag &amp; Drop ziehst du Familien aus der
        Gästeliste auf freie Plätze. Gäste können auch per CSV importiert werden
        (Spalten: Name, optional Tisch, Platz, Notiz). Über die Schnellzuweisung werden Gruppen
        automatisch auf freie Tische verteilt.
        <br /><em>Hinweis: Dieses Modul benötigt die Raumplanung.</em>
      </Section>

      <Section step="5" title="🍽️ Menüplanung">
        Gestalte dein Menü mit mehreren Gängen (Vorspeise, Hauptgang, Dessert usw.).
        Pro Gang kannst du mehrere Gerichte mit Beschreibung und Diät-Tags hinzufügen
        (vegetarisch, vegan, glutenfrei etc.). Gäste sehen das Menü auf der Gäste-Info-Seite.
      </Section>

      <Section step="6" title="💌 Einladungen">
        Verwalte deine komplette Gästeliste mit Kategorien (Familie Braut/Bräutigam, Freunde,
        Arbeitskollegen usw.). Für jeden Gast erfasst du Name, E-Mail, Gruppengröße, Kinder
        und besondere Wünsche. Versende Einladungen über verschiedene Kanäle:<br />
        🔗 <strong>Link kopieren</strong> · 📧 <strong>E-Mail</strong> · 💬 <strong>WhatsApp</strong> · 📱 <strong>QR-Code</strong><br />
        Du kannst zwischen offenem (jeder kann sich anmelden) und eingeschränktem Modus
        (nur per individuellem Einladungslink) wählen. Der RSVP-Status (ausstehend / zugesagt / abgesagt)
        wird automatisch getrackt.
      </Section>

      <Section step="7" title="📱 Gäste-Info">
        Eine öffentliche Infoseite für deine Gäste. Du konfigurierst, welche Informationen
        angezeigt werden: Countdown, Veranstaltungsort (mit Google-Maps-Link), Ablaufplan,
        Menükarte, Dresscode, Kontaktdaten und Geschenke-Hinweise.
        Eine Vorschau zeigt dir, wie die Seite für Gäste aussieht.
      </Section>

      <Section step="8" title="✅ Checkliste">
        Aufgabenliste für die Eventplanung. Jede Aufgabe hat Titel, Kategorie (Location, Deko,
        Musik usw.), Priorität (hoch / mittel / niedrig) und optionales Fälligkeitsdatum.
        Je nach gewählter Vorlage werden passende Standard-Aufgaben vorausgefüllt.
      </Section>

      <Section step="9" title="💰 Budget">
        Plane und verfolge alle Kosten. Erstelle Posten mit Kategorie (Location, Essen,
        Dekoration, Musik usw.), geplantem und tatsächlichem Betrag sowie Bezahlstatus.
        Die Übersicht zeigt dir jederzeit die Gesamtkosten im Vergleich zum geplanten Budget.
      </Section>

      <Section step="10" title="⏱️ Ablaufplan">
        Erstelle den zeitlichen Ablauf deines Events. Jeder Programmpunkt hat Uhrzeit, Titel,
        Dauer, Ort, verantwortliche Person und optionale Beschreibung. Die Einträge werden
        chronologisch sortiert angezeigt und sind auch auf der Gäste-Info-Seite sichtbar.
      </Section>

      <Section step="11" title="Events verwalten" color="#f0fdf4" borderColor="#bbf7d0" headColor="#065f46">
        Unter <strong>📂 Events laden</strong> siehst du alle gespeicherten Events.
        Klicke auf ein Event, um es zu öffnen und weiterzubearbeiten.
        Über das 🗑️-Icon kann ein Event dauerhaft gelöscht werden.
      </Section>
    </div>
  )
}

/* ─── Club / Vereinsmodule ───────────────────────────────────────────────── */

function HelpClubModules() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Verein erstellen oder beitreten" color="#eff6ff" borderColor="#bfdbfe" headColor="#1e3a8a">
        Auf der Startseite kannst du über <strong>🏆 Verein erstellen</strong> einen neuen Verein
        gründen oder über <strong>🤝 Verein beitreten</strong> per Einladungscode einem bestehenden
        Verein beitreten. Der Ersteller wird automatisch <strong>Owner</strong> des Vereins.
      </Section>

      <Section step="2" title="Rollen im Verein">
        Jeder Verein hat drei Rollen:<br />
        👑 <strong>Owner</strong> – Volle Kontrolle: Mitglieder verwalten, Vereinsdaten ändern,
        Eigentümerschaft übertragen, Verein löschen.<br />
        📋 <strong>Vorstand</strong> – Events erstellen und verwalten, Mitglieder einladen und bearbeiten,
        Vereinseinstellungen ändern.<br />
        👤 <strong>Mitglied</strong> – Lesezugriff auf Vereins-Infos, Events einsehen und an Veranstaltungen teilnehmen.
      </Section>

      <Section step="3" title="Vereins-Dashboard">
        Das Dashboard zeigt Vereinsname, Beschreibung und Mitgliederanzahl.
        Je nach Rolle siehst du Schnellaktionen: Events erstellen, Mitglieder verwalten,
        Einstellungen öffnen. Der Aktivitätslog zeigt die letzten Aktionen im Verein
        (z.B. „Event erstellt", „Mitglied hinzugefügt").
      </Section>

      <Section step="4" title="👥 Mitgliederverwaltung">
        <strong>Einladen:</strong> Generiere zeitlich begrenzte Einladungscodes (Standard: 72 Stunden gültig)
        mit optionalem Nutzungslimit. Den Code kannst du teilen – neue Mitglieder treten damit bei.<br />
        <strong>Manuelle Mitglieder:</strong> Erstelle Mitgliedereinträge für Personen ohne Account
        (z.B. für eine Mitgliederliste). Diese können später mit registrierten Nutzern zusammengeführt werden.<br />
        <strong>Profildaten:</strong> Anrede, Vor-/Nachname, Telefon, Adresse, E-Mail, Geburtsdatum,
        IBAN/BIC, Mitglied seit, Notizen und individuelle Rolle.<br />
        <strong>Ansicht:</strong> Karten- oder Tabellenansicht mit Suche und Rollenfilter.
      </Section>

      <Section step="5" title="⚙️ Vereinseinstellungen">
        Name und Beschreibung des Vereins bearbeiten. Der Owner kann die Eigentümerschaft
        an einen Vorstand übertragen oder den Verein dauerhaft löschen.
      </Section>

      <Section step="6" title="Vereins-Events erstellen" color="#faf5ff" borderColor="#e9d5ff" headColor="#6b21a8">
        Über <strong>✨ Neue Vereinsveranstaltung planen</strong> (nur Vorstand/Owner) öffnet sich
        der Assistent. Im ersten Schritt wählst du Titel, Datum, Uhrzeit und eine Vorlage:<br />
        🎉 <strong>Vereinsfest</strong> · 📋 <strong>Mitgliederversammlung</strong> · 💼 <strong>Vorstandssitzung</strong> · 🛠️ <strong>Arbeitseinsatz</strong><br />
        Im zweiten Schritt aktivierst du die gewünschten Module.
      </Section>

      <Section step="7" title="🪑 Sitzplanung (Vereins-Event)">
        Erstelle ein Raumlayout mit Tischen für dein Vereins-Event – identisch mit der
        Raumplanung bei privaten Events. Tische können frei platziert, gedreht und benannt werden.
      </Section>

      <Section step="8" title="🍽️ Speiseplanung (Vereins-Event)">
        Verwalte eine Speisekarte mit Speisen, Preisen und Kategorien.
        Bestellungen können manuell erfasst oder per CSV importiert werden.
        Ideal für Vereinsfeste mit Essensausgabe.
      </Section>

      <Section step="9" title="👥 Gästeplanung (Vereins-Event)">
        Weise Vereinsmitglieder und Gäste den Tischen zu.
        Funktioniert wie der Tischplaner – Gruppen werden per Drag &amp; Drop auf freie Plätze verteilt.
      </Section>

      <Section step="10" title="📝 Reservierung (Vereins-Event)">
        Erstelle eine öffentliche Reservierungsseite, über die sich Gäste anmelden können.
        Konfigurierbar: maximale Kapazität, automatische Bestätigung oder manuelle Freigabe,
        optionale Felder (Telefon, Bemerkungen), Menüauswahl und eigenes Logo.
        Gäste erhalten einen individuellen Absage-Link. Der Status jeder Reservierung
        (ausstehend / bestätigt / abgelehnt) wird in der Übersicht angezeigt.
      </Section>

      <Section step="11" title="📨 Mitgliedereinladung (Vereins-Event)">
        Lade Vereinsmitglieder direkt zur Veranstaltung ein.
        Mitglieder erhalten eine Benachrichtigung und können ihre Teilnahme zusagen oder absagen.
      </Section>

      <Section step="12" title="Vereins-Events verwalten" color="#f0fdf4" borderColor="#bbf7d0" headColor="#065f46">
        Die Event-Liste zeigt alle Vereins-Events mit Vorlagenbadge, Datum und aktiven Modulen.
        Vorstand und Owner können Events löschen. Klicke auf ein Event, um es zu öffnen und die einzelnen Module zu bearbeiten.
      </Section>
    </div>
  )
}

function HelpRoom() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Gäste zuweisen">
        Klicke auf einen freien Sitzplatz, um einen Gast zuzuweisen. Du kannst Gäste auch per CSV importieren
        (Spalten: <strong>Name</strong>, optional <strong>Tisch</strong> und <strong>Platz</strong>).
      </Section>
      <Section step="2" title="Tisch auswählen & bearbeiten">
        Einen Tisch anklicken, um ihn auszuwählen. Im Eigenschaftspanel rechts kannst du
        Name und Sitzplätze anpassen. Mit <strong>Entf</strong> oder dem Papierkorb-Icon wird der Tisch entfernt.
      </Section>
      <Section step="3" title="Speichern & Drucken" color="#f0fdf4" borderColor="#bbf7d0" headColor="#065f46">
        Über <strong>💾 Speichern</strong> wird die Veranstaltung gespeichert. Mit <strong>🖨️ Drucken</strong>
        öffnet sich die Druckvorschau — der Sitzplan lässt sich als PDF exportieren.
      </Section>
      <Section step="4" title="CSV-Import">
        Über den CSV-Import-Button lassen sich Gäste aus einer Tabelle einfügen.
        Pflichtfelder: <strong>Name</strong>. Optional: <strong>Tisch</strong>, <strong>Platz</strong>, <strong>Notiz</strong>.
      </Section>
      <Section step="5" title="Tastenbefehle" color="#f5f3ff" borderColor="#ddd6fe" headColor="#5b21b6">
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', alignItems: 'center' }}>
          <kbd style={kbd}>Esc</kbd><span>Ziehen abbrechen (Familie zurück)</span>
          <kbd style={kbd}>Klick + Ziehen</kbd><span>Tisch verschieben</span>
          <kbd style={kbd}>R</kbd><span>Familien drehen</span>
          <kbd style={kbd}>T</kbd><span>Familien spiegeln</span>
          <kbd style={kbd}>Strg + Z</kbd><span>Rückgängig (max. 5)</span>
          <kbd style={kbd}>Strg + Y</kbd><span>Wiederholen</span>
          <kbd style={kbd}>Strg + S</kbd><span>Speichern</span>

        </div>
      </Section>
    </div>
  )
}

function HelpRoomEditor() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section step="1" title="Tisch hinzufügen">
        Öffne in einem Event den Tab <strong>Raumplanung</strong> und füge über <strong>Tisch hinzufügen</strong>
        neue Tische ein. Die Personenzahl pro Tisch bestimmt dabei direkt die Tischgröße.
      </Section>
      <Section step="2" title="Tisch verschieben & drehen">
        Tisch anklicken und mit der Maus ziehen, um ihn zu verschieben.
        Mit <strong>R</strong> drehst du den aktuell ausgewählten Tisch.
      </Section>
      <Section step="3" title="Tisch löschen">
        Tisch auswählen und <strong>Entf</strong> drücken oder das Papierkorb-Icon im Eigenschaftspanel verwenden.
      </Section>
      <Section step="4" title="Vorlagen übernehmen" color="#f0fdf4" borderColor="#bbf7d0" headColor="#065f46">
        Über <strong>📂 Raum laden</strong> übernimmst du persönliche Raum-Vorlagen direkt in das aktuelle Event.
        Das Event speichert danach seine eigene Raumplanung unabhängig von der Vorlage.
      </Section>
      <Section step="5" title="Tastenbefehle" color="#f5f3ff" borderColor="#ddd6fe" headColor="#5b21b6">
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', alignItems: 'center' }}>
          <kbd style={kbd}>Entf</kbd><span>Ausgewählten Tisch löschen</span>
          <kbd style={kbd}>Strg + Z</kbd><span>Rückgängig (max. 5)</span>
          <kbd style={kbd}>Strg + S</kbd><span>Speicherdialog öffnen</span>
          <kbd style={kbd}>Esc</kbd><span>Ziehen abbrechen (Tisch zurücksetzen)</span>
          <kbd style={kbd}>Klick + Ziehen</kbd><span>Tisch verschieben</span>
        </div>
      </Section>
    </div>
  )
}

const kbd: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 7px',
  background: '#e2e8f0',
  borderRadius: 4,
  fontFamily: 'monospace',
  fontSize: 12,
  fontWeight: 700,
  color: '#334155',
  border: '1px solid #cbd5e1',
  whiteSpace: 'nowrap',
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
  const device = useDeviceType()
  const isMobile = device === 'mobile'

  if (!isOpen) return null

  const tabContent: Record<HelpTab, React.ReactNode> = {
    home:          <HelpHome />,
    privateEvents: <HelpPrivateEvents />,
    clubModules:   <HelpClubModules />,
    room:          <HelpRoom />,
    roomeditor:    <HelpRoomEditor />,
    togo:          <HelpToGo />,
    profile:       <HelpProfile />,
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
          borderRadius: isMobile ? 0 : 16,
          width: isMobile ? '100vw' : 820,
          maxWidth: isMobile ? '100vw' : '95vw',
          height: isMobile ? '100dvh' : undefined,
          maxHeight: isMobile ? '100dvh' : '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: isMobile ? '12px 16px' : '16px 22px',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1e293b' }}>
            📖 Anleitung
          </h3>
          <button
            onClick={closeHelp}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b', lineHeight: 1, padding: '4px 8px' }}
            aria-label="Schließen"
          >×</button>
        </div>

        {/* Mobile: horizontal scrollable tab bar */}
        {isMobile && (
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            flexShrink: 0,
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '6px 8px',
            gap: 4,
            WebkitOverflowScrolling: 'touch',
          }}>
            {TABS.map(tab => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => openHelp(tab.key)}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: 20,
                    background: active ? '#667eea' : 'transparent',
                    color: active ? 'white' : '#475569',
                    fontWeight: active ? 700 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                    transition: 'background 0.12s, color 0.12s',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Desktop: Vertical Tab Sidebar */}
          {!isMobile && (
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
          )}

          {/* Content */}
          <div style={{ flex: 1, padding: isMobile ? '16px 14px' : 22, overflowY: 'auto' }}>
            {tabContent[activeTab]}
          </div>
        </div>
      </div>
    </div>
  )
}
