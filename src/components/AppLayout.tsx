import React from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import UserMenu from './UserMenu'
import EmailVerificationBanner from './EmailVerificationBanner'
import { PageHeaderProvider, usePageHeader } from './PageHeaderContext'

function AppLayoutInner() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { pageTitle, pageIcon, headerContent } = usePageHeader()
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      {/* Unified navigation / header bar */}
      <nav style={{
        padding: '0 24px',
        height: '56px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        gap: '16px',
        flexShrink: 0,
        zIndex: 100
      }}>
        {/* Left: Brand + Nav links */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexShrink: 0 }}>
          <Link to="/app" style={{ textDecoration: 'none', fontSize: '1.35rem', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.02em' }}>
            PlatzPilot
          </Link>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.25)' }} />
          <Link to="/app" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: 500, padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >Dashboard</Link>
          <Link to="/app/events" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: 500, padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >Events</Link>
        </div>

        {/* Center: Page title (optional) */}
        {pageTitle && (
          <>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {pageIcon && <span style={{ fontSize: '18px' }}>{pageIcon}</span>}
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{pageTitle}</span>
            </div>
          </>
        )}
        
        {/* Center/Right: Page-specific header content */}
        {headerContent && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, overflow: 'hidden' }}>
            {headerContent}
          </div>
        )}

        {/* Spacer when no header content */}
        {!headerContent && <div style={{ flex: 1 }} />}
        
        {/* Right: User menu */}
        <UserMenu />
      </nav>
      
      {/* Main app content area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmailVerificationBanner />
        <Outlet />
      </main>
    </div>
  )
}

export default function AppLayout() {
  return (
    <PageHeaderProvider>
      <AppLayoutInner />
    </PageHeaderProvider>
  )
}
