import React from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import UserMenu from './UserMenu'

export default function AppLayout() {
  const auth = useAuth()
  const navigate = useNavigate()
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      {/* App navigation bar */}
      <nav style={{
        padding: '1rem 2rem',
        backgroundColor: '#2c3e50',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/app" style={{ textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
            PlatzPilot
          </Link>
          <Link to="/app" style={{ textDecoration: 'none', color: '#ecf0f1' }}>Dashboard</Link>
          <Link to="/app/events" style={{ textDecoration: 'none', color: '#ecf0f1' }}>Events</Link>
        </div>
        <UserMenu />
      </nav>
      
      {/* Main app content area */}
      <main style={{ flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
