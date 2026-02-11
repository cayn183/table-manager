import React from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../auth/AuthContext'

/* ── Inline SVG illustrations for feature showcase ── */

function IllustrationRoomPlan() {
  return (
    <svg viewBox="0 0 400 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-illustration">
      {/* Background grid */}
      <rect width="400" height="260" rx="12" fill="#f8fafc" />
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={`v${i}`} x1={40 * (i + 1)} y1="0" x2={40 * (i + 1)} y2="260" stroke="#e2e8f0" strokeWidth="0.5" />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={40 * (i + 1)} x2="400" y2={40 * (i + 1)} stroke="#e2e8f0" strokeWidth="0.5" />
      ))}
      {/* Tables */}
      <rect x="40" y="40" width="80" height="60" rx="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
      <text x="80" y="75" textAnchor="middle" fontSize="11" fill="#1e40af" fontWeight="600">Tisch 1</text>
      <rect x="160" y="40" width="80" height="60" rx="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
      <text x="200" y="75" textAnchor="middle" fontSize="11" fill="#1e40af" fontWeight="600">Tisch 2</text>
      <rect x="280" y="40" width="80" height="60" rx="8" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" />
      <text x="320" y="75" textAnchor="middle" fontSize="11" fill="#166534" fontWeight="600">Tisch 3</text>
      <rect x="40" y="140" width="120" height="60" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
      <text x="100" y="175" textAnchor="middle" fontSize="11" fill="#92400e" fontWeight="600">Tisch 4 (8P)</text>
      <rect x="200" y="140" width="80" height="60" rx="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
      <text x="240" y="175" textAnchor="middle" fontSize="11" fill="#1e40af" fontWeight="600">Tisch 5</text>
      {/* Seats */}
      {[60, 80, 100].map((x) => <circle key={`s1-${x}`} cx={x} cy="32" r="6" fill="#93c5fd" />)}
      {[60, 80, 100].map((x) => <circle key={`s2-${x}`} cx={x} cy="108" r="6" fill="#93c5fd" />)}
      {[180, 200, 220].map((x) => <circle key={`s3-${x}`} cx={x} cy="32" r="6" fill="#93c5fd" />)}
      {/* Label */}
      <rect x="300" y="155" width="80" height="24" rx="4" fill="#f97316" />
      <text x="340" y="171" textAnchor="middle" fontSize="10" fill="white" fontWeight="600">Drag &amp; Drop</text>
    </svg>
  )
}

function IllustrationToGo() {
  return (
    <svg viewBox="0 0 400 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-illustration">
      <rect width="400" height="260" rx="12" fill="#f8fafc" />
      {/* Header bar */}
      <rect x="16" y="16" width="368" height="36" rx="8" fill="#1e293b" />
      <text x="32" y="39" fontSize="13" fill="white" fontWeight="600">ToGo-Bestellungen</text>
      <rect x="300" y="24" width="70" height="20" rx="4" fill="#f97316" />
      <text x="335" y="38" textAnchor="middle" fontSize="10" fill="white" fontWeight="600">+ Neue</text>
      {/* Order cards */}
      {[{ y: 68, name: 'Fam. Mueller', items: '2x Schnitzel, 1x Salat', status: 'Offen', color: '#fef3c7', border: '#f59e0b' },
        { y: 124, name: 'Herr Schmidt', items: '3x Bratwurst, 2x Pommes', status: 'Fertig', color: '#dcfce7', border: '#22c55e' },
        { y: 180, name: 'Frau Weber', items: '1x Kuchen, 2x Kaffee', status: 'Abgeholt', color: '#e0e7ff', border: '#6366f1' }
      ].map((order) => (
        <g key={order.name}>
          <rect x="16" y={order.y} width="368" height="44" rx="8" fill={order.color} stroke={order.border} strokeWidth="1.5" />
          <text x="28" y={order.y + 18} fontSize="12" fill="#0f172a" fontWeight="600">{order.name}</text>
          <text x="28" y={order.y + 34} fontSize="10" fill="#64748b">{order.items}</text>
          <rect x="310" y={order.y + 10} width="60" height="22" rx="4" fill={order.border} />
          <text x="340" y={order.y + 25} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">{order.status}</text>
        </g>
      ))}
      {/* Summary */}
      <rect x="16" y="232" width="368" height="18" rx="4" fill="#f1f5f9" />
      <text x="28" y="245" fontSize="10" fill="#64748b">3 Bestellungen · Gesamt: 47,50 EUR</text>
    </svg>
  )
}

