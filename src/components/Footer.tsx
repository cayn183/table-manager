import React, { useEffect, useState } from 'react'
import '../styles/footer.css'
import api from '../api/apiClient'

export default function Footer() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        await api.get('/')
        if (mounted) setOk(true)
      } catch (e) {
        if (mounted) setOk(false)
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  const text = ok === true ? 'DB erreichbar' : ok === false ? 'DB nicht erreichtbar' : 'DB...'

  return (
    <footer className="app-footer no-print" style={{ padding: '0.5rem', borderTop: '1px solid #ccc' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
        <div className="footer-content" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
          <span className={`db-dot ${ok === true ? 'ok' : ok === false ? 'err' : 'unknown'}`} aria-hidden="true" />
          <span className="db-text">{text}</span>
        </div>
      </div>
    </footer>
  )
}
