import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import UserMenu from './UserMenu'
import EmailVerificationBanner from './EmailVerificationBanner'
import { PageHeaderProvider, usePageHeader } from './PageHeaderContext'

function AppLayoutInner() {
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
        <Link to="/app" style={{ textDecoration: 'none', fontSize: '1.35rem', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.02em' }}>
          PlatzPilot
        </Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {pageTitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {pageIcon && <span style={{ fontSize: '18px' }}>{pageIcon}</span>}
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{pageTitle}</span>
            </div>
          )}

          {headerContent && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', minWidth: 0 }}>
              {headerContent}
            </div>
          )}
        </div>

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
