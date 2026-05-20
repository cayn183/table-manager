import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import UserMenu from './UserMenu'
import EmailVerificationBanner from '../auth/EmailVerificationBanner'
import { PageHeaderProvider, usePageHeader } from './PageHeaderContext'
import { HelpProvider, useHelp } from '../shared/HelpContext'
import HelpModal from '../shared/HelpModal'
import FeedbackForm from '../shared/FeedbackForm'
import BottomTabBar, { TAB_HEIGHT } from './BottomTabBar'
import BottomNav from './BottomNav'
import { EventTabProvider } from './EventTabContext'
import { useDeviceType } from '../../utils/useDeviceType'

function AppLayoutInner() {
  const { pageTitle, pageIcon, headerContent } = usePageHeader()
  const [showFeedback, setShowFeedback] = React.useState(false)
  const device = useDeviceType()
  const isMobile = device === 'mobile'
  const location = useLocation()
  const navigate = useNavigate()
  const lastNavRef = React.useRef(0)
  // Show back button on sub-pages (anything deeper than /app, /app/events, /app/profile, /app/togo)
  const isSubPage = isMobile && /^\/app\/(events|rooms|club)\/[^/]+/.test(location.pathname)
  function handleGoBack() {
    const now = Date.now()
    if (now - lastNavRef.current < 600) return
    lastNavRef.current = now
    try { navigate(-1) } catch { /* ignore */ }
  }
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      {/* Desktop / Tablet navigation bar */}
      {!isMobile && (
      <nav className="app-desktop-nav" style={{
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
        <Link to="/app" className="app-logo" style={{ textDecoration: 'none', fontSize: '1.6rem', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.02em' }}>
          PlatzPilot
        </Link>

        <div className="app-header-content" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
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
        {/* Desktop CTA: prominent text button to invite feedback */}
        {!isMobile && (
          <FeedbackCTA onOpen={() => setShowFeedback(true)} />
        )}
        <HelpButton />
        <UserMenu />
      </nav>
      )}

      {/* Mobile compact header */}
      {isMobile && (
        <header style={{
          padding: '0 10px',
          height: 48,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          zIndex: 100,
        }}>
          {isSubPage ? (
            <button
              onClick={handleGoBack}
              onTouchStart={handleGoBack}
              aria-label="Zurück"
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 20,
                padding: '4px 8px',
                cursor: 'pointer',
                flexShrink: 0,
                lineHeight: 1,
                WebkitTapHighlightColor: 'transparent',
                zIndex: 1200,
              }}
            >←</button>
          ) : (
            <Link to="/app" style={{ textDecoration: 'none', fontSize: '1.05rem', fontWeight: 'bold', color: '#fff', flexShrink: 0 }}>
              PlatzPilot
            </Link>
          )}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
            {pageTitle && (
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.92)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pageIcon && <span style={{ marginRight: 4 }}>{pageIcon}</span>}
                {pageTitle}
              </span>
            )}
          </div>
          <HelpButton mobile />
          <UserMenu />
        </header>
      )}
      
      {/* Main app content area */}
      <main className="app-main-content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...(isMobile ? { paddingBottom: TAB_HEIGHT + 8 } : {}),
      }}>
        <EmailVerificationBanner />
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      {isMobile && <BottomNav />}
      {/* Event sub-tab bar (overlays BottomNav when active inside event detail pages) */}
      {isMobile && <BottomTabBar />}

      <HelpModal />
      {/* Feedback modal (shared with UserMenu) */}
      {showFeedback && (
        <div onClick={() => setShowFeedback(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 96%)', background: 'white', borderRadius: 8, padding: 16, boxShadow: '0 10px 40px rgba(2,6,23,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Feedback senden</h3>
              <button onClick={() => setShowFeedback(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>
            <FeedbackForm onDone={() => setShowFeedback(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

function HelpButton({ mobile }: { mobile?: boolean }) {
  const { openHelp } = useHelp()
  const size = mobile ? 30 : 38
  return (
    <button
      onClick={() => openHelp()}
      aria-label="Anleitung öffnen"
      title="Anleitung"
      style={{
        background: 'rgba(255,255,255,0.18)',
        border: '1px solid rgba(255,255,255,0.35)',
        color: 'white',
        width: size,
        height: size,
        borderRadius: size / 2,
        cursor: 'pointer',
        fontSize: mobile ? 14 : 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      }}
    >📖</button>
  )
}

// Removed compact FeedbackButton; CTA handles prominent feedback action.

function FeedbackCTA({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Wünsche und Anregungen"
      title="Wünsche/Anregungen - Hier klicken"
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
        border: '1px solid rgba(255,255,255,0.16)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: 999,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
        transition: 'transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease',
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>💡</span>
      <span>Wünsche / Anregungen — Hier klicken</span>
    </button>
  )
}

export default function AppLayout() {
  return (
    <PageHeaderProvider>
      <HelpProvider>
        <EventTabProvider>
          <AppLayoutInner />
        </EventTabProvider>
      </HelpProvider>
    </PageHeaderProvider>
  )
}
