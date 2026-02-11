import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function ClubLandingPage() {
  const auth = useAuth()
  
  return (
    <>
      <Helmet>
        <title>Sitzplan & ToGo-Bestellungen für Vereine - PlatzPilot</title>
        <meta name="description" content="PlatzPilot hilft Vereinen bei der Organisation von Veranstaltungen: Erstellen Sie Sitzpläne, verwalten Sie Tischreservierungen und koordinieren Sie ToGo-Bestellungen - alles in einer App." />
        <meta name="keywords" content="Sitzplan Verein, Tischplan Verein, ToGo Bestellungen, Vereinsveranstaltung planen, Sitzordnung Verein" />
      </Helmet>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Hero Section */}
        <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#2c3e50' }}>
            Sitzpläne & ToGo-Bestellungen für Vereine
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            PlatzPilot ist die ideale Lösung für Sportvereine, Kulturvereine und Freizeitvereine: 
            Organisieren Sie Veranstaltungen mit intelligenten Sitzplänen und koordinieren Sie 
            ToGo-Bestellungen für Events, Feste und Turniere.
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
            Perfekt für Vereinsveranstaltungen
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🪑</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Intelligente Sitzpläne</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Erstellen Sie flexible Tischordnungen für Vereinsfeste, Jahreshauptversammlungen 
                oder Sportveranstaltungen. Platzieren Sie Mitglieder automatisch oder manuell.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🍔</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>ToGo-Bestellungen</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Koordinieren Sie Essensbestellungen für Turniere oder Veranstaltungen. 
                Erfassen Sie Bestellungen zentral und behalten Sie den Überblick.
              </p>
            </div>
            
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>Gästelisten-Import</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Importieren Sie Mitgliederlisten aus CSV-Dateien. 
                Automatische Zuordnung zu Tischen spart Zeit und vermeidet Fehler.
              </p>
            </div>
          </div>
        </section>
        
        {/* Use Cases Section */}
        <section style={{ marginBottom: '4rem', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
            Ideal für diese Vereins-Events
          </h2>
          <ul style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '2', color: '#555' }}>
            <li><strong>Sportvereine:</strong> Turniere, Jubiläumsfeiern, Sponsorenabende</li>
            <li><strong>Kulturvereine:</strong> Konzerte, Theateraufführungen, Jahresempfänge</li>
            <li><strong>Schützenvereine:</strong> Königsessen, Schützenfeste</li>
            <li><strong>Karnevalsvereine:</strong> Sitzungen, Galas, Ehrungen</li>
            <li><strong>Freizeitvereine:</strong> Jahreshauptversammlungen, Sommerfeste</li>
          </ul>
        </section>
        
        {/* CTA Section */}
        <section style={{ textAlign: 'center', padding: '3rem 2rem', backgroundColor: '#007bff', color: '#fff', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Starten Sie jetzt kostenlos
          </h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
            Keine Kreditkarte erforderlich. In 2 Minuten einsatzbereit.
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
              Jetzt registrieren
            </Link>
          )}
        </section>
      </div>
    </>
  )
}
