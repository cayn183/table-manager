import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getClub, getClubEvents, deleteClubEvent } from '../api/clubApi'
import type { Club, ClubEvent, ClubEventData } from '../types/club'
import { TEMPLATE_LABELS } from '../types/club'
import ClubEventWizardModal from './ClubEventWizardModal'

export default function ClubEvents() {
  const { clubId } = useParams<{ clubId: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [club, setClub] = useState<Club | null>(null)
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  const isVorstand = club?.my_role === 'owner' || club?.my_role === 'vorstand'

  function loadEvents() {
    if (!clubId) return
    Promise.all([
      getClub(clubId, token || undefined).then(setClub),
      getClubEvents(clubId, token || undefined).then(setEvents)
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { loadEvents() }, [clubId, token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(eventId: string, title: string) {
    if (!clubId) return
    if (!confirm(`Event "${title}" wirklich löschen?`)) return
    try {
      await deleteClubEvent(clubId, eventId, token || undefined)
      setEvents(prev => prev.filter(e => e.id !== eventId))
    } catch (err: any) {
      alert(err?.message || 'Fehler')
    }
  }

  function handleCreated(eventId: string) {
    setShowWizard(false)
    navigate(`/app/club/${clubId}/events/${eventId}`)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Laden…</div>
  if (!club) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Verein nicht gefunden.</div>

  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/app')} style={{ border: 'none', background: 'none', color: '#667eea', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16, padding: 0 }}>
        ← Zurück zum Dashboard
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          📂 Vereins-Events — {club.name}
        </h2>
        {isVorstand && (
          <button
            onClick={() => setShowWizard(true)}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white', border: 'none', borderRadius: 8,
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            + Neue Vereinsveranstaltung planen
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 8px' }}>Noch keine Vereins-Events vorhanden.</p>
          {isVorstand && (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              Klicke oben auf „Neue Vereinsveranstaltung planen", um loszulegen.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(ev => {
            const data: ClubEventData = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
            const modulePills: string[] = []
            if (data?.modules?.room) modulePills.push('🗺️ Raum')
            if (data?.modules?.food) modulePills.push('🍽️ Essen')
            if (data?.modules?.reservation) modulePills.push('📝 Reservierung')
            return (
              <div key={ev.id} style={{
                ...cardStyle,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
                onClick={() => navigate(`/app/club/${clubId}/events/${ev.id}`)}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)' }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                <div style={{ fontSize: 28 }}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{ev.title}</span>
                    {data?.template && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f0f0ff', color: '#667eea', fontWeight: 600 }}>
                        {TEMPLATE_LABELS[data.template]}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Erstellt: {new Date(ev.created_at).toLocaleDateString('de-DE')}
                    {data?.eventDate && ` · Datum: ${new Date(data.eventDate + 'T00:00:00').toLocaleDateString('de-DE')}`}
                    {data?.timeFrom && data?.timeTo && ` · ${data.timeFrom}–${data.timeTo}`}
                  </div>
                  {modulePills.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {modulePills.map(p => (
                        <span key={p} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#f1f5f9', color: '#475569' }}>{p}</span>
                      ))}
                    </div>
                  )}
                </div>
                {isVorstand && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(ev.id, ev.title) }}
                    style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                  >
                    Löschen
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showWizard && clubId && (
        <ClubEventWizardModal
          clubId={clubId}
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
