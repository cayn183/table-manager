import React, { useState } from 'react'
import api from '../api/apiClient'
import { useAuth } from '../auth/AuthContext'

function collectMetadata() {
  const nav = (window.navigator as any)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const conn = (nav && nav.connection) ? { effectiveType: nav.connection.effectiveType, downlink: nav.connection.downlink } : null
  return {
    url: window.location.href,
    path: window.location.pathname,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    screen: { width: window.screen?.width, height: window.screen?.height, dpr: window.devicePixelRatio },
    userAgent: navigator.userAgent,
    app: { version: (import.meta.env.VITE_BUILD_VERSION || null), sha: (import.meta.env.VITE_BUILD_SHA || null) },
    locale: navigator.language || null,
    timezone: tz || null,
    network: { online: navigator.onLine, connection: conn }
  }
}

export default function FeedbackForm() {
  const { token, user } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [headline, setHeadline] = useState('')
  const [message, setMessage] = useState('')
  const [headlineError, setHeadlineError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setHeadlineError(null)
    if (!headline.trim()) { setHeadlineError('Headline ist erforderlich'); return }
    setLoading(true)
    try {
      const metadata = collectMetadata()
      // allow empty message (no description) — send empty string if none
      await api.post('/feedback', { headline: headline, email: email || null, message: message || '', metadata }, token ?? undefined)
      setDone(true)
      setHeadline('')
      setMessage('')
    } catch (err: any) {
      alert(err?.message || 'Failed to submit')
    } finally { setLoading(false) }
  }

  if (done) return <div style={{ padding: 12, background: '#f6ffed', border: '1px solid #d1f7c4', borderRadius: 6 }}>Danke für dein Feedback!</div>

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input placeholder="Kurze Headline (z.B. 'Fehler beim Speichern')" value={headline} onChange={e => setHeadline(e.target.value)} aria-invalid={!!headlineError} style={{ padding: 8, borderRadius: 6, border: '1px solid #e6e7ea' }} />
      {headlineError && <div style={{ color: '#b91c1c', fontSize: 12 }}>{headlineError}</div>}
      <input placeholder="E-Mail (optional)" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #e6e7ea' }} />
      <textarea placeholder="Dein Feedback" value={message} onChange={e => setMessage(e.target.value)} rows={6} style={{ padding: 8, borderRadius: 6, border: '1px solid #e6e7ea' }} />
      <div style={{ fontSize: 12, color: '#64748b' }}>Wir sammeln automatisch technische Metadaten (Browser, Viewport, App-Version) zur Analyse. Keine Passwörter werden erfasst.</div>
      <button type="submit" disabled={loading} style={{ alignSelf: 'flex-start' }}>{loading ? 'Senden…' : 'Feedback senden'}</button>
    </form>
  )
}
