import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import api from '../api/apiClient'

type LoginProps = {
  initialMode?: 'login' | 'register'
}

export default function Login({ initialMode }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login'|'register'>(initialMode || 'login')
  const auth = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [emailExists, setEmailExists] = useState<boolean | null>(null)
  const [checkingEmail, setCheckingEmail] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const result = mode === 'login' ? await auth.login(email, password) : await auth.register(name, email, password)
      if (result.ok) nav('/app')
      else setError(result.error)
    } catch (err: any) {
      setError(err?.message || 'Fehler')
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requested = params.get('mode')
    if (requested === 'login' || requested === 'register') {
      setMode(requested)
    } else if (initialMode) {
      setMode(initialMode)
    }
  }, [location.search, initialMode])

  useEffect(() => {
    let mounted = true
    if (mode === 'register' && email) {
      setCheckingEmail(true)
      const t = setTimeout(async () => {
        try {
          const res = await api.post('/auth/check-email', { email })
          if (!mounted) return
          setEmailExists(!!res.exists)
        } catch (err) {
          if (!mounted) return
          setEmailExists(null)
        } finally {
          if (mounted) setCheckingEmail(false)
        }
      }, 400)
      return () => { mounted = false; clearTimeout(t) }
    } else {
      setEmailExists(null)
    }
  }, [email, mode])

  return (
    <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720 }}>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <h2 style={{ margin: 0 }}>{mode === 'login' ? 'Anmelden' : 'Registrieren'}</h2>
          <p style={{ marginTop: 8, color: '#64748b' }}>{mode === 'login' ? 'Melde dich an, um deine Events zu verwalten' : 'Erstelle ein Konto, um deine Events zu speichern'}</p>
        </div>

        <form onSubmit={submit} style={{ background: 'white', padding: 24, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
          {mode === 'register' && (
            <div style={{ marginBottom: 12 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
            {mode === 'register' && (
              <div style={{ fontSize: 12, marginTop: 8 }}>
                {checkingEmail ? <span>Prüfe E‑Mail…</span> : emailExists === true ? <span style={{ color: 'crimson' }}>E‑Mail bereits vergeben</span> : emailExists === false ? <span style={{ color: 'green' }}>E‑Mail verfügbar</span> : null}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-start', alignItems: 'center' }}>
            <button type="submit" style={{ padding: '10px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: 8 }}>{mode === 'login' ? 'Anmelden' : 'Registrieren'}</button>
            <button type="button" onClick={() => setMode(m => m === 'login' ? 'register' : 'login')} style={{ padding: '10px 16px', borderRadius: 8, background: '#eef2ff', border: '1px solid #e6e6ff' }}>{mode === 'login' ? 'Neu registrieren' : 'Zurück zum Login'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
