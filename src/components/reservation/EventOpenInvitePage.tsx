import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicRequest } from '../../api/apiClient'

interface OpenEventData {
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
    dressCode: string | null
  }
  shareMode: 'open' | 'invite-only'
}

export default function EventOpenInvitePage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [data, setData] = useState<OpenEventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // RSVP form
  const [name, setName] = useState('')
  const [groupSize, setGroupSize] = useState(1)
  const [children, setChildren] = useState(0)
  const [dietaryNotes, setDietaryNotes] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!shareToken) return
    setLoading(true)
    publicRequest('GET', `/public/event/${shareToken}`)
      .then((d: OpenEventData) => setData(d))
      .catch((e: any) => setError(e?.message || 'Event nicht gefunden.'))
      .finally(() => setLoading(false))
  }, [shareToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shareToken || !name.trim()) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      await publicRequest('POST', `/public/event/${shareToken}/rsvp`, {
        name: name.trim(),
        groupSize,
        children: children > 0 ? children : undefined,
        dietaryNotes: dietaryNotes.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err?.message || 'Fehler beim Senden der Anmeldung.')
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
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <p style={{ color: '#64748b', margin: 0 }}>Event wird geladen...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 20 }}>Event nicht gefunden</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
            Dieser Link ist ungültig oder das Event existiert nicht mehr.
          </p>
        </div>
      </div>
    )
  }

  const { event, shareMode } = data
  const deadlinePassed = event.rsvpDeadline && event.rsvpDeadline < new Date().toISOString().slice(0, 10)
  const isOpen = shareMode === 'open'

  // ── Success view ──
  if (submitted) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 22, fontWeight: 700 }}>
            Vielen Dank, {name}!
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>
            Deine Anmeldung wurde erfolgreich gespeichert.
          </p>
          {groupSize > 1 && (
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 8px' }}>
              📋 {groupSize} {groupSize === 1 ? 'Person' : 'Personen'} angemeldet
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

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            {event.title}
          </h1>
          <div style={{ width: 50, height: 3, background: 'linear-gradient(90deg, #667eea, #764ba2)', margin: '14px auto 18px', borderRadius: 2 }} />
          <p style={{ margin: 0, fontSize: 15, color: '#475569' }}>
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

        {/* Description */}
        {event.description && (
          <div style={{ marginBottom: 24, padding: '14px 18px', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.description}</p>
          </div>
        )}

        {/* Deadline warning */}
        {deadlinePassed && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              ⚠️ Die Antwortfrist ({formatDate(event.rsvpDeadline!)}) ist abgelaufen.
            </p>
          </div>
        )}

        {/* invite-only mode: no RSVP */}
        {!isOpen && (
          <div style={{ padding: '16px 18px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, color: '#0369a1', fontWeight: 500 }}>
              🔒 Dieses Event ist nur für eingeladene Gäste. Bitte verwende deinen persönlichen Einladungslink.
            </p>
          </div>
        )}

        {/* Open mode: RSVP form */}
        {isOpen && (
          <form onSubmit={handleSubmit}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Anmeldung
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Dein Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>

              {/* Person count */}
              <div>
                <label style={labelStyle}>Personenanzahl</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" onClick={() => { setGroupSize(Math.max(1, groupSize - 1)); setChildren(Math.min(children, Math.max(0, groupSize - 2))) }}
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 18, color: '#475569' }}>
                    −
                  </button>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', minWidth: 30, textAlign: 'center' }}>{groupSize}</span>
                  <button type="button" onClick={() => setGroupSize(groupSize + 1)}
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 18, color: '#475569' }}>
                    +
                  </button>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {groupSize === 1 ? 'Person' : 'Personen'} (inkl. dir)
                  </span>
                </div>
              </div>

              {/* Children */}
              {event.allowPlusOne && groupSize > 1 && (
                <div>
                  <label style={labelStyle}>Davon Kinder</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button type="button" onClick={() => setChildren(Math.max(0, children - 1))}
                      style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 18, color: '#475569' }}>
                      −
                    </button>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', minWidth: 30, textAlign: 'center' }}>{children}</span>
                    <button type="button" onClick={() => setChildren(Math.min(groupSize - 1, children + 1))}
                      style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 18, color: '#475569' }}>
                      +
                    </button>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Kinder</span>
                  </div>
                </div>
              )}

              {/* Dietary notes */}
              <div>
                <label style={labelStyle}>
                  Ernährungshinweise <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                </label>
                <input type="text" value={dietaryNotes} onChange={e => setDietaryNotes(e.target.value)}
                  placeholder="z.B. vegetarisch, Laktoseintoleranz..."
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>
                  Nachricht an den Gastgeber <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="z.B. Wir freuen uns!"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
            </div>

            {/* Error */}
            {submitError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>{submitError}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={!name.trim() || submitting}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                cursor: name.trim() && !submitting ? 'pointer' : 'default',
                fontSize: 16, fontWeight: 700, transition: 'all 0.2s',
                background: name.trim() && !submitting ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0',
                color: name.trim() && !submitting ? 'white' : '#94a3b8',
              }}>
              {submitting ? 'Wird gesendet...' : '✅ Anmelden'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
            Powered by PlatzPilot
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
