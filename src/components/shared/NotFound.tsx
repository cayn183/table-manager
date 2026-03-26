import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Seite nicht gefunden – PlatzPilot</title>
        <meta name="description" content="Die angeforderte Seite existiert nicht." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{ fontSize: '2rem', color: '#2c3e50', marginBottom: '1rem' }}>Seite nicht gefunden</h1>
          <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            Die Seite, die Sie suchen, existiert leider nicht oder wurde verschoben.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" style={{
              textDecoration: 'none',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>
              Zur Startseite
            </Link>
            <Link to="/sitzplan-verein" style={{ textDecoration: 'none', color: '#007bff', fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
              Für Vereine
            </Link>
            <Link to="/sitzplan-hochzeit" style={{ textDecoration: 'none', color: '#e91e63', fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
              Für Hochzeiten
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
