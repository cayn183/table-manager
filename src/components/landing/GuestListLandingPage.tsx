import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function GuestListLandingPage() {
  const auth = useAuth()
  
  return (
    <>
      <Helmet>
        <title>Gästeliste online erstellen & verwalten – kostenlos | PlatzPilot</title>
        <meta name="description" content="Gästeliste online erstellen, Einladungen versenden und RSVP tracken. CSV-Import aus Excel, Kategorien, Statistiken und Sitzplan – kostenloses Gästelisten-Tool." />
        <meta name="keywords" content="Gästeliste erstellen, Gästelistenmanagement, Gästeliste Tool, Gästeliste online, Gästeliste verwalten, Gästeverwaltung Excel, RSVP Tracking, Einladungen versenden, Gästeliste kostenlos, Gästeliste App" />
        <link rel="canonical" href="https://platzpilot.de/gaesteliste" />
        <meta property="og:title" content="Gästeliste online erstellen & verwalten – kostenlos | PlatzPilot" />
        <meta property="og:description" content="Gästeliste online erstellen, Einladungen versenden und RSVP tracken. CSV-Import aus Excel, Kategorien, Statistiken und Sitzplan – kostenloses Gästelisten-Tool." />
        <meta property="og:url" content="https://platzpilot.de/gaesteliste" />
        <meta name="twitter:title" content="Gästeliste online erstellen & verwalten – kostenlos | PlatzPilot" />
        <meta name="twitter:description" content="Gästeliste online erstellen, Einladungen versenden und RSVP tracken. CSV-Import aus Excel, Kategorien, Statistiken und Sitzplan – kostenloses Gästelisten-Tool." />
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
            Gästeliste online erstellen und verwalten
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            PlatzPilot ist das kostenlose Gästelisten-Tool für Hochzeiten, Geburtstage und Events: 
            Gäste erfassen oder aus Excel importieren, Einladungen per WhatsApp oder E-Mail versenden 
            und Zu- und Absagen in Echtzeit tracken.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
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
        </section>

        {/* Features Section */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '3rem', color: '#2c3e50' }}>
            Alles für Ihr Gästelistenmanagement
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Gästeliste erstellen</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Erfassen Sie Gäste einzeln oder importieren Sie bestehende Listen aus Excel/CSV. 
                Name, E-Mail, Telefon, Personenanzahl, Kinder, Ernährungswünsche und Kategorien werden erfasst.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>RSVP-Tracking</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Sehen Sie auf einen Blick, wer zugesagt, abgesagt oder noch nicht geantwortet hat. 
                Statistiken nach Kategorie, Erwachsene, Kinder und Unterkunftsbedarf — alles automatisch.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💌</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Einladungen versenden</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Versenden Sie Einladungen per WhatsApp oder E-Mail direkt aus PlatzPilot. 
                Jeder Gast erhält einen persönlichen Link und kann online zu- oder absagen.
              </p>
            </div>

            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏷️</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Kategorien & Filter</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Organisieren Sie Gäste in Kategorien wie „Familie Braut", „Freunde" oder „Arbeitskollegen". 
                Suchen, filtern und sortieren Sie Ihre Liste nach beliebigen Kriterien.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📥</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Excel-Import & CSV-Export</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Haben Sie Ihre Gäste schon in Excel? Importieren Sie die Liste mit einem Klick. 
                Exportieren Sie jederzeit als CSV — perfekt für Location, Catering und Druckerei.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🖨️</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Drucken & Teilen</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Drucken Sie Ihre Gästeliste als übersichtliche Tabelle mit allen Details. 
                Oder teilen Sie einen offenen Anmeldelink, über den sich Gäste selbst eintragen können.
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section style={{ marginBottom: '4rem', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
            Gästelisten-Tool für jede Veranstaltung
          </h2>
          <ul style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '2.2', color: '#555' }}>
            <li><strong>💍 Hochzeiten:</strong> Gästeliste mit Kategorien (Familie Braut/Bräutigam), RSVP-Tracking und Einladungsversand</li>
            <li><strong>🎂 Geburtstage:</strong> Einladungen per WhatsApp versenden, Rückmeldungen tracken, Catering-Liste exportieren</li>
            <li><strong>🎉 Jubiläen:</strong> Große Feiern übersichtlich organisieren mit Gruppengrößen und Unterkunftsbedarf</li>
            <li><strong>🏛️ Vereinsfeste:</strong> Mitgliederlisten importieren und Anmeldungen verwalten</li>
            <li><strong>💼 Firmenfeiern:</strong> Abteilungen als Kategorien, Ernährungswünsche erfassen, Exportlisten für Catering</li>
          </ul>
        </section>
        
        {/* CTA Section */}
        <section style={{ textAlign: 'center', padding: '3rem 2rem', backgroundColor: '#007bff', color: '#fff', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Gästeliste jetzt kostenlos erstellen
          </h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
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

        {/* Cross-Links */}
        <section style={{ textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
          <p style={{ color: '#666', fontSize: '1rem' }}>
            <Link to="/sitzplan-hochzeit" style={{ color: '#e91e63', textDecoration: 'underline' }}>Sitzplan für Hochzeiten</Link>
            {' · '}
            <Link to="/sitzplan-verein" style={{ color: '#007bff', textDecoration: 'underline' }}>Vereinsverwaltung für Vereine</Link>
          </p>
        </section>

      </div>
    </>
  )
}
