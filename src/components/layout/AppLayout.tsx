import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import UserMenu from './UserMenu'
import EmailVerificationBanner from '../auth/EmailVerificationBanner'
import { PageHeaderProvider, usePageHeader } from './PageHeaderContext'
import { HelpProvider, useHelp } from '../shared/HelpContext'
import HelpModal from '../shared/HelpModal'

function AppLayoutInner() {
  const { pageTitle, pageIcon, headerContent } = usePageHeader()
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      {/* Unified navigation / header bar */}
      <nav style={{
        padding: '0 32px',
        height: '70px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 3px 14px rgba(0,0,0,0.22)',
        gap: '18px',
        flexShrink: 0,
        zIndex: 100
      }}>
        <Link to="/app" style={{ textDecoration: 'none', fontSize: '1.6rem', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.02em' }}>
          PlatzPilot
        </Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          {pageTitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {pageIcon && <span style={{ fontSize: '18px' }}>{pageIcon}</span>}
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{pageTitle}</span>
            </div>
          )}

          {headerContent && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0, height: '100%' }}>
              {headerContent}
            </div>
          )}
        </div>

        <HelpButton />
        <UserMenu />
      </nav>
      
      {/* Main app content area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmailVerificationBanner />
        <Outlet />
      </main>
      <HelpModal />
    </div>
  )
}

function HelpButton() {
  const { openHelp } = useHelp()
  return (
    <button
      onClick={() => openHelp()}
      aria-label="Anleitung öffnen"
      title="Anleitung"
      style={{
        background: 'rgba(255,255,255,0.18)',
        border: '1px solid rgba(255,255,255,0.35)',
        color: 'white',
        width: 38,
        height: 38,
        borderRadius: 19,
        cursor: 'pointer',
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >📖</button>
  )
}

export default function AppLayout() {
  return (
    <PageHeaderProvider>
      <HelpProvider>
        <AppLayoutInner />
      </HelpProvider>
    </PageHeaderProvider>
  )
}
