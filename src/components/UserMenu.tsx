import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function UserMenu() {
  const { user, logout, token } = useAuth()
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
            <button onClick={() => { logout(); setOpen(false) }} style={{ width: '100%', padding: '6px 8px' }}>Logout</button>
          </div>
        </div>
      )}
        
    </div>
  )
}
