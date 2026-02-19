import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import api from '../api/apiClient'
import logger from '../utils/logger'
import FeedbackForm from './FeedbackForm'

const LAST_SEEN_KEY = 'platzpilot_last_seen_replies'

export function markRepliesSeen() {
  localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
  window.dispatchEvent(new CustomEvent('platzpilot:replies-seen'))
}

export default function UserMenu() {
  const { user, logout, token } = useAuth()
  const [showFeedback, setShowFeedback] = useState(false)
  const [open, setOpen] = useState(false)
  const [unreadReplies, setUnreadReplies] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  // Poll for unread incoming email replies (admins only)
  useEffect(() => {
    if (!(user as any)?.is_admin || !token) return
    const fetchUnread = async () => {
      try {
        const since = localStorage.getItem(LAST_SEEN_KEY) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const res = await api.get(`/admin/feedback/unread-replies?since=${encodeURIComponent(since)}`, token)
        setUnreadReplies(res?.count || 0)
      } catch { /* ignore */ }
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 60_000)
    // Immediately reset badge when another component calls markRepliesSeen()
    const onSeen = () => setUnreadReplies(0)
    window.addEventListener('platzpilot:replies-seen', onSeen)
    return () => { clearInterval(id); window.removeEventListener('platzpilot:replies-seen', onSeen) }
  }, [user, token])

  // Keep hooks at top level so render hook count is stable even when `user` is null

  if (!user) return null

  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase()

  

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 1000 }}>
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
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, minWidth: 160, background: 'white', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', borderRadius: 6 }}>
          <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
            <div style={{ fontWeight: 700 }}>{user.name || user.email}</div>
          </div>
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Link to="/app/profile" style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '6px 8px' }}>Profile</button>
            </Link>
            {(user as any).is_admin && (
              <Link to="/admin" style={{ textDecoration: 'none' }}>
                <button
                  onClick={() => { setOpen(false); markRepliesSeen(); setUnreadReplies(0) }}
                  style={{ width: '100%', padding: '6px 8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  Admin Center
                  {unreadReplies > 0 && (
                    <span style={{
                      background: '#dc2626',
                      color: '#fff',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 6px',
                      lineHeight: '16px',
                      minWidth: 18,
                      textAlign: 'center',
                    }}>{unreadReplies > 99 ? '99+' : unreadReplies}</span>
                  )}
                </button>
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
