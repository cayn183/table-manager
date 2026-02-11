import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function WeddingLandingPage() {
  const auth = useAuth()
  
  return (
    <>
      <Helmet>
        <title>Sitzplan für Hochzeiten & Events erstellen - PlatzPilot</title>
        <meta name="description" content="Erstellen Sie den perfekten Sitzplan für Ihre Hochzeit oder Ihr Event. PlatzPilot hilft Ihnen, Gäste optimal zu platzieren und Tischordnungen stressfrei zu organisieren." />
        <meta name="keywords" content="Sitzplan Hochzeit, Tischplan Hochzeit, Sitzordnung erstellen, Hochzeitsplanung Sitzplan, Gästeplanung Hochzeit" />
      </Helmet>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Hero Section */}
        <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#2c3e50' }}>
            Der perfekte Sitzplan für Ihre Hochzeit
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            PlatzPilot macht die Planung Ihrer Hochzeit stressfrei: Erstellen Sie visuelle Sitzpläne, 
            ordnen Sie Gäste automatisch zu und behalten Sie den Überblick über Ihre Tischordnung. 
            Perfekt auch für Jubiläen, Geburtstage und Firmenfeiern.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            {auth.user ? (
              <Link to="/app" style={{
                textDecoration: 'none',
                padding: '1rem 2rem',
                backgroundColor: '#e91e63',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}>
                Zur App
              </Link>
            ) : (
              <>
                <Link to="/register" style={{
                  textDecoration: 'none',
                  padding: '1rem 2rem',
                  backgroundColor: '#e91e63',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}>
                  Kostenlos starten
                </Link>
                <Link to="/login" style={{
                  textDecoration: 'none',
                  padding: '1rem 2rem',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}>
                  Anmelden
                </Link>
              </>
            )}
          </div>
        </section>
        
        {/* Features Section */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '3rem', color: '#2c3e50' }}>
            Stressfrei zur perfekten Sitzordnung
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💐</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Visuelle Tischplanung</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Sehen Sie Ihren Hochzeitssaal auf einen Blick. Ziehen Sie Tische per Drag & Drop 
                und passen Sie die Anordnung nach Ihren Wünschen an.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Automatische Zuordnung</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Importieren Sie Ihre Gästeliste und lassen Sie PlatzPilot die optimale Sitzordnung 
                berechnen. Berücksichtigt Gruppengrößen und Präferenzen.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📱</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Überall verfügbar</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Arbeiten Sie von jedem Gerät aus. Teilen Sie den Zugang mit Ihrem Partner 
                oder Wedding Planner. Ihre Daten sind sicher in der Cloud gespeichert.
              </p>
            </div>
          </div>
        </section>
        
        {/* Use Cases Section */}
        <section style={{ marginBottom: '4rem', padding: '3rem', backgroundColor: '#fff5f8', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
            Perfekt für Ihre Feier
          </h2>
          <ul style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '2', color: '#555' }}>
            <li><strong>Hochzeiten:</strong> Von der Trauung bis zur Hochzeitsfeier</li>
            <li><strong>Jubiläen:</strong> Silberhochzeit, Goldhochzeit, runde Geburtstage</li>
            <li><strong>Firmenfeiern:</strong> Weihnachtsfeiern, Jubiläen, Empfänge</li>
            <li><strong>Geburtstage:</strong> Große Feiern mit vielen Gästen</li>
            <li><strong>Gala-Events:</strong> Charity-Events, Preisverleihungen</li>
          </ul>
        </section>
        
        {/* How It Works Section */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '3rem', color: '#2c3e50' }}>
            So einfach geht's
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '50px',
                height: '50px',
                backgroundColor: '#e91e63',
                color: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>1</div>
              <div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Gästeliste importieren</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Laden Sie Ihre Gästeliste als CSV-Datei hoch oder geben Sie die Namen manuell ein.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '50px',
                height: '50px',
                backgroundColor: '#e91e63',
                color: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>2</div>
              <div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Tische erstellen</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Definieren Sie Ihre Tische und ordnen Sie diese im virtuellen Raum an.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '50px',
                height: '50px',
                backgroundColor: '#e91e63',
                color: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>3</div>
              <div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Gäste zuordnen</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Nutzen Sie die automatische Platzierung oder ordnen Sie Gäste manuell zu.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '50px',
                height: '50px',
                backgroundColor: '#e91e63',
                color: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>4</div>
              <div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Exportieren & Drucken</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Exportieren Sie Ihren Sitzplan als PDF und drucken Sie Tischkarten für Ihre Gäste.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section style={{ textAlign: 'center', padding: '3rem 2rem', backgroundColor: '#e91e63', color: '#fff', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Starten Sie jetzt mit Ihrer Planung
          </h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
            Kostenlos und ohne Verpflichtung. In wenigen Minuten einsatzbereit.
          </p>
          {auth.user ? (
            <Link to="/app" style={{
              textDecoration: 'none',
              padding: '1rem 2rem',
              backgroundColor: '#fff',
              color: '#e91e63',
              borderRadius: '6px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              display: 'inline-block'
            }}>
              Zur App
            </Link>
          ) : (
            <Link to="/register" style={{
              textDecoration: 'none',
              padding: '1rem 2rem',
              backgroundColor: '#fff',
              color: '#e91e63',
              borderRadius: '6px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              display: 'inline-block'
            }}>
              Jetzt kostenlos registrieren
            </Link>
          )}
        </section>
      </div>
    </>
  )
}
