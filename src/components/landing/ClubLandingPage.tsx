import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function ClubLandingPage() {
  const auth = useAuth()
  
  return (
    <>
      <Helmet>
        <title>Vereinsverwaltung & Sitzpläne für Vereine - PlatzPilot</title>
        <meta name="description" content="PlatzPilot hilft Vereinen bei der Organisation: Verwaltung von Mitgliedern, Erstellen Sie Sitzpläne, verwalten Sie Reservierungen und koordinieren Sie ToGo-Bestellungen - alles mit Rollen-System für Vorstand." />
        <meta name="keywords" content="Sitzplan Verein, Tischplan Verein, ToGo Bestellungen, Vereinsveranstaltung planen, Vereinsverwaltung, Mitgliederverwaltung" />
        <link rel="canonical" href="https://platzpilot.de/sitzplan-verein" />
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
            Vereinsverwaltung leicht gemacht
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            PlatzPilot ist die ideale Lösung für Sportvereine, Kulturvereine und Freizeitvereine: 
            Verwalten Sie Ihre Mitglieder mit flexiblem Rollen-System, erstellen Sie Sitzpläne 
            für Ihre Events und koordinieren Sie ToGo-Bestellungen – alles ohne Umwege.
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
            Alles für die Vereinsverwaltung
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Mitgliederverwaltung</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Verwalten Sie die Kontaktdaten, Geburtsdaten, Telefonnummern und Adressen aller Mitglieder 
                zentral in PlatzPilot. Importieren Sie bestehende Listen oder erfassen Sie Mitglieder manuell.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔐</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Rollen & Berechtigungen</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Erteilen Sie dem Vorstand unterschiedliche Rollen (Owner, Vorstand, Mitglied). 
                Kontrollieren Sie, wer Veranstaltungen erstellen oder bearbeiten darf.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🪑</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Intelligente Sitzpläne</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Erstellen Sie flexible Tischordnungen für Vereinsfeste, Jahreshauptversammlungen, 
                Turniere. Automatische oder manuelle Platzierung mit Drag & Drop.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🍔</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>ToGo-Bestellungen</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Speisekarte anlegen, Bestellungen koordinieren und Überblick behalten. 
                Perfekt für Vereinsfeste, Wettkämpfe oder Veranstaltungen mit Catering.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Import & Export</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Importieren Sie Mitgliederlisten aus CSV-Dateien oder Excel. 
                Exportieren Sie fertige Sitzpläne als druckfertiges PDF.
              </p>
            </div>

            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Mehrere Events</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Erstellen Sie beliebig viele Events pro Verein. 
                Speichern Sie all Ihre Veranstaltungen zentral und greifen Sie jederzeit darauf zu.
              </p>
            </div>
          </div>
        </section>
        
        {/* Use Cases Section */}
        <section style={{ marginBottom: '4rem', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
            Ideal für diese Vereinsveranstaltungen
          </h2>
          <ul style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '2.2', color: '#555' }}>
            <li><strong>🏆 Sportvereine:</strong> Turniere, Jubiläumsfeiern, Sponsorenabende mit Mitgliederverwaltung</li>
            <li><strong>🎭 Kulturvereine:</strong> Konzerte, Theateraufführungen, Jahresempfänge, Ehrungen mit Platzreservierung</li>
            <li><strong>🔫 Schützenvereine:</strong> Königsessen, Schützenfeste mit Mitgliederlisten und Bestellungen</li>
            <li><strong>🎪 Karnevalsvereine:</strong> Sitzungen, Galas, große Veranstaltungen mit komplexer Tischordnung</li>
            <li><strong>🎉 Freizeitvereine:</strong> Jahreshauptversammlungen, Sommerfeste, Weihnachtsfeiern</li>
          </ul>
        </section>

      </div>
    </>
  )
}
