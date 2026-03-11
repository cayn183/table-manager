import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function WeddingLandingPage() {
  const auth = useAuth()
  
  return (
    <>
      <Helmet>
        <title>Sitzplan für Hochzeiten & Events erstellen - PlatzPilot</title>
        <meta name="description" content="Erstellen Sie den perfekten Sitzplan für Ihre Hochzeit oder Ihr Event. PlatzPilot hilft Ihnen, Gäste optimal zu platzieren und Tischordnungen stressfrei zu organisieren." />
        <meta name="keywords" content="Sitzplan Hochzeit, Tischplan Hochzeit, Sitzordnung erstellen, Hochzeitsplanung Sitzplan, Gästeplanung Hochzeit" />
        <link rel="canonical" href="https://platzpilot.de/sitzplan-hochzeit" />
      </Helmet>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Beta Banner */}
        <div style={{
          marginBottom: '2rem',
          padding: '1rem 1.5rem',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '6px',
          color: '#856404',
          fontSize: '0.95rem',
          textAlign: 'center'
        }}>
          🚀 <strong>PlatzPilot ist in der Entwicklung</strong> – Nutzen Sie diese Beta-Version kostenlos ohne Einschränkungen und geben Sie uns Feedback!
        </div>
        {/* Hero Section */}
        <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#2c3e50' }}>
            Der perfekte Sitzplan für Ihre Hochzeit
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            PlatzPilot macht die Planung Ihrer Hochzeit stressfrei: Erstellen Sie visuelle Sitzpläne, 
            ordnen Sie Gäste optimal zu und behalten Sie den Überblick über Ihre komplette Tischordnung. 
            Perfekt auch für Jubiläen, Geburtstage, Firmenfeiern und andere private Feierlichkeiten.
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
                und passen Sie die Anordnung flexibel nach Ihren Wünschen an.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Automatische Zuordnung</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Importieren Sie Ihre Gästeliste und lassen Sie PlatzPilot die optimale Sitzordnung 
                berechnen. Der Algorithmus berücksichtigt Gruppengrößen und Kapazität automatisch.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Gästelisten verwalten</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Importieren Sie Gästelisten aus Excel/CSV oder erfassen Sie diese manuell. 
                Speichern Sie Informationen wie Gruppengröße, Ankunftszeit und spezielle Wünsche.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📱</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Überall verfügbar</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Arbeiten Sie von jedem Gerät aus – Desktop, Tablet oder Smartphone. 
                Teilen Sie den Zugang mit Ihrem Partner oder Wedding Planner. Ihre Daten sind sicher.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Timeline-Ansicht</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Sehen Sie auf einen Blick, welche Gäste wann ankommen. 
                Die Timeline sortiert alle Gruppen nach Ankunftszeit in übersichtlichen Spalten.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🖨️</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Export als PDF</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Exportieren Sie Ihren Sitzplan als druckfertiges PDF. 
                Perfekt für Tischkarten, Programm oder Ihren Hochzeitsdruck.
              </p>
            </div>
          </div>
        </section>
        
        {/* Use Cases Section */}
        <section style={{ marginBottom: '4rem', padding: '3rem', backgroundColor: '#fff5f8', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
            Perfekt für Ihre Feier
          </h2>
          <ul style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '2.2', color: '#555' }}>
            <li><strong>💍 Hochzeiten:</strong> Von der Trauung bis zur Hochzeitsfeier mit optimaler Tischordnung</li>
            <li><strong>🎉 Jubiläen:</strong> Silberhochzeit, Goldhochzeit, runde Geburtstage</li>
            <li><strong>🎊 Geburtstage:</strong> Große Feiern mit vielen Gästen und komplexer Planung</li>
            <li><strong>💼 Firmenfeiern:</strong> Weihnachtsfeiern, Jubiläen, Empfänge und Konferenzen</li>
            <li><strong>✨ Gala-Events:</strong> Charity-Events, Preisverleihungen und festliche Anlässe</li>
          </ul>
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
