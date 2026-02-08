import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const features = [
  {
    title: 'Planung fuer Vereine',
    text: 'Baue Vereinsfeste, Mitgliederversammlungen oder Galaabende mit klaren Ablaufen.'
  },
  {
    title: 'ToGo & Eventmodus',
    text: 'Schalte zwischen Sitzplan, Catering und Abholbereichen – alles in einer App.'
  },
  {
    title: 'Team & Export',
    text: 'Teile Pläne mit Helfern, exportiere als PDF oder CSV und halte Zugriffe sicher.'
  }
]

const pricing = [
  {
    name: 'Starter',
    price: '0 EUR',
    note: 'Fuer kleine Events',
    points: ['Ein Event aktiv', 'CSV-Import', 'PDF Export']
  },
  {
    name: 'Pro',
    price: '19 EUR / Monat',
    note: 'Fuer Agenturen & Locations',
    points: ['Unbegrenzt Events', 'Teamzugriff', 'Priorisierter Support']
  }
]

export default function LandingPage() {
  const auth = useAuth()
  return (
    <div className="landing">
      <div className="landing-hero">
        <div className="landing-nav">
          <div className="landing-brand">Eventplaner</div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Preise</a>
          </div>
          <div className="landing-nav-cta">
            {auth.user ? (
              <Link to="/app" className="landing-btn landing-btn-primary">Zum Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="landing-btn landing-btn-ghost">Anmelden</Link>
                <Link to="/register" className="landing-btn landing-btn-primary">Registrieren</Link>
              </>
            )}
          </div>
        </div>

        <div className="landing-hero-copy">
            <p className="landing-kicker">Planung fuer Vereine & Feiern</p>
            <h1>Deine Gaestelisten, Plaetze und ToGo-Bestellungen in einem Blick.</h1>
            <p className="landing-sub">
              Eventplaner verbindet Raumplaene, Gaeste, Ablaufe und ToGo-Ausgaben zu einem klaren Flow.
              Damit Vereine und Feierteams schnell entscheiden, wer wo sitzt – ohne Excel-Chaos.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="landing-btn landing-btn-primary">Kostenlos starten</Link>
            <Link to="/login" className="landing-btn landing-btn-secondary">Zur Demo</Link>
          </div>
        </div>
      </div>

      <section id="features" className="landing-section">
        <div className="landing-section-head">
          <h2>Was Eventplaner kann</h2>
          <p>Die wichtigsten Funktionen auf einen Blick, ganz ohne Marktueberladung.</p>
        </div>
        <div className="landing-feature-grid">
          {features.map((item) => (
            <div className="landing-feature" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="examples" className="landing-section">
        <div className="landing-section-head">
          <h2>Beispielverwendungen</h2>
          <p>So koennen Vereinsfeste, Hochzeiten oder ToGo-Ausgaben aussehen.</p>
        </div>
        <div className="landing-example-grid">
          <div className="landing-example-shot" aria-label="Vereinsfest Layout" />
          <div className="landing-example-shot" aria-label="Festlicher Sitzplan" />
          <div className="landing-example-shot" aria-label="ToGo-Bestellungen" />
        </div>
      </section>

      <section id="pricing" className="landing-section landing-section-alt">
        <div className="landing-section-head">
          <h2>Preise, die einfach mitwachsen</h2>
          <p>Starte ohne Verpflichtung und wechsle, sobald du mehr braucht.</p>
        </div>
        <div className="landing-pricing-grid">
          {pricing.map((tier) => (
            <div className="landing-price" key={tier.name}>
              <div className="landing-price-head">
                <h3>{tier.name}</h3>
                <span className="landing-price-note">{tier.note}</span>
              </div>
              <div className="landing-price-value">{tier.price}</div>
              <ul>
                {tier.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link to="/register" className="landing-btn landing-btn-primary">Waehl deinen Plan</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <h2>Bereit fuer deinen naechsten Event?</h2>
          <p>Starte jetzt auf eventplaner.caydan.de und plane das Event, das bleibt.</p>
        </div>
        <div className="landing-cta-actions">
          <Link to="/register" className="landing-btn landing-btn-primary">Jetzt starten</Link>
          <Link to="/login" className="landing-btn landing-btn-secondary">Bereits dabei</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>Eventplaner</strong>
          <p>Planung, die kaum Zeit braucht.</p>
        </div>
        <div className="landing-footer-links">
          <a href="#features">Features</a>
          <a href="#pricing">Preise</a>
          <Link to="/login">Login</Link>
        </div>
      </footer>
    </div>
  )
}
