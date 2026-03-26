import React, { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import userStorage from '../../utils/userStorage'
import { syncUserData } from '../../utils/sync'
import api from '../../api/apiClient'
import type { EventModules, PrivateEventItem, PrivateEventTemplate } from '../../types/event'
import { PRIVATE_TEMPLATE_LABELS, PRIVATE_TEMPLATE_DEFAULTS, PRIVATE_MODULE_OPTIONS } from '../../types/event'

interface Props {
  onClose: () => void
  onCreated: (event: PrivateEventItem) => void
}

const TEMPLATES: { key: PrivateEventTemplate; icon: string }[] = [
  { key: 'hochzeit', icon: '💒' },
  { key: 'geburtstag', icon: '🎂' },
  { key: 'jubilaeum', icon: '🎉' },
  { key: 'firmenfeier', icon: '🏢' },
]

export default function PrivateEventWizardModal({ onClose, onCreated }: Props) {
  const { token, user } = useAuth()
  const userId = user?.id ?? null
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 fields
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const [template, setTemplate] = useState<PrivateEventTemplate | null>(null)

  // Step 2 fields
  const [modules, setModules] = useState<EventModules>({ room: false, food: false, reservation: false, seating: false, checklist: false, budget: false, timeline: false, menu: false, guestInvite: false, dashboard: false })
  const [modulesInitialized, setModulesInitialized] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleNext() {
    if (!title.trim()) { setError('Bitte gib einen Namen ein.'); return }
    if (!eventDate) { setError('Bitte wähle ein Datum.'); return }
    if (!timeFrom || !timeTo) { setError('Bitte gib die Uhrzeit von/bis ein.'); return }
    setError(null)

    if (!modulesInitialized) {
      if (template) {
        setModules({ ...PRIVATE_TEMPLATE_DEFAULTS[template] })
      } else {
        setModules({ room: false, food: false, reservation: false, seating: false, checklist: false, budget: false, timeline: false, menu: false, guestInvite: false, dashboard: false })
      }
      setModulesInitialized(true)
    }
    setStep(2)
  }

  function handleBack() {
    setError(null)
    setStep(1)
  }

  function toggleModule(key: keyof EventModules) {
    setModules(prev => {
      const newVal = !prev[key]
      const next: EventModules = { ...prev, [key]: newVal }
      // Seating requires room
      if (key === 'seating' && newVal) next.room = true
      // Disabling room also disables seating
      if (key === 'room' && !newVal) next.seating = false
      return next
    })
  }

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const id = `e-${Date.now()}`
      const now = new Date()
      const event: PrivateEventItem = {
        id,
        name: title.trim(),
        eventDate,
        from: timeFrom,
        to: timeTo,
        modules,
        roomData: modules.room ? { tables: [], viewFrame: null } : null,
        togoConfig: null,
        seatingData: modules.seating ? { groups: [], assignedGroups: {} } : null,
        checklistData: modules.checklist ? { items: [] } : null,
        budgetData: modules.budget ? { items: [], currency: 'EUR' } : null,
        timelineData: modules.timeline ? { entries: [] } : null,
        menuData: modules.menu ? { courses: [] } : null,
        guestInviteData: modules.guestInvite ? { shareToken: Math.random().toString(36).slice(2) + Date.now().toString(36), shareMode: 'open' as const, invitations: [], categories: [] } : null,
        dashboardConfig: modules.dashboard ? { showTimeline: false, showMenu: false, showSeating: false, showLocation: true } : null,
        createdAt: now.toLocaleDateString(),
      }

      // Save to localStorage
      const rawEvents = userStorage.getItem('events', userId) || localStorage.getItem('events') || '[]'
      const all = JSON.parse(rawEvents as string) as PrivateEventItem[]
      userStorage.setItem('events', JSON.stringify([...all, event]), userId)
      userStorage.setItem('currentEvent', JSON.stringify(event), userId)

      // Sync to backend
      if (userId) {
        await syncUserData(token, userId)
      }

      // Publish reservation page if module is enabled (legacy support)
      if (modules.reservation) {
        try {
          await api.post(`/events/${id}/publish`, { reservationConfig: {} }, token ?? undefined)
        } catch {
          // Non-fatal
        }
      }

      onCreated(event)
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Erstellen.')
    } finally {
      setLoading(false)
    }
  }

  // -- Styles --
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
  }
  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: 16, padding: 32,
    minWidth: 480, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
  }
  const primaryBtn: React.CSSProperties = {
    flex: 1, padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
  }
  const secondaryBtn: React.CSSProperties = {
    padding: '12px 24px', background: 'white', color: '#64748b',
    border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
  }

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={cardStyle}>
        {/* Header */}
        <h3 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          ✨ Neues Event planen
        </h3>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>
          Schritt {step} von 2 — {step === 1 ? 'Basisinfo & Vorlage' : 'Module auswählen'}
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#667eea' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: step === 2 ? '#667eea' : '#e2e8f0' }} />
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* --- STEP 1: Basisinfo & Vorlage --- */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Eventname *</label>
              <input
                type="text"
                placeholder="z.B. Hochzeit Max & Lisa"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#667eea'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div>
              <label style={labelStyle}>Datum *</label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#667eea'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Zeit von *</label>
                <input
                  type="time"
                  value={timeFrom}
                  onChange={e => setTimeFrom(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Zeit bis *</label>
                <input
                  type="time"
                  value={timeTo}
                  onChange={e => setTimeTo(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>

            {/* Template selection */}
            <div>
              <label style={labelStyle}>Vorlage verwenden (optional)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {TEMPLATES.map(t => {
                  const selected = template === t.key
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setTemplate(selected ? null : t.key)
                        setModulesInitialized(false)
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: selected ? '2px solid #667eea' : '2px solid #e2e8f0',
                        background: selected ? 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))' : 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#667eea' : '#374151' }}>
                        {PRIVATE_TEMPLATE_LABELS[t.key]}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="button" onClick={handleNext} style={primaryBtn}>
                Weiter →
              </button>
              <button type="button" onClick={onClose} style={secondaryBtn}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 2: Module auswählen --- */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>
              Wähle die Module, die du für <strong>{title}</strong> aktivieren möchtest.
              {template && (
                <span style={{ fontSize: 12, color: '#667eea', marginLeft: 6 }}>
                  (Vorlage: {PRIVATE_TEMPLATE_LABELS[template]})
                </span>
              )}
            </p>

            {PRIVATE_MODULE_OPTIONS.map(mod => {
              const active = modules[mod.key]
              return (
                <button
                  key={mod.key}
                  type="button"
                  onClick={() => toggleModule(mod.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 18px', borderRadius: 12,
                    border: active ? '2px solid #667eea' : '2px solid #e2e8f0',
                    background: active ? 'linear-gradient(135deg, rgba(102,126,234,0.06), rgba(118,75,162,0.06))' : 'white',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    border: active ? '2px solid #667eea' : '2px solid #cbd5e1',
                    background: active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {active && <span style={{ color: 'white', fontSize: 14, lineHeight: 1 }}>✓</span>}
                  </div>

                  <div style={{ fontSize: 22, flexShrink: 0 }}>{mod.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: active ? '#667eea' : '#1e293b' }}>
                      {mod.label}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {mod.description}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                style={{ ...primaryBtn, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Wird erstellt…' : '✓ Event anlegen'}
              </button>
              <button type="button" onClick={handleBack} style={secondaryBtn}>
                ← Zurück
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
