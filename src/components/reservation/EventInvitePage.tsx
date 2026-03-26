import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicRequest } from '../../api/apiClient'

interface InviteData {
  event: {
    title: string
    date: string | null
    timeFrom: string | null
    timeTo: string | null
    description: string | null
    locationName: string | null
    locationAddress: string | null
    rsvpDeadline: string | null
    allowPlusOne: boolean
    allowMenuSelection: boolean
    dressCode: string | null
  }
  guest: {
    name: string
    status: 'pending' | 'accepted' | 'declined'
    groupSize: number
    confirmedCount?: number
    children?: number
    dietaryNotes: string
    notes: string
    respondedAt: string | null
  }
}

export default function EventInvitePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // RSVP form state
  const [rsvpStatus, setRsvpStatus] = useState<'accepted' | 'declined' | null>(null)
  const [confirmedCount, setConfirmedCount] = useState(1)
  const [children, setChildren] = useState(0)
  const [dietaryNotes, setDietaryNotes] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    publicRequest('GET', `/public/invite/${token}`)
      .then((d: InviteData) => {
        setData(d)
        if (d.guest.status !== 'pending') {
          setRsvpStatus(d.guest.status)
          setConfirmedCount(d.guest.confirmedCount ?? d.guest.groupSize)
          setChildren(d.guest.children ?? 0)
          setDietaryNotes(d.guest.dietaryNotes || '')
          setNotes(d.guest.notes || '')
        } else {
          setConfirmedCount(d.guest.groupSize)
          setChildren(d.guest.children ?? 0)
        }
      })
      .catch((e: any) => setError(e?.message || 'Einladung nicht gefunden.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !rsvpStatus) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      await publicRequest('POST', `/public/invite/${token}/rsvp`, {
        status: rsvpStatus,
        confirmedCount: rsvpStatus === 'accepted' ? confirmedCount : 0,
        children: rsvpStatus === 'accepted' ? children : 0,
        dietaryNotes: dietaryNotes.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err?.message || 'Fehler beim Senden der Antwort.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Styles ──
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  }
  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 20,
    padding: '40px 36px',
    maxWidth: 520,
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
          <p style={{ color: '#64748b', margin: 0 }}>Einladung wird geladen...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 20 }}>Einladung nicht gefunden</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
            Dieser Einladungslink ist ungültig oder abgelaufen. Bitte wende dich an den Veranstalter.
          </p>
        </div>
      </div>
    )
  }

  const { event, guest } = data
  const deadlinePassed = event.rsvpDeadline && event.rsvpDeadline < new Date().toISOString().slice(0, 10)

  // ── Success view after submitting ──
  if (submitted) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {rsvpStatus === 'accepted' ? '🎉' : '💌'}
          </div>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 22, fontWeight: 700 }}>
            {rsvpStatus === 'accepted' ? 'Vielen Dank!' : 'Antwort gesendet'}
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>
            {rsvpStatus === 'accepted'
              ? `Wir freuen uns auf dich, ${guest.name}! Deine Zusage wurde gespeichert.`
              : `Schade, dass du nicht kommen kannst, ${guest.name}. Deine Absage wurde gespeichert.`
            }
          </p>
          {rsvpStatus === 'accepted' && confirmedCount > 1 && (
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 8px' }}>
              📋 {confirmedCount} {confirmedCount === 1 ? 'Person' : 'Personen'} bestätigt
            </p>
          )}
          {event.date && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                📅 {formatDate(event.date)}
                {event.timeFrom && ` · ${event.timeFrom}`}
                {event.timeTo && ` – ${event.timeTo}`}
              </p>
              {event.locationName && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
                  📍 {event.locationName}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Already responded view ──
  const alreadyResponded = guest.status !== 'pending' && guest.respondedAt

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header / Greeting */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💌</div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            {event.title}
          </h1>
          <div style={{ width: 50, height: 3, background: 'linear-gradient(90deg, #667eea, #764ba2)', margin: '14px auto 18px', borderRadius: 2 }} />
          <p style={{ margin: 0, fontSize: 17, color: '#475569', fontWeight: 500 }}>
            Hallo {guest.name}! 👋
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b' }}>
            Du bist herzlich eingeladen!
          </p>
        </div>

        {/* Event Details */}
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
          {event.date && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: event.locationName || event.dressCode ? 10 : 0 }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{formatDate(event.date)}</div>
                {(event.timeFrom || event.timeTo) && (
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {event.timeFrom}{event.timeTo && ` – ${event.timeTo}`} Uhr
                  </div>
                )}
              </div>
            </div>
          )}
          {event.locationName && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: event.dressCode ? 10 : 0 }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{event.locationName}</div>
                {event.locationAddress && (
                  <div style={{ fontSize: 13, color: '#64748b' }}>{event.locationAddress}</div>
                )}
              </div>
            </div>
          )}
          {event.dressCode && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 18 }}>👔</span>
              <div style={{ fontSize: 14, color: '#1e293b' }}>Dresscode: <strong>{event.dressCode}</strong></div>
            </div>
          )}
        </div>

        {/* Event description */}
        {event.description && (
          <div style={{ marginBottom: 24, padding: '14px 18px', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.description}</p>
          </div>
        )}

        {/* RSVP Deadline warning */}
        {deadlinePassed && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              ⚠️ Die Antwortfrist ({formatDate(event.rsvpDeadline!)}) ist abgelaufen. Du kannst trotzdem antworten.
            </p>
          </div>
        )}

        {/* Already responded info */}
        {alreadyResponded && (
          <div style={{ padding: '14px 18px', background: guest.status === 'accepted' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${guest.status === 'accepted' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 10, marginBottom: 20, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: guest.status === 'accepted' ? '#16a34a' : '#dc2626' }}>
              {guest.status === 'accepted' ? '✅ Du hast bereits zugesagt' : '❌ Du hast bereits abgesagt'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              Du kannst deine Antwort unten ändern.
            </p>
          </div>
        )}

        {/* RSVP Form */}
        <form onSubmit={handleSubmit}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            {alreadyResponded ? 'Antwort ändern' : 'Deine Antwort'}
          </h3>

          {/* Accept / Decline buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button type="button" onClick={() => setRsvpStatus('accepted')}
              style={{
                flex: 1, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 700, transition: 'all 0.2s',
                border: rsvpStatus === 'accepted' ? '3px solid #16a34a' : '2px solid #e2e8f0',
                background: rsvpStatus === 'accepted' ? '#f0fdf4' : 'white',
                color: rsvpStatus === 'accepted' ? '#16a34a' : '#64748b',
              }}>
              ✅ Zusage
            </button>
            <button type="button" onClick={() => setRsvpStatus('declined')}
              style={{
                flex: 1, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 700, transition: 'all 0.2s',
                border: rsvpStatus === 'declined' ? '3px solid #dc2626' : '2px solid #e2e8f0',
                background: rsvpStatus === 'declined' ? '#fef2f2' : 'white',
                color: rsvpStatus === 'declined' ? '#dc2626' : '#64748b',
              }}>
              ❌ Absage
            </button>
          </div>

          {/* Accepted: additional fields */}
          {rsvpStatus === 'accepted' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {/* Person count */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Personenanzahl
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" onClick={() => setConfirmedCount(Math.max(1, confirmedCount - 1))}
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 18, color: '#475569' }}>
                    −
                  </button>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', minWidth: 30, textAlign: 'center' }}>{confirmedCount}</span>
                  <button type="button" onClick={() => setConfirmedCount(confirmedCount + 1)}
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 18, color: '#475569' }}>
                    +
                  </button>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {confirmedCount === 1 ? 'Person' : 'Personen'} (inkl. dir)
                  </span>
                </div>
              </div>

              {/* Children count */}
              {event.allowPlusOne && confirmedCount > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Davon Kinder
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button type="button" onClick={() => setChildren(Math.max(0, children - 1))}
                      style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 18, color: '#475569' }}>
                      −
                    </button>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', minWidth: 30, textAlign: 'center' }}>{children}</span>
                    <button type="button" onClick={() => setChildren(Math.min(confirmedCount - 1, children + 1))}
                      style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 18, color: '#475569' }}>
                      +
                    </button>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Kinder</span>
                  </div>
                </div>
              )}

              {/* Dietary notes */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Ernährungshinweise <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                </label>
                <input type="text" value={dietaryNotes} onChange={e => setDietaryNotes(e.target.value)}
                  placeholder="z.B. vegetarisch, Laktoseintoleranz..."
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
            </div>
          )}

          {/* Notes (always visible when a choice is made) */}
          {rsvpStatus && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Nachricht an den Gastgeber <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={rsvpStatus === 'accepted' ? 'z.B. Wir freuen uns!' : 'z.B. Leider können wir nicht kommen, weil...'}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#667eea'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>{submitError}</p>
            </div>
          )}

          {/* Submit button */}
          <button type="submit" disabled={!rsvpStatus || submitting}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none', cursor: rsvpStatus && !submitting ? 'pointer' : 'default', fontSize: 16, fontWeight: 700, transition: 'all 0.2s',
              background: rsvpStatus && !submitting ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0',
              color: rsvpStatus && !submitting ? 'white' : '#94a3b8',
            }}>
            {submitting ? 'Wird gesendet...' : alreadyResponded ? 'Antwort aktualisieren' : 'Antwort senden'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
            Dieser Link ist persönlich und nur für dich bestimmt.
          </p>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