function IllustrationCSV() {
  return (
    <svg viewBox="0 0 400 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-illustration">
      <rect width="400" height="260" rx="12" fill="#f8fafc" />
      {/* File icon */}
      <rect x="24" y="20" width="60" height="72" rx="6" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
      <path d="M62 20 L84 42 L62 42 Z" fill="#c7d2fe" stroke="#6366f1" strokeWidth="1.5" />
      <text x="54" y="72" textAnchor="middle" fontSize="11" fill="#4338ca" fontWeight="700">.CSV</text>
      {/* Arrow */}
      <path d="M100 56 L140 56" stroke="#f97316" strokeWidth="3" markerEnd="url(#arrow)" />
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" /></marker></defs>
      {/* Table */}
      <rect x="150" y="16" width="234" height="28" rx="6" fill="#1e293b" />
      <text x="164" y="34" fontSize="10" fill="white" fontWeight="600">Name</text>
      <text x="244" y="34" fontSize="10" fill="white" fontWeight="600">Personen</text>
      <text x="324" y="34" fontSize="10" fill="white" fontWeight="600">Uhrzeit</text>
      {[{ y: 50, name: 'Fam. Hofmann', size: '6', time: '18:00' },
        { y: 76, name: 'Herr Braun', size: '2', time: '18:30' },
        { y: 102, name: 'Fam. Klein', size: '4', time: '19:00' },
        { y: 128, name: 'Frau Fischer', size: '3', time: '19:00' },
        { y: 154, name: 'Fam. Wagner', size: '8', time: '19:30' },
      ].map((row) => (
        <g key={row.name}>
          <rect x="150" y={row.y} width="234" height="24" rx="0" fill={row.y % 52 === 50 ? '#ffffff' : '#f8fafc'} stroke="#e2e8f0" strokeWidth="0.5" />
          <text x="164" y={row.y + 16} fontSize="10" fill="#334155">{row.name}</text>
          <text x="264" y={row.y + 16} textAnchor="middle" fontSize="10" fill="#334155">{row.size}</text>
          <text x="344" y={row.y + 16} textAnchor="middle" fontSize="10" fill="#334155">{row.time}</text>
        </g>
      ))}
      {/* Import success badge */}
      <rect x="150" y="190" width="234" height="32" rx="8" fill="#dcfce7" stroke="#22c55e" strokeWidth="1" />
      <text x="267" y="210" textAnchor="middle" fontSize="11" fill="#166534" fontWeight="600">5 Gruppen erfolgreich importiert</text>
      {/* Export button */}
      <rect x="24" y="120" width="96" height="32" rx="6" fill="#f97316" />
      <text x="72" y="140" textAnchor="middle" fontSize="11" fill="white" fontWeight="600">PDF Export</text>
      <rect x="24" y="164" width="96" height="32" rx="6" fill="#1d4ed8" />
      <text x="72" y="184" textAnchor="middle" fontSize="11" fill="white" fontWeight="600">CSV Export</text>
    </svg>
  )
}

