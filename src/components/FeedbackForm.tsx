import React, { useState } from 'react'
import api from '../api/apiClient'
import { useAuth } from '../auth/AuthContext'

export default function FeedbackForm() {
  const { token, user } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    try {
      await api.post('/feedback', { email: email || null, message }, token)
      setDone(true)
      setMessage('')
    } catch (err: any) {
      alert(err?.message || 'Failed to submit')
    } finally { setLoading(false) }
  }

  if (done) return <div style={{ padding: 12, background: '#f6ffed', border: '1px solid #d1f7c4', borderRadius: 6 }}>Danke für dein Feedback!</div>

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input placeholder="E-Mail (optional)" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #e6e7ea' }} />
      <textarea placeholder="Dein Feedback" value={message} onChange={e => setMessage(e.target.value)} rows={5} style={{ padding: 8, borderRadius: 6, border: '1px solid #e6e7ea' }} />
      <button type="submit" disabled={loading} style={{ alignSelf: 'flex-start' }}>{loading ? 'Senden…' : 'Feedback senden'}</button>
    </form>
  )
}
