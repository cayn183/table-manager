import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/apiClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email) { setError('Bitte E-Mail eingeben.'); return }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Senden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <h2 style={{ margin: 0 }}>Passwort vergessen</h2>
          <p style={{ marginTop: 8, color: '#64748b' }}>Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zuruecksetzen.</p>
        </div>

        {sent ? (
          <div style={{ background: 'white', padding: 24, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.06)', textAlign: 'center' }}>
            <p style={{ color: '#22c55e', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>E-Mail gesendet!</p>
            <p style={{ color: '#64748b' }}>Falls ein Konto mit dieser Adresse existiert, erhaeltst du in Kuerze eine E-Mail mit einem Link zum Zuruecksetzen deines Passworts.</p>
            <button onClick={() => nav('/login')} style={{ marginTop: 16, padding: '10px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Zurueck zum Login</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ background: 'white', padding: 24, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
            {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
            <div style={{ marginBottom: 16 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail" type="email" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="submit" disabled={loading} style={{ padding: '10px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{loading ? 'Sende...' : 'Link senden'}</button>
              <button type="button" onClick={() => nav('/login')} style={{ padding: '10px 16px', borderRadius: 8, background: '#eef2ff', border: '1px solid #e6e6ff', cursor: 'pointer' }}>Zurueck zum Login</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
