import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicRequest } from '../api/apiClient'
import type { PublicEventData, FoodSelection } from '../types/reservation'

const API_BASE = (() => {
  const rt = typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.VITE_API_URL
  const bt = (import.meta as any).env?.VITE_API_URL
  if (rt || bt) return ''
  return ''
})()

export default function ReservationPage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [event, setEvent] = useState<PublicEventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resultStatus, setResultStatus] = useState<string>('')

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [groupSize, setGroupSize] = useState(1)
  const [foodSelections, setFoodSelections] = useState<FoodSelection[]>([])

  useEffect(() => {
    if (!shareToken) return
    setLoading(true)
    publicRequest('GET', `/public/events/${shareToken}`)
      .then((data: PublicEventData) => {
        setEvent(data)
        // Init food selections
        if (data.menuItems?.length) {
          setFoodSelections(data.menuItems.map(m => ({ menuItemId: m.id, quantity: 0 })))
        }
      })
      .catch((e: any) => setError(e?.message || 'Event nicht gefunden.'))
      .finally(() => setLoading(false))
  }, [shareToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shareToken || !event) return
    setSubmitError(null)
    setSubmitting(true)

    const payload: any = {
      name: name.trim(),
      email: email.trim(),
      group_size: groupSize,
    }
    if (event.optionalFields.phone && phone.trim()) payload.phone = phone.trim()
    if (event.optionalFields.notes && notes.trim()) payload.notes = notes.trim()
    if (event.isToGo && foodSelections.some(f => f.quantity > 0)) {
      payload.food_selections = foodSelections.filter(f => f.quantity > 0)
    }

    try {
      const result = await publicRequest('POST', `/public/events/${shareToken}/reserve`, payload)
      setResultStatus(result.status)
      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err?.message || 'Reservierung fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  function updateFoodQuantity(menuItemId: string, delta: number) {
    setFoodSelections(prev =>
      prev.map(f =>
        f.menuItemId === menuItemId
          ? { ...f, quantity: Math.max(0, Math.min(99, f.quantity + delta)) }
          : f,
      ),
    )
  }

  const spotsLeft = event?.maxCapacity ? event.maxCapacity - event.totalReserved : null
  const isFull = spotsLeft !== null && spotsLeft <= 0

  // ── Loading state ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={styles.loadingSpinner} />
          <p style={{ textAlign: 'center', color: '#64748b', marginTop: 16 }}>Lade Eventdaten…</p>
        </div>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────
  if (error || !event) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>😕</span>
            <h2 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Event nicht gefunden</h2>
            <p style={{ color: '#64748b' }}>{error || 'Das Event ist nicht öffentlich oder der Link ist ungültig.'}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Success state ───────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>{resultStatus === 'confirmed' ? '✅' : '📩'}</span>
            <h2 style={{ margin: '16px 0 8px', color: '#1e293b' }}>
              {resultStatus === 'confirmed' ? 'Reservierung bestätigt!' : 'Anfrage eingegangen!'}
            </h2>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
              {resultStatus === 'confirmed'
                ? 'Du erhältst in Kürze eine Bestätigungsmail mit allen Details und einem Stornierungslink.'
                : 'Deine Anfrage wird vom Veranstalter geprüft. Du erhältst eine E-Mail sobald entschieden wurde.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Reservation form ────────────────────────────────────────────
  const logoSrc = event.logoUrl
    ? (event.logoUrl.startsWith('http') ? event.logoUrl : `${API_BASE}${event.logoUrl}`)
    : null

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        {/* ── Header ─────────────────────────────────────────── */}
        {logoSrc && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img
              src={logoSrc}
              alt="Logo"
              style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        )}
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>
          {event.title}
        </h1>
        {event.organizerName && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
            von {event.organizerName}
          </p>
        )}

        {/* ── Event info ─────────────────────────────────────── */}
        <div style={styles.infoBar}>
          {event.eventDate && (
            <span style={styles.infoBadge}>📅 {formatDate(event.eventDate)}</span>
          )}
          {event.from && (
            <span style={styles.infoBadge}>🕐 {event.from}{event.to ? ` – ${event.to}` : ''}</span>
          )}
          {spotsLeft !== null && (
            <span style={{ ...styles.infoBadge, background: isFull ? '#fee2e2' : '#dcfce7', color: isFull ? '#991b1b' : '#166534' }}>
              {isFull ? '❌ Ausgebucht' : `🪑 ${spotsLeft} Plätze frei`}
            </span>
          )}
        </div>

        {event.description && (
          <div style={styles.descriptionBox}>
            {event.description}
          </div>
        )}

        {isFull ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#991b1b' }}>
              Leider sind keine Plätze mehr verfügbar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            {/* ── Required fields ────────────────────────────── */}
            <div>
              <label style={styles.label}>Name *</label>
              <input
                type="text"
                required
                maxLength={200}
                value={name}
                onChange={e => setName(e.target.value)}
                style={styles.input}
                placeholder="Max Mustermann"
              />
            </div>

            <div>
              <label style={styles.label}>E-Mail *</label>
              <input
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={styles.input}
                placeholder="max@beispiel.de"
              />
            </div>

            <div>
              <label style={styles.label}>Personenzahl *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" onClick={() => setGroupSize(Math.max(1, groupSize - 1))} style={styles.counterBtn}>−</button>
                <span style={{ fontSize: 20, fontWeight: 700, minWidth: 32, textAlign: 'center', color: '#1e293b' }}>{groupSize}</span>
                <button type="button" onClick={() => setGroupSize(Math.min(99, groupSize + 1))} style={styles.counterBtn}>+</button>
              </div>
            </div>

            {/* ── Optional fields ────────────────────────────── */}
            {event.optionalFields.phone && (
              <div>
                <label style={styles.label}>Telefon</label>
                <input
                  type="tel"
                  maxLength={50}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={styles.input}
                  placeholder="+49 123 456789"
                />
              </div>
            )}

            {event.optionalFields.notes && (
              <div>
                <label style={styles.label}>Bemerkung</label>
                <textarea
                  maxLength={500}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
                  placeholder="Allergien, Sonderwünsche…"
                />
              </div>
            )}

            {/* ── Food selections (ToGo events) ──────────────── */}
            {event.isToGo && event.menuItems.length > 0 && (
              <div>
                <label style={styles.label}>Speisekarte 🍽️</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {event.menuItems.map(item => {
                    const sel = foodSelections.find(f => f.menuItemId === item.id)
                    return (
                      <div key={item.id} style={styles.menuItemRow}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{item.label}</div>
                          {item.description && (
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.description}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" onClick={() => updateFoodQuantity(item.id, -1)} style={styles.counterBtnSmall}>−</button>
                          <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: 14 }}>
                            {sel?.quantity || 0}
                          </span>
                          <button type="button" onClick={() => updateFoodQuantity(item.id, 1)} style={styles.counterBtnSmall}>+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Submit ─────────────────────────────────────── */}
            {submitError && (
              <div style={styles.errorBox}>{submitError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Wird gesendet…' : event.autoConfirm ? '✅ Verbindlich reservieren' : '📩 Anfrage senden'}
            </button>

            {!event.autoConfirm && (
              <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                Der Veranstalter prüft deine Anfrage und bestätigt sie per E-Mail.
              </p>
            )}
          </form>
        )}

        {/* ── Footer ────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 11, color: '#cbd5e1' }}>Powered by PlatzPilot</span>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ── Styles ────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fef2f2 100%)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '32px 28px',
    maxWidth: 520,
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
  },
  infoBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    justifyContent: 'center',
    margin: '12px 0',
  },
  infoBadge: {
    padding: '6px 12px',
    borderRadius: 20,
    background: '#f1f5f9',
    fontSize: 13,
    fontWeight: 500,
    color: '#475569',
  },
  descriptionBox: {
    background: '#f8fafc',
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 14,
    lineHeight: 1.6,
    color: '#334155',
    margin: '12px 0 0',
    whiteSpace: 'pre-wrap' as const,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '2px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '2px solid #e2e8f0',
    background: '#fff',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#475569',
    transition: 'all 0.15s',
  },
  counterBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '1.5px solid #e2e8f0',
    background: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#475569',
  },
  menuItemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#f8fafc',
    border: '1px solid #f1f5f9',
  },
  errorBox: {
    padding: '10px 14px',
    borderRadius: 8,
    background: '#fee2e2',
    color: '#991b1b',
    fontSize: 13,
    fontWeight: 500,
  },
  submitBtn: {
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '4px solid #e2e8f0',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 0.8s linear infinite',
  },
}
