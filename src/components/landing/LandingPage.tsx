import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function LandingPage() {
  const auth = useAuth()
  
  return (
    <>
      <Helmet>
        <title>PlatzPilot – Kostenlose Sitzplan- & Eventplanung</title>
        <meta name="description" content="Kostenlose Sitzpläne per Drag & Drop für Vereine, Hochzeiten und Events. Gästelisten importieren, ToGo-Bestellungen verwalten und als PDF exportieren." />
        <meta name="keywords" content="Sitzplan, Tischplan, Event-Management, Hochzeitsplanung, Vereinsveranstaltung, Gästeliste, Gästelistenmanagement, Gästeliste online, kostenlos, Drag and Drop, PDF Export, CSV Import" />
        <link rel="canonical" href="https://platzpilot.de/" />
        <meta property="og:title" content="PlatzPilot – Kostenlose Sitzplan- & Eventplanung" />
        <meta property="og:description" content="Kostenlose Sitzpläne per Drag & Drop für Vereine, Hochzeiten und Events. Gästelisten importieren, ToGo-Bestellungen verwalten und als PDF exportieren." />
        <meta property="og:url" content="https://platzpilot.de/" />
        <meta name="twitter:title" content="PlatzPilot – Kostenlose Sitzplan- & Eventplanung" />
        <meta name="twitter:description" content="Kostenlose Sitzpläne per Drag & Drop für Vereine, Hochzeiten und Events. Gästelisten importieren, ToGo-Bestellungen verwalten und als PDF exportieren." />
      </Helmet>
      
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        {/* Navigation */}
        <nav aria-label="Hauptnavigation" style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff'
        }}>
          <Link to="/" style={{ textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
            PlatzPilot
          </Link>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link to="/sitzplan-verein" style={{ textDecoration: 'none', color: '#666' }}>Für Vereine</Link>
            <Link to="/sitzplan-hochzeit" style={{ textDecoration: 'none', color: '#666' }}>Für Hochzeiten</Link>
            <Link to="/gaesteliste" style={{ textDecoration: 'none', color: '#666' }}>Gästeliste</Link>
            {auth.user ? (
              <Link to="/app" style={{
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: '#fff',
                borderRadius: '4px'
              }}>
                Zur App
              </Link>
            ) : (
              <Link to="/login" style={{
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: '#fff',
                borderRadius: '4px'
              }}>
                Anmelden
              </Link>
            )}
          </div>
        </nav>

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
            🚀 <strong>PlatzPilot befindet sich in der Entwicklung</strong> – Testen Sie diese Beta-Version kostenlos. Ihre Daten sind sicher und Sie können jederzeit Feedback geben!
          </div>
          {/* Hero Section */}
          <section style={{ textAlign: 'center', marginBottom: '5rem', paddingTop: '2rem' }}>
            <h1 style={{ fontSize: '2.8rem', marginBottom: '1rem', color: '#2c3e50', fontWeight: '700' }}>
              Sitzpläne und Raumplanung für alle Veranstaltungen
            </h1>
            <p style={{ fontSize: '1.3rem', color: '#666', marginBottom: '2.5rem', lineHeight: '1.6', maxWidth: '800px', margin: '0 auto 2.5rem' }}>
              PlatzPilot ist das Tool für Vereine, Hochzeiten und Events. 
              Erstellen Sie Sitzpläne per Drag & Drop, importieren Sie Gästelisten und behalten Sie den Überblick – 
              speziell optimiert für Vereine mit zusätzlichen Verwaltungsfunktionen.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
              {auth.user ? (
                <Link to="/app" style={{
                  textDecoration: 'none',
                  padding: '1rem 2rem',
                  backgroundColor: '#007bff',
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
                    backgroundColor: '#28a745',
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
            <p style={{ fontSize: '0.95rem', color: '#999' }}>
              Keine Kreditkarte nötig · Alle Features inklusive · Unbegrenzte Events
            </p>
          </section>
          
          {/* Two Main Sections: Vereine & Hochzeiten */}
          <section style={{ marginBottom: '5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {/* Vereine Section */}
            <div style={{ 
              padding: '3rem',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '2px solid #007bff'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem', textAlign: 'center' }}>🏛️</div>
              <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '1rem', color: '#2c3e50' }}>
                Für Vereine
              </h2>
              <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '1.5rem', textAlign: 'center' }}>
                Vereinsverwaltung, Mitgliederverwaltung, Rollen-System, Intelligente Sitzpläne und ToGo-Bestellungen – 
                alles speziell für Sportvereine, Kulturvereine und Freizeitvereine optimiert.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link to="/sitzplan-verein" style={{
                  textDecoration: 'none',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  Mehr erfahren
                </Link>
                {!auth.user && (
                  <Link to="/register" style={{
                    textDecoration: 'none',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#e9ecef',
                    color: '#007bff',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: '1px solid #007bff'
                  }}>
                    Kostenlos starten
                  </Link>
                )}
              </div>
            </div>

            {/* Hochzeiten & Events Section */}
            <div style={{ 
              padding: '3rem',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '2px solid #e91e63'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem', textAlign: 'center' }}>💐</div>
              <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '1rem', color: '#2c3e50' }}>
                Für Hochzeiten & Events
              </h2>
              <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '1.5rem', textAlign: 'center' }}>
                Der perfekte Sitzplan für Hochzeiten, Jubiläen, Geburtstage und Firmenfeiern. 
                Visuelle Planung, Gästeverwaltung und PDF-Export – stressfrei und benutzerfreundlich.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link to="/sitzplan-hochzeit" style={{
                  textDecoration: 'none',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#e91e63',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  Mehr erfahren
                </Link>
                {!auth.user && (
                  <Link to="/register" style={{
                    textDecoration: 'none',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#ffe0f0',
                    color: '#e91e63',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: '1px solid #e91e63'
                  }}>
                    Kostenlos starten
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section style={{ marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '2.2rem', textAlign: 'center', marginBottom: '3rem', color: '#2c3e50' }}>
              Alles, was Sie für Ihr Event brauchen
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
              <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🪑</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#2c3e50' }}>Raumplanung per Drag & Drop</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Erstellen Sie Raumlayouts mit beliebig vielen Tischen. 
                  Platzieren Sie Gäste per Drag & Drop und passen Sie Tischgrößen flexibel an.
                </p>
              </div>
              
              <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#2c3e50' }}>Gästeverwaltung</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Importieren Sie Gästelisten per CSV oder erfassen Sie Gruppen manuell. 
                  Anreden, Gruppengröße, Zeitfenster und Notizen werden unterstützt.
                </p>
              </div>
              
              <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🍔</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#2c3e50' }}>ToGo-Bestellungen <span style={{ fontSize: '0.8rem', backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '0.3rem 0.6rem', borderRadius: '12px', fontWeight: 'bold' }}>Vereine</span></h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Verwalten Sie Abholbestellungen für Vereinsfeste oder Events. 
                  Speisekarte anlegen, Bestellungen erfassen und Statusverfolgung – nur für Vereine verfügbar.
                </p>
              </div>
              
              <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#2c3e50' }}>Auto-Platzierung</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Lassen Sie PlatzPilot die optimale Sitzordnung berechnen. 
                  Der Algorithmus berücksichtigt Gruppengröße und Tischkapazität automatisch.
                </p>
              </div>
              
              <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏰</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#2c3e50' }}>Timeline-Ansicht</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Sehen Sie auf einen Blick, welche Gäste wann kommen. 
                  Die Timeline sortiert alle Gruppen nach Ankunftszeit in übersichtlichen Spalten.
                </p>
              </div>
              
              <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📥</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#2c3e50' }}>Import & Export</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Importieren Sie bestehende Gästelisten aus Excel/CSV. 
                  Exportieren Sie fertige Sitzpläne als druckfertiges PDF oder als CSV-Datei.
                </p>
              </div>
            </div>
          </section>
          
          {/* Use Cases Section */}
          <section style={{ marginBottom: '5rem', padding: '3rem', backgroundColor: '#fff', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '2.2rem', textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
              Für jede Veranstaltung geeignet
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏛️</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Vereine</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Planen Sie Sitzordnungen für Mitgliederversammlungen, Weihnachtsfeiern oder Sommerfeste. 
                  Importieren Sie die Mitgliederliste und verteilen Sie die Plätze.
                </p>
              </div>
              
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💐</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Hochzeiten & Feiern</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Erstellen Sie den perfekten Sitzplan für Ihre Hochzeit oder Familienfeier. 
                  Bestimmen Sie, welche Gäste zusammen sitzen.
                </p>
              </div>
              
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎪</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Große Events</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Skalierbar für größere Veranstaltungen mit hunderten Gästen. 
                  Unterstützung für komplexe Raumaufteilungen und mehrfache Ereignisse.
                </p>
              </div>
            </div>
          </section>
          
          {/* Pricing Section */}
          <section style={{ marginBottom: '5rem', padding: '3rem', backgroundColor: '#f1f3f5', borderRadius: '8px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem', color: '#2c3e50' }}>
              Dauerhaft kostenlos in der Beta
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
              PlatzPilot ist aktuell vollständig kostenlos nutzbar – während der Betaphase ohne Nutzungsbeschränkungen und ohne versteckte Kosten.
            </p>
            <div style={{ 
              maxWidth: '500px', 
              margin: '0 auto', 
              padding: '2rem', 
              backgroundColor: '#fff', 
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '2px solid #28a745'
            }}>
              <div style={{ 
                display: 'inline-block',
                padding: '0.5rem 1rem',
                backgroundColor: '#ffc107',
                color: '#000',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                marginBottom: '1rem'
              }}>
                Beta – Kostenlos testen
              </div>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Alle Features</h3>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>Für Vereine, Hochzeiten & private Events</p>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                textAlign: 'left',
                fontSize: '1rem',
                color: '#666',
                lineHeight: '2'
              }}>
                <li>✓ Unbegrenzte Events & Räume</li>
                <li>✓ CSV-Import & PDF-Export</li>
                <li>✓ Automatische Platzierung</li>
                <li>✓ Timeline-Ansicht</li>
                <li>✓ Gäste- & Gruppenverwaltung</li>
                <li>✓ <strong>Für Vereine:</strong> Mitgliederverwaltung, Rollen-System, ToGo-Bestellungen</li>
              </ul>
            </div>
          </section>
          
          {/* How It Works Section */}
          <section style={{ marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '2.2rem', textAlign: 'center', marginBottom: '3rem', color: '#2c3e50' }}>
              In 3 Schritten zum fertigen Event
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: '2rem' }}>
              <div style={{ flex: '1 1 250px', maxWidth: '300px', textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  margin: '0 auto 1rem'
                }}>1</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Registrieren</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Erstellen Sie kostenlos ein Konto mit Name, E-Mail und Passwort. In unter 30 Sekunden startklar.
                </p>
              </div>
              
              <div style={{ flex: '1 1 250px', maxWidth: '300px', textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  margin: '0 auto 1rem'
                }}>2</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Raum & Gäste anlegen</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Erstellen Sie einen Raum mit Tischen, importieren Sie Ihre Gästeliste per CSV oder legen Sie Gruppen manuell an.
                </p>
              </div>
              
              <div style={{ flex: '1 1 250px', maxWidth: '300px', textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  margin: '0 auto 1rem'
                }}>3</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#2c3e50' }}>Planen & Exportieren</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Platzieren Sie Gäste per Drag & Drop oder automatisch. Exportieren Sie den fertigen Sitzplan als PDF.
                </p>
              </div>
            </div>
          </section>
          
          {/* CTA Section */}
          <section style={{ textAlign: 'center', padding: '3rem 2rem', backgroundColor: '#007bff', color: '#fff', borderRadius: '8px', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              Starten Sie jetzt mit Ihrer Planung
            </h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }}>
              Kostenlos und ohne Verpflichtung. In wenigen Minuten einsatzbereit.
            </p>
            {auth.user ? (
              <Link to="/app" style={{
                textDecoration: 'none',
                padding: '1rem 2rem',
                backgroundColor: '#fff',
                color: '#007bff',
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
                color: '#007bff',
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
        
        {/* Footer */}
        <footer style={{
          borderTop: '1px solid #e0e0e0',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#fff',
          color: '#666'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#333', fontSize: '1.2rem' }}>PlatzPilot</strong>
            </div>
            <p style={{ marginBottom: '1rem' }}>
              Kostenlose Raum- & Tischplanung für Vereine, Hochzeiten und Events.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', fontSize: '0.9rem' }}>
              <Link to="/sitzplan-verein" style={{ textDecoration: 'none', color: '#666' }}>Für Vereine</Link>
              <Link to="/sitzplan-hochzeit" style={{ textDecoration: 'none', color: '#666' }}>Für Hochzeiten</Link>
              <Link to="/gaesteliste" style={{ textDecoration: 'none', color: '#666' }}>Gästeliste</Link>
              <Link to="/login" style={{ textDecoration: 'none', color: '#666' }}>Login</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
