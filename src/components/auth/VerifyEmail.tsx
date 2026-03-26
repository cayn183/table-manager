import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/apiClient'
import { useAuth } from '../../auth/AuthContext'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const tokenFromUrl = params.get('token') || ''
  const verificationType = params.get('type') || 'email' // 'email' or 'change'
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'no-token'>('verifying')
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const nav = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (!tokenFromUrl) { setStatus('no-token'); return }
    let cancelled = false
    ;(async () => {
      try {
        const endpoint = verificationType === 'change' ? '/auth/verify-email-change' : '/auth/verify-email'
        await api.post(endpoint, { token: tokenFromUrl })
        if (!cancelled) setStatus('success')
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error')
          setError(err?.message || 'Verifizierung fehlgeschlagen.')
        }
      }
    })()
    return () => { cancelled = true }
  }, [tokenFromUrl, verificationType])

  async function resendVerification() {
    setResending(true)
    setResendMsg(null)
    try {
      const res = await api.post('/auth/resend-verification')
      if (res?.already_verified) {
        setResendMsg('Deine E-Mail ist bereits bestätigt.')
      } else {
        setResendMsg('Neue Bestätigungs-E-Mail wurde gesendet!')
      }
    } catch (err: any) {
      setResendMsg(err?.message || 'Fehler beim erneuten Senden.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <h2 style={{ margin: 0 }}>
            {verificationType === 'change' ? 'Email-Änderung bestätigen' : 'E-Mail bestätigen'}
          </h2>
        </div>

        <div style={{ background: 'white', padding: 24, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.06)', textAlign: 'center' }}>
          {status === 'verifying' && (
            <p style={{ color: '#64748b' }}>
              {verificationType === 'change' ? 'Deine Email-Änderung wird verifiziert…' : 'Deine E-Mail wird verifiziert…'}
            </p>
          )}

          {status === 'success' && (
            <>
              <p style={{ color: '#22c55e', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
                {verificationType === 'change' ? 'Email-Änderung bestätigt!' : 'E-Mail bestätigt!'}
              </p>
              <p style={{ color: '#64748b' }}>
                {verificationType === 'change' 
                  ? 'Deine Email-Adresse wurde erfolgreich geändert. Bitte melde dich mit der neuen Email-Adresse an.' 
                  : 'Deine E-Mail-Adresse wurde erfolgreich verifiziert.'}
              </p>
              <button 
                onClick={() => {
                  if (verificationType === 'change') {
                    // For email change, log out (logout already navigates to /login)
                    auth.logout()
                  } else {
                    nav(auth.user ? '/app' : '/login')
                  }
                }} 
                style={{ marginTop: 16, padding: '10px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                {verificationType === 'change' ? 'Zum Login' : (auth.user ? 'Zur App' : 'Zum Login')}
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <p style={{ color: 'crimson', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Verifizierung fehlgeschlagen</p>
              <p style={{ color: '#64748b' }}>{error || 'Der Link ist ungültig oder abgelaufen.'}</p>
              {verificationType !== 'change' && auth.user && (
                <div style={{ marginTop: 16 }}>
                  <button onClick={resendVerification} disabled={resending} style={{ padding: '10px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    {resending ? 'Sende…' : 'Neue Bestätigungs-E-Mail senden'}
                  </button>
                  {resendMsg && <p style={{ marginTop: 8, fontSize: 14, color: '#64748b' }}>{resendMsg}</p>}
                </div>
              )}
              <button onClick={() => nav('/login')} style={{ marginTop: 12, padding: '10px 16px', borderRadius: 8, background: '#eef2ff', border: '1px solid #e6e6ff', cursor: 'pointer' }}>Zurück zum Login</button>
            </>
          )}

          {status === 'no-token' && (
            <>
              <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Kein Token vorhanden</p>
              <p style={{ color: '#64748b' }}>Bitte verwende den Link aus deiner Bestätigungs-E-Mail.</p>
              {verificationType !== 'change' && auth.user && (
                <div style={{ marginTop: 16 }}>
                  <button onClick={resendVerification} disabled={resending} style={{ padding: '10px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    {resending ? 'Sende…' : 'Neue Bestätigungs-E-Mail senden'}
                  </button>
                  {resendMsg && <p style={{ marginTop: 8, fontSize: 14, color: '#64748b' }}>{resendMsg}</p>}
                </div>
              )}
              <button onClick={() => nav('/login')} style={{ marginTop: 12, padding: '10px 16px', borderRadius: 8, background: '#eef2ff', border: '1px solid #e6e6ff', cursor: 'pointer' }}>Zurück zum Login</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
