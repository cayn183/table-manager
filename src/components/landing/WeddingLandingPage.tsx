import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function WeddingLandingPage() {
  const auth = useAuth()
  
  return (
    <>
      <Helmet>
        <title>Sitzplan & Gästeliste für Hochzeiten erstellen - PlatzPilot</title>
        <meta name="description" content="Hochzeits-Sitzplan & Gästeliste online erstellen. RSVP-Tracking, Einladungen per WhatsApp/E-Mail, CSV-Import und PDF-Export – kostenlos." />
        <meta name="keywords" content="Gästeliste Hochzeit, Gästelistenmanagement, Gästeliste online verwalten, Hochzeit Gästeliste Tool, Sitzplan Hochzeit, Tischplan Hochzeit, Sitzordnung erstellen, RSVP Hochzeit, Einladungsmanagement, Gästeplanung Hochzeit, Gästeliste erstellen kostenlos" />
        <link rel="canonical" href="https://platzpilot.de/sitzplan-hochzeit" />
        <meta property="og:title" content="Sitzplan & Gästeliste für Hochzeiten erstellen - PlatzPilot" />
        <meta property="og:description" content="Hochzeits-Sitzplan & Gästeliste online erstellen. RSVP-Tracking, Einladungen per WhatsApp/E-Mail, CSV-Import und PDF-Export – kostenlos." />
        <meta property="og:url" content="https://platzpilot.de/sitzplan-hochzeit" />
        <meta name="twitter:title" content="Sitzplan & Gästeliste für Hochzeiten erstellen - PlatzPilot" />
        <meta name="twitter:description" content="Hochzeits-Sitzplan & Gästeliste online erstellen. RSVP-Tracking, Einladungen per WhatsApp/E-Mail, CSV-Import und PDF-Export – kostenlos." />
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
            Gästeliste & Sitzplan für Ihre Hochzeit
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            PlatzPilot vereint Gästelistenmanagement und Sitzplanung in einem Tool: Verwalten Sie Ihre 
            komplette Gästeliste online, versenden Sie Einladungen per WhatsApp, E-Mail oder QR-Code, 
            tracken Sie Zu- und Absagen in Echtzeit und erstellen Sie den perfekten Sitzplan. 
            Perfekt für Hochzeiten, Jubiläen, Geburtstage und andere Feiern.
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
            Gästelistenmanagement & Sitzplanung — alles in einem
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
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Gästeliste verwalten</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Erstellen Sie Ihre komplette Gästeliste online. Organisieren Sie Gäste in Kategorien 
                wie „Familie Braut", „Freunde" oder „Arbeitskollegen". Erfassen Sie Personenanzahl, 
                Kinder, Ernährungswünsche und Unterkunftsbedarf — alles an einem Ort.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>CSV-Import & Export</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Importieren Sie Ihre bestehende Gästeliste aus Excel oder CSV mit einem Klick.
                Exportieren Sie jederzeit Ihre aktuelle Liste als druckfertige CSV-Datei 
                mit allen Details — perfekt für Location, Catering und Druckerei.
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
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>RSVP-Tracking & Statistiken</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Behalten Sie den Überblick: Wer hat zugesagt, wer hat abgesagt, wer steht noch aus? 
                Sehen Sie auf einen Blick die Anzahl der Erwachsenen, Kinder, Unterkunftsbedarf 
                und Aufschlüsselungen nach Kategorie.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💌</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Einladungen versenden</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Versenden Sie digitale Einladungen direkt aus PlatzPilot — per WhatsApp, E-Mail 
                oder als QR-Code für gedruckte Karten. Jeder Gast erhält einen persönlichen 
                Einladungslink mit Online-RSVP.
              </p>
            </div>
          </div>
        </section>
        
        {/* Use Cases Section */}
        <section style={{ marginBottom: '4rem', padding: '3rem', backgroundColor: '#fff5f8', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
            Gästeliste & Sitzplan — perfekt für jede Feier
          </h2>
          <ul style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '2.2', color: '#555' }}>
            <li><strong>💍 Hochzeiten:</strong> Gästeliste erstellen, Einladungen versenden, RSVP tracken und den perfekten Sitzplan bauen</li>
            <li><strong>🎉 Jubiläen:</strong> Silberhochzeit, Goldhochzeit — Gäste in Kategorien organisieren und übersichtlich planen</li>
            <li><strong>🎊 Geburtstage:</strong> Große Feiern mit komfortablem Gästelistenmanagement und automatischer Sitzplanung</li>
            <li><strong>💼 Firmenfeiern:</strong> Bewirtung planen, Gästegruppen verwalten, Sitzordnung für Konferenzen und Galas</li>
            <li><strong>✨ Gala-Events:</strong> Professionelles Einladungsmanagement mit QR-Codes und personalisierten Links</li>
          </ul>
        </section>
        
        {/* Guest List Management Detail Section */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '1rem', color: '#2c3e50' }}>
            So funktioniert Ihr Gästelistenmanagement
          </h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '3rem', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto 3rem' }}>
            In drei einfachen Schritten von der leeren Gästeliste zur perfekten Feier
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#e91e63', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem' }}>1</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#2c3e50' }}>Gästeliste erstellen</h3>
              <p style={{ color: '#666', lineHeight: '1.6', fontSize: '0.95rem' }}>
                Erfassen Sie Gäste manuell oder importieren Sie Ihre bestehende Liste als CSV-Datei. 
                Ordnen Sie Gäste in Kategorien ein und erfassen Sie alle Details wie Personenanzahl, 
                Kinder und besondere Wünsche.
              </p>
            </div>
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#e91e63', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem' }}>2</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#2c3e50' }}>Einladungen versenden</h3>
              <p style={{ color: '#666', lineHeight: '1.6', fontSize: '0.95rem' }}>
                Versenden Sie digitale Einladungen per WhatsApp, E-Mail oder als QR-Code für gedruckte Karten. 
                Jeder Gast erhält einen persönlichen Link und kann online zu- oder absagen.
              </p>
            </div>
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#e91e63', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '1rem' }}>3</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#2c3e50' }}>Rückmeldungen tracken</h3>
              <p style={{ color: '#666', lineHeight: '1.6', fontSize: '0.95rem' }}>
                Sehen Sie in Echtzeit, wer zugesagt hat. Filtern Sie nach Status oder Kategorie, 
                exportieren Sie die finale Liste für Catering und Location und drucken Sie eine 
                übersichtliche Gästeliste aus.
              </p>
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

        {/* Cross-Link */}
        <section style={{ textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
          <p style={{ color: '#666', fontSize: '1rem' }}>
            <Link to="/gaesteliste" style={{ color: '#007bff', textDecoration: 'underline' }}>Gästeliste online erstellen</Link>
            {' \u00b7 '}
            Sie organisieren ein Vereinsfest? <Link to="/sitzplan-verein" style={{ color: '#007bff', textDecoration: 'underline' }}>PlatzPilot für Vereine entdecken →</Link>
          </p>
        </section>

      </div>
    </>
  )
}