function IllustrationTimeline() {
  return (
    <svg viewBox="0 0 400 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="landing-illustration">
      <rect width="400" height="260" rx="12" fill="#f8fafc" />
      {/* Timeline columns */}
      {[
        { x: 16, label: '18:00', items: [{ name: 'Fam. Mueller', bg: '#dbeafe' }, { name: 'Herr Koch', bg: '#fef3c7' }] },
        { x: 144, label: '18:30', items: [{ name: 'Fam. Schmidt', bg: '#dcfce7' }, { name: 'Frau Bauer', bg: '#fce7f3' }, { name: 'Fam. Richter', bg: '#dbeafe' }] },
        { x: 272, label: '19:00', items: [{ name: 'Herr Braun', bg: '#fef3c7' }] },
      ].map((col) => (
        <g key={col.label}>
          <rect x={col.x} y="16" width="116" height="28" rx="6" fill="#1e293b" />
          <text x={col.x + 58} y="34" textAnchor="middle" fontSize="12" fill="white" fontWeight="600">{col.label}</text>
          {col.items.map((item, i) => (
            <g key={item.name}>
              <rect x={col.x} y={56 + i * 52} width="116" height="40" rx="8" fill={item.bg} stroke="#cbd5e1" strokeWidth="1" />
              <text x={col.x + 58} y={80 + i * 52} textAnchor="middle" fontSize="10" fill="#0f172a" fontWeight="500">{item.name}</text>
            </g>
          ))}
        </g>
      ))}
      {/* Bottom info bar */}
      <rect x="16" y="228" width="368" height="20" rx="4" fill="#f1f5f9" />
      <text x="200" y="242" textAnchor="middle" fontSize="10" fill="#64748b">Timeline-Ansicht : Alle Gäste nach Ankunftszeit sortiert</text>
    </svg>
  )
}

/* ── Feature data ── */

const features = [
  {
    icon: '🏠',
    title: 'Raumplanung per Drag & Drop',
    text: 'Erstelle Raumlayouts mitbeliebig vielen Tischen. Platziere Gäste per Drag & Drop und passe Tischgrößen flexibel an.',
  },
  {
    icon: '👥',
    title: 'Gästeverwaltung',
    text: 'Importiere Gästelisten per CSV oder erfasse Gruppen manuell. Anreden, Gruppengröße, Zeitfenster und Notizen werden unterstützt.',
  },
  {
    icon: '🍽️',
    title: 'ToGo-Bestellungen',
    text: 'Verwalte Abholbestellungen für Vereinsfeste oder Caterings. Speisekarte anlegen, Bestellungen erfassen und Statusverfolgung inklusive.',
  },
  {
    icon: '📅',
    title: 'Event-Management',
    text: 'Erstelle und lade Events mit Datum, Zeitraum und zugeordnetem Raum. Wechsle schnell zwischen verschiedenen Veranstaltungen.',
  },
  {
    icon: '🕐',
    title: 'Timeline-Ansicht',
    text: 'Sieh auf einen Blick, welche Gäste wann kommen. Die Timeline sortiert alle Gruppen nach Ankunftszeit in übersichtlichen Spalten.',
  },
  {
    icon: '📄',
    title: 'CSV-Import & PDF-Export',
    text: 'Importiere bestehende Gästelisten aus Excel/CSV. Exportiere fertige Sitzpläne als druckfertiges PDF oder als CSV-Datei.',
  },
  {
    icon: '♿',
    title: 'Barrierefreiheit beachten',
    text: 'Markiere Gäste mit Barrierefreiheitsbedürfnissen und berücksichtige dies bei der Tischzuweisung.',
  },
  {
    icon: '🤖',
    title: 'Auto-Platzierung',
    text: 'Lass den Algorithmus die optimale Sitzordnung berechnen. Gruppen werden automatisch auf passende Tische verteilt.',
  },
  {
    icon: '💬',
    title: 'Feedback & Support',
    text: 'Integriertes Feedback-Formular direkt in der App. Melde Fehler oder Wünsche mit einem Klick.',
  },
]

/* ── Use-cases / Target groups ── */

const useCases = [
  {
    title: 'Vereinsfeste & Jahresfeiern',
    text: 'Plane Sitzordnungen für Mitgliederversammlungen, Weihnachtsfeiern oder Sommerfeste. Importiere die Mitgliederliste und verteile die Plätze.',
    icon: '🎪',
  },
  {
    title: 'Hochzeiten & private Feiern',
    text: 'Erstelle den perfekten Sitzplan für deine Hochzeit oder Familienfeier. Bestimme, welche Gäste zusammen sitzen.',
    icon: '💒',
  },
  {
    title: 'Catering & ToGo-Ausgabe',
    text: 'Organisiere die ToGo-Ausgabe bei Vereinsfesten. Speisekarte pflegen, Bestellungen aufnehmen und abhaken.',
    icon: '🥡',
  },
  {
    title: 'Galas & Firmenevents',
    text: 'Auch für größere Veranstaltungen geeignet. Mehrere Räume, große Gästelisten und Zeitmanagement inklusive.',
    icon: '🎩',
  },
]

