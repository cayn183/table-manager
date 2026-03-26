import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function PublicLayoutNoFooter() {
  const auth = useAuth()
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Simple navigation bar for public pages */}
      <nav style={{
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
      
      {/* Main content area */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}
