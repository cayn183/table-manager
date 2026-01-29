import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import logger from '../utils/logger'
import FeedbackForm from './FeedbackForm'

export default function UserMenu() {
  const { user, logout, token } = useAuth()
  const [showFeedback, setShowFeedback] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  // Keep hooks at top level so render hook count is stable even when `user` is null

  if (!user) return null

  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase()

  

  return (
    <div ref={ref} style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="User menu"
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          border: 'none',
          background: '#2b6cb0',
          color: 'white',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        {initial}
      </button>
      {open && (
        <div style={{ marginTop: 8, minWidth: 160, background: 'white', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', borderRadius: 6 }}>
          <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
            <div style={{ fontWeight: 700 }}>{user.name || user.email}</div>
          </div>
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '6px 8px' }}>Profile</button>
            </Link>
            {(user as any).is_admin && (
              <Link to="/admin" style={{ textDecoration: 'none' }}>
                <button onClick={() => setOpen(false)} style={{ width: '100%', padding: '6px 8px' }}>Admin Center</button>
              </Link>
            )}
            <button onClick={() => { setOpen(false); setShowFeedback(true) }} style={{ width: '100%', padding: '6px 8px' }}>Feedback</button>
            <button onClick={() => { logout(); setOpen(false) }} style={{ width: '100%', padding: '6px 8px' }}>Logout</button>
          </div>
        </div>
      )}
      {/* Feedback modal */}
      {showFeedback && (
        <div onClick={() => setShowFeedback(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 96%)', background: 'white', borderRadius: 8, padding: 16, boxShadow: '0 10px 40px rgba(2,6,23,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Feedback senden</h3>
              <button onClick={() => setShowFeedback(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>
            <FeedbackForm />
          </div>
        </div>
      )}
    </div>
  )
}
