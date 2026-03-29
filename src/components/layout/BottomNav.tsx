import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useClubs } from '../club/ClubContext'

export const BOTTOM_NAV_HEIGHT = 60

interface NavTab {
  label: string
  icon: string
  path: string
  match: (pathname: string) => boolean
}

const TABS: NavTab[] = [
  { label: 'Home',   icon: '🏠', path: '/app',          match: p => p === '/app' },
  { label: 'Events', icon: '📅', path: '/app/events',   match: p => p.startsWith('/app/events') },
  { label: 'Räume',  icon: '🪑', path: '/app/rooms',    match: p => p.startsWith('/app/rooms') },
  { label: 'Club',   icon: '👥', path: '',              match: p => p.startsWith('/app/club') },
  { label: 'Profil', icon: '👤', path: '/app/profile',  match: p => p.startsWith('/app/profile') },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { clubs, loading } = useClubs()

  function handleTabClick(tab: NavTab) {
    if (tab.label === 'Club') {
      if (!loading && clubs.length > 0) {
        navigate(`/app/club/${clubs[0].id}/events`)
      } else {
        // No clubs yet — go Home where create/join actions are available
        navigate('/app')
      }
      return
    }
    navigate(tab.path)
  }

  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: BOTTOM_NAV_HEIGHT,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: '#fff',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
        zIndex: 1999,
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {TABS.map(tab => {
        const active = tab.match(location.pathname)
        return (
          <button
            key={tab.label}
            onClick={() => handleTabClick(tab)}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: active ? 'rgba(102,126,234,0.06)' : 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? '#667eea' : '#6b7280',
              fontWeight: active ? 700 : 400,
              padding: 0,
              transition: 'color 0.15s, background 0.15s',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {active && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '15%',
                right: '15%',
                height: 3,
                borderRadius: '0 0 4px 4px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
              }} />
            )}
            <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 10 }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
