import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/apiClient'

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

export default function ResetPassword() {
  const [params] = useSearchParams()
  const tokenFromUrl = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const strength = password ? getPasswordStrength(password) : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!tokenFromUrl) { setError('Kein gueltiger Token vorhanden. Bitte fordere einen neuen Link an.'); return }
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen lang sein.'); return }
    if (password !== confirmPassword) { setError('Passwoerter stimmen nicht ueberein.'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token: tokenFromUrl, newPassword: password })
      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Zuruecksetzen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <h2 style={{ margin: 0 }}>Neues Passwort setzen</h2>
        </div>

        {done ? (
          <div style={{ background: 'white', padding: 24, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.06)', textAlign: 'center' }}>
            <p style={{ color: '#22c55e', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Passwort geaendert!</p>
            <p style={{ color: '#64748b' }}>Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
            <button onClick={() => nav('/login')} style={{ marginTop: 16, padding: '10px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Zum Login</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ background: 'white', padding: 24, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
            {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
            {!tokenFromUrl && (
              <div style={{ color: '#f59e0b', marginBottom: 12, fontSize: 14 }}>Kein Token in der URL gefunden. <button type="button" onClick={() => nav('/forgot-password')} style={{ color: '#2b6cb0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Neuen Link anfordern</button></div>
            )}
            <div style={{ marginBottom: 12 }}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Neues Passwort" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
              {strength && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength.score ? strength.color : '#e2e8f0' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: strength.color, fontWeight: 600 }}>{strength.label}</div>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Passwort bestaetigen" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="submit" disabled={loading || !tokenFromUrl} style={{ padding: '10px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{loading ? 'Setze zurueck...' : 'Passwort aendern'}</button>
              <button type="button" onClick={() => nav('/login')} style={{ padding: '10px 16px', borderRadius: 8, background: '#eef2ff', border: '1px solid #e6e6ff', cursor: 'pointer' }}>Zurueck zum Login</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
