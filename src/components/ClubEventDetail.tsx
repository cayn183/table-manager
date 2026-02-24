import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getClub, getClubEvents, updateClubEvent, deleteClubEvent } from '../api/clubApi'
import type { Club, ClubEvent, ClubEventData, ClubEventModules } from '../types/club'
import { TEMPLATE_LABELS } from '../types/club'
import type { Table, ViewFrame } from '../types/room'
import type { MenuItem, ToGoOrder } from '../types/togo'
import ClubRoomEditor from './ClubRoomEditor'
import ClubToGo from './ClubToGo'

type TabKey = 'overview' | 'room' | 'food' | 'reservation'

interface TabDef {
  key: TabKey
  moduleKey?: keyof ClubEventModules
  label: string
  icon: string
}

const ALL_TABS: TabDef[] = [
  { key: 'overview', label: 'Übersicht', icon: '📊' },
  { key: 'room', moduleKey: 'room', label: 'Raumplanung', icon: '🗺️' },
  { key: 'food', moduleKey: 'food', label: 'Speiseplanung', icon: '🍽️' },
  { key: 'reservation', moduleKey: 'reservation', label: 'Reservierung', icon: '📝' },
]

export default function ClubEventDetail() {
  const { clubId, eventId } = useParams<{ clubId: string; eventId: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()

  const [club, setClub] = useState<Club | null>(null)
  const [event, setEvent] = useState<ClubEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editFrom, setEditFrom] = useState('')
  const [editTo, setEditTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isVorstand = club?.my_role === 'owner' || club?.my_role === 'vorstand'

  useEffect(() => {
    if (!clubId || !eventId) return
    Promise.all([
      getClub(clubId, token || undefined).then(setClub),
      getClubEvents(clubId, token || undefined).then(evts => {
        const found = evts.find(e => e.id === eventId)
        if (found) {
          setEvent(found)
        }
      })
    ]).finally(() => setLoading(false))
  }, [clubId, eventId, token])

  const data: ClubEventData | null = event
    ? (typeof event.data === 'string' ? JSON.parse(event.data) : event.data)
    : null

  // ── Save callbacks for module tabs ───────────────────────────
  const handleRoomSave = useCallback(async (tables: Table[], viewFrame: ViewFrame | null) => {
    if (!clubId || !eventId || !data) return
    const updatedData: ClubEventData = {
      ...data,
      roomData: { tables, viewFrame },
    }
    const updated = await updateClubEvent(clubId, eventId, { data: updatedData as any }, token || undefined)
    setEvent(updated)
  }, [clubId, eventId, data, token])

  const handleFoodSave = useCallback(async (menuItems: MenuItem[], orders: ToGoOrder[]) => {
    if (!clubId || !eventId || !data) return
    const updatedData: ClubEventData = {
      ...data,
      togoConfig: { menuItems, orders },
    }
    const updated = await updateClubEvent(clubId, eventId, { data: updatedData as any }, token || undefined)
    setEvent(updated)
  }, [clubId, eventId, data, token])

  // Compute visible tabs based on active modules
  const visibleTabs = ALL_TABS.filter(t => !t.moduleKey || data?.modules?.[t.moduleKey])

  function startEditing() {
    if (!data) return
    setEditTitle(event!.title)
    setEditDate(data.eventDate || '')
    setEditFrom(data.timeFrom || '')
    setEditTo(data.timeTo || '')
    setEditing(true)
    setError(null)
  }

  async function handleSave() {
    if (!clubId || !eventId || !data) return
    if (!editTitle.trim()) { setError('Name ist erforderlich.'); return }
    setSaving(true)
    setError(null)
    try {
      const updatedData: ClubEventData = {
        ...data,
        eventDate: editDate,
        timeFrom: editFrom,
        timeTo: editTo,
      }
      const updated = await updateClubEvent(clubId, eventId, {
        title: editTitle.trim(),
        data: updatedData as any,
      }, token || undefined)
      setEvent(updated)
      setEditing(false)
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!clubId || !eventId || !event) return
    if (!confirm(`Event "${event.title}" wirklich löschen?`)) return
    try {
      await deleteClubEvent(clubId, eventId, token || undefined)
      navigate(`/app/club/${clubId}/events`)
    } catch (err: any) {
      alert(err?.message || 'Fehler beim Löschen.')
    }
  }

  // ── Styles ──────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4,
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Laden…</div>
  if (!club) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Verein nicht gefunden.</div>
  if (!event || !data) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Event nicht gefunden.</div>

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(`/app/club/${clubId}/events`)}
        style={{ border: 'none', background: 'none', color: '#667eea', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16, padding: 0 }}
      >
        ← Zurück zu Vereins-Events
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{event.title}</h2>
            {data.template && (
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: '#f0f0ff', color: '#667eea', fontWeight: 600 }}>
                {TEMPLATE_LABELS[data.template]}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {data.eventDate && new Date(data.eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            {data.timeFrom && data.timeTo && ` · ${data.timeFrom} – ${data.timeTo} Uhr`}
          </div>
        </div>
        {isVorstand && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={startEditing}
              style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              ✏️ Bearbeiten
            </button>
            <button
              onClick={handleDelete}
              style={{ padding: '8px 16px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              🗑️ Löschen
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        {visibleTabs.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: active ? '3px solid #667eea' : '3px solid transparent',
                background: 'none',
                color: active ? '#667eea' : '#64748b',
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: -2,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          )
        })}
      </div>

      {/* ═══ TAB: Übersicht ═══ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 500 }}>{error}</div>
          )}

          {editing ? (
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Event bearbeiten</h3>
              <div>
                <label style={labelStyle}>Name</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Datum</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Von</label>
                  <input type="time" value={editFrom} onChange={e => setEditFrom(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Bis</label>
                  <input type="time" value={editTo} onChange={e => setEditTo(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '10px 20px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Speichern…' : '✓ Speichern'}
                </button>
                <button
                  onClick={() => { setEditing(false); setError(null) }}
                  style={{ padding: '10px 20px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>📋 Eventdetails</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 16px', fontSize: 14 }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Name:</span>
                <span style={{ color: '#1e293b' }}>{event.title}</span>

                <span style={{ color: '#64748b', fontWeight: 500 }}>Datum:</span>
                <span style={{ color: '#1e293b' }}>
                  {data.eventDate
                    ? new Date(data.eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'}
                </span>

                <span style={{ color: '#64748b', fontWeight: 500 }}>Uhrzeit:</span>
                <span style={{ color: '#1e293b' }}>
                  {data.timeFrom && data.timeTo ? `${data.timeFrom} – ${data.timeTo} Uhr` : '—'}
                </span>

                {data.template && (
                  <>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Vorlage:</span>
                    <span style={{ color: '#1e293b' }}>{TEMPLATE_LABELS[data.template]}</span>
                  </>
                )}

                <span style={{ color: '#64748b', fontWeight: 500 }}>Erstellt:</span>
                <span style={{ color: '#1e293b' }}>{new Date(event.created_at).toLocaleDateString('de-DE')}</span>

                {event.updated_at && event.updated_at !== event.created_at && (
                  <>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Zuletzt geändert:</span>
                    <span style={{ color: '#1e293b' }}>{new Date(event.updated_at).toLocaleDateString('de-DE')}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Active modules overview */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>🧩 Aktive Module</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {data.modules?.room && (
                <button onClick={() => setActiveTab('room')} style={modulePillStyle(true)}>
                  🗺️ Raumplanung
                </button>
              )}
              {data.modules?.food && (
                <button onClick={() => setActiveTab('food')} style={modulePillStyle(true)}>
                  🍽️ Speiseplanung
                </button>
              )}
              {data.modules?.reservation && (
                <button onClick={() => setActiveTab('reservation')} style={modulePillStyle(true)}>
                  📝 Reservierung
                </button>
              )}
              {!data.modules?.room && !data.modules?.food && !data.modules?.reservation && (
                <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Keine Module aktiviert.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: Raumplanung ═══ */}
      {activeTab === 'room' && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <ClubRoomEditor
            initialTables={data.roomData?.tables ?? []}
            initialViewFrame={data.roomData?.viewFrame ?? null}
            onSave={handleRoomSave}
            readOnly={!isVorstand}
          />
        </div>
      )}

      {/* ═══ TAB: Speiseplanung ═══ */}
      {activeTab === 'food' && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <ClubToGo
            eventTitle={event.title}
            eventDate={data.eventDate}
            timeFrom={data.timeFrom}
            timeTo={data.timeTo}
            initialMenuItems={data.togoConfig?.menuItems ?? []}
            initialOrders={data.togoConfig?.orders ?? []}
            onSave={handleFoodSave}
            readOnly={!isVorstand}
          />
        </div>
      )}

      {/* ═══ TAB: Reservierung ═══ */}
      {activeTab === 'reservation' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>📝 Reservierung</h3>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 15, color: '#475569', margin: '0 0 8px', fontWeight: 500 }}>
              Öffentliche Reservierungsseite
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, maxWidth: 400, marginInline: 'auto' }}>
              Hier kannst du eine öffentliche Reservierungsseite für „{event.title}" einrichten.
              Gäste können sich über einen geteilten Link anmelden.
              Die Integration der Reservierungsverwaltung für Vereinsevents wird in einem kommenden Update verfügbar sein.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function modulePillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: 10,
    border: active ? '2px solid #667eea' : '2px solid #e2e8f0',
    background: active ? 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))' : 'white',
    color: active ? '#667eea' : '#64748b',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
}
