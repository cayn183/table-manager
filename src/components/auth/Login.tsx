import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import api from '../../api/apiClient'

type LoginProps = {
  initialMode?: 'login' | 'register'
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Schwach', color: '#ef4444' }
  if (score <= 2) return { score, label: 'Mittel', color: '#f59e0b' }
  if (score <= 3) return { score, label: 'Gut', color: '#3b82f6' }
  return { score, label: 'Stark', color: '#22c55e' }
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

  const passwordStrength = mode === 'register' && password ? getPasswordStrength(password) : null
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!emailValid && email) {
      setError('Bitte gib eine gueltige E-Mail-Adresse ein.')
      return
    }

    if (mode === 'register') {
      if (!name.trim()) { setError('Bitte gib deinen Namen ein.'); return }
      if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen lang sein.'); return }
    }

    try {
      const result = mode === 'login' ? await auth.login(email, password) : await auth.register(name, email, password)
      if (result.ok) {
        const params = new URLSearchParams(location.search)
        const redirect = params.get('redirect')
        nav(redirect ? decodeURIComponent(redirect) : '/app', { replace: true })
      } else setError(result.error)
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
    if (mode === 'register' && email && emailValid) {
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
  }, [email, mode, emailValid])

  // Already logged in → redirect to original URL or app (must be after all hooks)
  if (auth.user) {
    const params = new URLSearchParams(location.search)
    const redirect = params.get('redirect')
    return <Navigate to={redirect ? decodeURIComponent(redirect) : '/app'} replace />
  }

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
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail" type="email" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
            {mode === 'register' && email && !emailValid && (
              <div style={{ fontSize: 12, marginTop: 6, color: '#f59e0b' }}>Bitte gib eine gueltige E-Mail-Adresse ein.</div>
            )}
            {mode === 'register' && emailValid && (
              <div style={{ fontSize: 12, marginTop: 6 }}>
                {checkingEmail ? <span>Pruefe E&#8209;Mail…</span> : emailExists === true ? <span style={{ color: 'crimson' }}>E&#8209;Mail bereits vergeben</span> : emailExists === false ? <span style={{ color: 'green' }}>E&#8209;Mail verfuegbar</span> : null}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
            {mode === 'register' && passwordStrength && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= passwordStrength.score ? passwordStrength.color : '#e2e8f0' }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, marginTop: 4, color: passwordStrength.color, fontWeight: 600 }}>{passwordStrength.label}</div>
                {password.length > 0 && password.length < 8 && (
                  <div style={{ fontSize: 12, color: '#f59e0b' }}>Mindestens 8 Zeichen erforderlich</div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-start', alignItems: 'center' }}>
            <button type="submit" style={{ padding: '10px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: 8 }}>{mode === 'login' ? 'Anmelden' : 'Registrieren'}</button>
            <button type="button" onClick={() => setMode(m => m === 'login' ? 'register' : 'login')} style={{ padding: '10px 16px', borderRadius: 8, background: '#eef2ff', border: '1px solid #e6e6ff' }}>{mode === 'login' ? 'Neu registrieren' : 'Zurück zum Login'}</button>
          </div>
          {mode === 'login' && (
            <div style={{ marginTop: 12 }}>
              <Link to="/forgot-password" style={{ fontSize: 14, color: '#2b6cb0', textDecoration: 'none' }}>Passwort vergessen?</Link>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