export default function LandingPage() {
  const auth = useAuth()
  return (
    <>
      <Helmet>
        <title>PlatzPilot - Sitzpläne und Event-Management leicht gemacht</title>
        <meta name="description" content="PlatzPilot hilft bei der Planung von Events, Hochzeiten und Vereinsveranstaltungen. Erstellen Sie Sitzpläne, verwalten Sie Gästelisten und koordinieren Sie ToGo-Bestellungen." />
        <meta name="keywords" content="Sitzplan, Tischplan, Event-Management, Hochzeitsplanung, Vereinsveranstaltung" />
      </Helmet>
      <div className="landing">
      {/* ── Navigation ── */}
      <div className="landing-hero">
        <div className="landing-nav">
          <div className="landing-brand">PlatzPilot</div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#examples">Beispiele</a>
            <a href="#usecases">Einsatzbereiche</a>
            <a href="#pricing">Preise</a>
          </div>
          <div className="landing-nav-cta">
            {auth.user ? (
              <Link to="/app" className="landing-btn landing-btn-primary">Zum Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="landing-btn landing-btn-ghost">Anmelden</Link>
                <Link to="/register" className="landing-btn landing-btn-primary">Kostenlos starten</Link>
              </>
            )}
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="landing-hero-copy">
          <p className="landing-kicker">Kostenlose Eventplanung für Vereine & mehr</p>
          <h1>Sitzpläne, Gästelisten &amp; ToGo-Bestellungen — alles in einer App.</h1>
          <p className="landing-sub">
            PlatzPilot ist das kostenlose Tool für Vereine, Feierteams und alle,
            die Raum- und Tischplanung einfach und schnell erledigen wollen.
            Schluss mit Excel-Chaos — plane per Drag&nbsp;&amp;&nbsp;Drop, importiere
            Gästelisten und exportiere druckfertige Sitzpläne.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="landing-btn landing-btn-primary landing-btn-lg">Kostenlos registrieren</Link>
            <a href="#features" className="landing-btn landing-btn-secondary">Features entdecken</a>
          </div>
          <p className="landing-hero-note">Keine Kreditkarte nötig · Alle Features inklusive · Unbegrenzte Events</p>
        </div>
      </div>

      {/* ── Features Grid ── */}
      <section id="features" className="landing-section">
        <div className="landing-section-head">
          <h2>Alles, was du für dein Event brauchst</h2>
          <p>PlatzPilot bietet dir alle Werkzeuge für eine stressfreie Veranstaltungsplanung — von der Gästeliste bis zum fertigen Sitzplan.</p>
        </div>
        <div className="landing-feature-grid">
          {features.map((item) => (
            <div className="landing-feature" key={item.title}>
              <span className="landing-feature-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Beispiele mit Illustrationen ── */}
      <section id="examples" className="landing-section landing-section-alt">
        <div className="landing-section-head">
          <h2>So sieht PlatzPilot in Aktion aus</h2>
          <p>Von der Raumplanung über die Gästeverwaltung bis hin zu ToGo-Bestellungen — hier ein Eindruck der wichtigsten Ansichten.</p>
        </div>
        <div className="landing-showcase-grid">
          <div className="landing-showcase-item">
            <IllustrationRoomPlan />
            <h3>Raumplanung</h3>
            <p>Erstelle Raumlayouts mit Tischen unterschiedlicher Größe. Platziere Gäste per Drag&nbsp;&amp;&nbsp;Drop auf dem Rasterplan.</p>
          </div>
          <div className="landing-showcase-item">
            <IllustrationToGo />
            <h3>ToGo-Bestellungen</h3>
            <p>Verwalte Abholbestellungen mit Statusverfolgung. Ideal für Vereinsfeste mit Essensausgabe oder Catering.</p>
          </div>
          <div className="landing-showcase-item">
            <IllustrationCSV />
            <h3>Import &amp; Export</h3>
            <p>Importiere Gästelisten aus CSV/Excel und exportiere fertige Sitzpläne als PDF oder CSV.</p>
          </div>
          <div className="landing-showcase-item">
            <IllustrationTimeline />
            <h3>Timeline-Ansicht</h3>
            <p>Behalte den Überblick, welche Gäste wann eintreffen und wo sie sitzen. Perfekt für zeitversetzte Ankünfte.</p>
          </div>
        </div>
      </section>

      {/* ── Einsatzbereiche ── */}
      <section id="usecases" className="landing-section">
        <div className="landing-section-head">
          <h2>Für wen ist PlatzPilot?</h2>
          <p>Ob Vereinsfest, Hochzeit oder Firmenveranstaltung — PlatzPilot passt sich deinem Bedarf an.</p>
        </div>
        <div className="landing-usecase-grid">
          {useCases.map((uc) => (
            <div className="landing-usecase" key={uc.title}>
              <span className="landing-usecase-icon">{uc.icon}</span>
              <h3>{uc.title}</h3>
              <p>{uc.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing — alles kostenlos ── */}
      <section id="pricing" className="landing-section landing-section-alt">
        <div className="landing-section-head">
          <h2>Komplett kostenlos</h2>
          <p>PlatzPilot ist aktuell vollstaendig kostenlos nutzbar — ohne versteckte Kosten, ohne Einschraenkungen.</p>
        </div>
        <div className="landing-pricing-grid">
          <div className="landing-price landing-price-highlight">
            <div className="landing-price-badge">Aktuell kostenlos</div>
            <div className="landing-price-head">
              <h3>Alle Features</h3>
              <span className="landing-price-note">Für Vereine, Teams & Privatpersonen</span>
            </div>
            <div className="landing-price-value">
              <span className="landing-price-old">19 EUR/Monat</span>
              <span>0 EUR</span>
            </div>
            <ul>
              <li>Unbegrenzte Events &amp; Raeume</li>
              <li>CSV-Import &amp; PDF-Export</li>
              <li>ToGo-Bestellverwaltung</li>
              <li>Timeline-Ansicht</li>
              <li>Auto-Platzierung</li>
              <li>Gäste- &amp; Gruppenverwaltung</li>
              <li>Feedback &amp; Support</li>
            </ul>
            <Link to="/register" className="landing-btn landing-btn-primary landing-btn-lg">Jetzt kostenlos starten</Link>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section">
        <div className="landing-section-head">
          <h2>In 3 Schritten zum fertigen Event</h2>
          <p>So einfach funktioniert PlatzPilot:</p>
        </div>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <h3>Registrieren</h3>
            <p>Erstelle kostenlos ein Konto mit Name, E-Mail und Passwort. In unter 30 Sekunden startklar.</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <h3>Raum & Gäste anlegen</h3>
            <p>Erstelle einen Raum mit Tischen, importiere deine Gästeliste per CSV oder lege Gruppen manuell an.</p>
          </div>
          <div className="landing-step-arrow">→</div>
          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <h3>Planen & Exportieren</h3>
            <p>Platziere Gäste per Drag&nbsp;&amp;&nbsp;Drop oder automatisch. Exportiere den fertigen Sitzplan als PDF.</p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div>
          <h2>Bereit für stressfreie Eventplanung?</h2>
          <p>Registriere dich jetzt kostenlos und starte mit deinem ersten Event — ganz ohne Verpflichtung.</p>
        </div>
        <div className="landing-cta-actions">
          <Link to="/register" className="landing-btn landing-btn-primary landing-btn-lg">Kostenlos registrieren</Link>
          <Link to="/login" className="landing-btn landing-btn-secondary">Bereits registriert? Anmelden</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div>
          <strong>PlatzPilot</strong>
          <p>Kostenlose Raum- &amp; Tischplanung für Vereine und mehr.</p>
        </div>
        <div className="landing-footer-links">
          <a href="#features">Features</a>
          <a href="#examples">Beispiele</a>
          <a href="#usecases">Einsatzbereiche</a>
          <a href="#pricing">Preise</a>
          <Link to="/login">Login</Link>
        </div>
      </footer>
    </div>
    </>
  )
}
