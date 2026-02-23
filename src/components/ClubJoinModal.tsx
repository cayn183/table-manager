import React, { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { joinClub } from '../api/clubApi'
import { useClubs } from './ClubContext'

interface Props {
  onClose: () => void
}

export default function ClubJoinModal({ onClose }: Props) {
  const { token } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { refreshClubs, setActiveClubId } = useClubs()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setError('Bitte gib einen Einladungscode ein.'); return }
    setLoading(true)
    setError(null)
    try {
      const club = await joinClub(trimmed, token || undefined)
      await refreshClubs()
      setActiveClubId(club.id)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Beitritt fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 32, minWidth: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>🤝 Verein beitreten</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Gib den Einladungscode ein, den du von deinem Verein erhalten hast.</p>
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 500 }}>{error}</div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Einladungscode *</label>
            <input
              type="text"
              placeholder="z.B. A1B2C3D4E5F6"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              autoFocus
              maxLength={20}
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 16, fontFamily: 'monospace', letterSpacing: 2, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
              onFocus={e => e.target.style.borderColor = '#667eea'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
            >
              {loading ? 'Beitritt läuft…' : 'Beitreten'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '12px 24px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
