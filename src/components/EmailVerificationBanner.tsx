import React, { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import api from '../api/apiClient'

export default function EmailVerificationBanner() {
  const { user, token, refreshUser, logout } = useAuth()
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<number>(0)

  const secondsLeft = useMemo(() => {
    const now = Date.now()
    return Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  }, [cooldownUntil, sending, checking, msg])

  if (!user || user.email_verified) return null

  async function resendVerification() {
    if (secondsLeft > 0) return
    setMsg(null)
    setSending(true)
    try {
      const res = await api.post('/auth/resend-verification', undefined, token || undefined)
      if (res?.already_verified) {
        await refreshUser()
        setMsg('E-Mail ist bereits verifiziert.')
        return
      }
      setMsg('Bestätigungs-E-Mail wurde gesendet.')
      setCooldownUntil(Date.now() + 60_000)
    } catch (err: any) {
      if (err?.message === 'Missing token' || err?.message === 'Invalid token') {
        setMsg('Sitzung abgelaufen. Bitte erneut einloggen.')
        setTimeout(() => logout(), 1200)
      } else {
        setMsg(err?.message || 'Erneutes Senden fehlgeschlagen.')
      }
    } finally {
      setSending(false)
    }
  }

  async function checkVerified() {
    setMsg(null)
    setChecking(true)
    try {
      await refreshUser()
      setMsg('Status aktualisiert.')
    } catch (err: any) {
      setMsg(err?.message || 'Status konnte nicht aktualisiert werden.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div style={{
      marginBottom: 16,
      padding: '12px 14px',
      borderRadius: 8,
      border: '1px solid #f59e0b',
      background: '#fffbeb',
      color: '#92400e',
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      <div>
        <div style={{ fontWeight: 700 }}>E-Mail noch nicht verifiziert</div>
        <div style={{ fontSize: 13 }}>Bitte bestätige deine E-Mail-Adresse, um alle Funktionen nutzen zu können.</div>
        {msg && <div style={{ marginTop: 6, fontSize: 13 }}>{msg}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={resendVerification}
          disabled={sending || secondsLeft > 0}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d97706', background: '#fff', color: '#92400e', cursor: (sending || secondsLeft > 0) ? 'not-allowed' : 'pointer' }}
        >
          {sending ? 'Sende…' : secondsLeft > 0 ? `Erneut senden (${secondsLeft}s)` : 'Erneut senden'}
        </button>
        <button
          onClick={checkVerified}
          disabled={checking}
          style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#d97706', color: 'white', cursor: checking ? 'not-allowed' : 'pointer' }}
        >
          {checking ? 'Prüfe…' : 'Ich habe verifiziert'}
        </button>
      </div>
    </div>
  )
}
