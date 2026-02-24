import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getClub, getClubEvents, updateClubEvent, deleteClubEvent } from '../api/clubApi'
import type { Club, ClubEvent, ClubEventData, ClubEventModules } from '../types/club'
import { TEMPLATE_LABELS } from '../types/club'
import type { Table, ViewFrame } from '../types/room'
import type { MenuItem, ToGoOrder } from '../types/togo'
import userStorage from '../utils/userStorage'
import { usePageHeader } from './PageHeaderContext'
import ClubRoomEditor from './ClubRoomEditor'
import ClubToGo from './ClubToGo'

type TabKey = 'overview' | 'room' | 'food' | 'reservation'

interface TabDef {
  key: TabKey
  moduleKey?: keyof ClubEventModules
  label: string
  icon: string
}

interface SavedRoom {
  id: string
  name: string
  createdAt?: string
  data: { tables: Table[]; viewFrame?: ViewFrame | null }
}

const ALL_TABS: TabDef[] = [
  { key: 'overview', label: 'Übersicht', icon: '📊' },
  { key: 'room', moduleKey: 'room', label: 'Raumplanung', icon: '🗺️' },
  { key: 'food', moduleKey: 'food', label: 'Speiseplanung', icon: '🍽️' },
  { key: 'reservation', moduleKey: 'reservation', label: 'Reservierung', icon: '📝' },
]

export default function ClubEventDetail() {
  const { clubId, eventId } = useParams<{ clubId: string; eventId: string }>()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const { setPageTitle, setHeaderContent } = usePageHeader()

  const [club, setClub] = useState<Club | null>(null)
  const [event, setEvent] = useState<ClubEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editFrom, setEditFrom] = useState('')
  const [editTo, setEditTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([])

  const isVorstand = club?.my_role === 'owner' || club?.my_role === 'vorstand'
  const userId = user?.id ?? null

  useEffect(() => {
    if (!clubId || !eventId) return
    Promise.all([
      getClub(clubId, token || undefined).then(setClub),
      getClubEvents(clubId, token || undefined).then(evts => {
        const found = evts.find(e => e.id === eventId)
        if (found) setEvent(found)
      }),
    ]).finally(() => setLoading(false))
  }, [clubId, eventId, token])

  const data: ClubEventData | null = event
    ? (typeof event.data === 'string' ? JSON.parse(event.data) : event.data)
    : null

  // ── Save callbacks ──────────────────────────────────────────
  const handleRoomSave = useCallback(async (tables: Table[], viewFrame: ViewFrame | null) => {
    if (!clubId || !eventId || !data) return
    const updated = await updateClubEvent(clubId, eventId, { data: { ...data, roomData: { tables, viewFrame } } as any }, token || undefined)
    setEvent(updated)
  }, [clubId, eventId, data, token])

  const handleFoodSave = useCallback(async (menuItems: MenuItem[], orders: ToGoOrder[]) => {
    if (!clubId || !eventId || !data) return
    const updated = await updateClubEvent(clubId, eventId, { data: { ...data, togoConfig: { menuItems, orders } } as any }, token || undefined)
    setEvent(updated)
  }, [clubId, eventId, data, token])

  const visibleTabs = ALL_TABS.filter(t => !t.moduleKey || data?.modules?.[t.moduleKey])

  function startEditing() {
    if (!data || !event) return
    setEditTitle(event.title)
    setEditDate(data.eventDate || '')
    setEditFrom(data.timeFrom || '')
    setEditTo(data.timeTo || '')
    setEditing(true)
    setError(null)
  }

  async function handleSave() {
    if (!clubId || !eventId || !data) return
    if (!editTitle.trim()) { setError('Name ist erforderlich.'); return }
    setSaving(true); setError(null)
    try {
      const updated = await updateClubEvent(clubId, eventId, {
        title: editTitle.trim(),
        data: { ...data, eventDate: editDate, timeFrom: editFrom, timeTo: editTo } as any,
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
      setPageTitle(null)
      setHeaderContent(null)
      navigate(`/app/club/${clubId}/events`)
    } catch (err: any) {
      alert(err?.message || 'Fehler beim Löschen.')
    }
  }

  // ── Room picker ─────────────────────────────────────────────
  function openRoomPicker() {
    const raw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms')
    try { setSavedRooms(raw ? JSON.parse(raw) : []) } catch { setSavedRooms([]) }
    setShowRoomPicker(true)
  }

  async function applyRoom(room: SavedRoom) {
    if (!clubId || !eventId || !data) return
    const updated = await updateClubEvent(clubId, eventId, {
      data: { ...data, roomData: { tables: room.data.tables, viewFrame: room.data.viewFrame ?? null } } as any,
    }, token || undefined)
    setEvent(updated)
    setShowRoomPicker(false)
  }

  function openRoomEditor() {
    navigate('/room', { state: { returnToClubEvent: { clubId, eventId } } })
  }

  // ── Top-bar header content ──────────────────────────────────
  useEffect(() => {
    if (!event || !data) return

    const dateLabel = data.eventDate
      ? new Date(data.eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      : null
    const timeLabel = data.timeFrom && data.timeTo
      ? `${data.timeFrom} – ${data.timeTo} Uhr`
      : data.timeFrom ? `ab ${data.timeFrom} Uhr` : null

    const inputStyle: React.CSSProperties = {
      padding: '4px 8px', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 5,
      fontSize: 12, background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none',
    }

    if (editing) {
      setPageTitle(null)
      setHeaderContent(
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            placeholder="Event-Name" style={{ ...inputStyle, minWidth: 130, maxWidth: 200, fontSize: 13, fontWeight: 600 }} />
          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ ...inputStyle, width: 130 }} />
          <input type="time" value={editFrom} onChange={e => setEditFrom(e.target.value)} style={{ ...inputStyle, width: 90 }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>–</span>
          <input type="time" value={editTo} onChange={e => setEditTo(e.target.value)} style={{ ...inputStyle, width: 90 }} />
          {error && <span style={{ color: '#fca5a5', fontSize: 11 }}>{error}</span>}
          <button onClick={handleSave} disabled={saving}
            style={{ background: 'white', color: '#667eea', border: 'none', borderRadius: 5, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, padding: '4px 12px', opacity: saving ? 0.7 : 1 }}
          >{saving ? '…' : '✓ Speichern'}</button>
          <button onClick={() => { setEditing(false); setError(null) }}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: 5, cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}
          >✕</button>
        </div>
      )
    } else {
      setPageTitle(event.title, '📅')
      setHeaderContent(
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {dateLabel && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                📅 {dateLabel}
              </span>
            )}
            {timeLabel && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                🕐 {timeLabel}
              </span>
            )}
            {data.template && (
              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, flexShrink: 0 }}>
                {TEMPLATE_LABELS[data.template]}
              </span>
            )}
          </div>
          {/* Actions */}
          {isVorstand && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={startEditing}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: 5, cursor: 'pointer', fontSize: 12, padding: '4px 10px', fontWeight: 500 }}
              >✏️ Bearbeiten</button>
              <button onClick={handleDelete}
                style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.4)', color: 'white', borderRadius: 5, cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}
              >🗑️</button>
            </div>
          )}
        </div>
      )
    }
  }, [event, data, editing, editTitle, editDate, editFrom, editTo, saving, error, isVorstand])

  // Clear on unmount
  useEffect(() => {
    return () => { setPageTitle(null); setHeaderContent(null) }
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Laden…</div>
  if (!club) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Verein nicht gefunden.</div>
  if (!event || !data) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Event nicht gefunden.</div>

  const dateLabel = data.eventDate
    ? new Date(data.eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* ── Slim module / tab bar ─────────────────────────────── */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 0, padding: '0 16px', flexShrink: 0 }}>
        <button
          onClick={() => navigate(`/app/club/${clubId}/events`)}
          style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 13, padding: '10px 8px 10px 0', fontWeight: 500, flexShrink: 0, marginRight: 8 }}
        >← Zurück</button>

        <div style={{ width: 1, height: 20, background: '#e2e8f0', marginRight: 8 }} />

        {visibleTabs.map(tab => {
          const active = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 16px', border: 'none',
                borderBottom: active ? '2px solid #667eea' : '2px solid transparent',
                background: 'none',
                color: active ? '#667eea' : '#64748b',
                fontWeight: active ? 700 : 500,
                fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1,
              }}
            >{tab.icon} {tab.label}</button>
          )
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* ═══ TAB: Übersicht ═══ */}
        {activeTab === 'overview' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>📋 Eventdetails</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 16px', fontSize: 14 }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Name:</span>
                <span style={{ color: '#1e293b' }}>{event.title}</span>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Datum:</span>
                <span style={{ color: '#1e293b' }}>{dateLabel || '—'}</span>
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
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Geändert:</span>
                    <span style={{ color: '#1e293b' }}>{new Date(event.updated_at).toLocaleDateString('de-DE')}</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>🧩 Aktive Module</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {data.modules?.room && (
                  <button onClick={() => setActiveTab('room')} style={modulePillStyle(true)}>🗺️ Raumplanung</button>
                )}
                {data.modules?.food && (
                  <button onClick={() => setActiveTab('food')} style={modulePillStyle(true)}>🍽️ Speiseplanung</button>
                )}
                {data.modules?.reservation && (
                  <button onClick={() => setActiveTab('reservation')} style={modulePillStyle(true)}>📝 Reservierung</button>
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {data.roomData && (data.roomData.tables?.length ?? 0) > 0 ? (
              <>
                <div style={{ padding: '6px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {data.roomData.tables.length} Tisch{data.roomData.tables.length !== 1 ? 'e' : ''} verknüpft
                  </span>
                  <div style={{ flex: 1 }} />
                  {isVorstand && (
                    <>
                      <button onClick={openRoomEditor}
                        style={{ padding: '4px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}
                      >🗺️ Im Raum-Editor bearbeiten</button>
                      <button onClick={openRoomPicker}
                        style={{ padding: '4px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}
                      >🔄 Raum wechseln</button>
                      <button onClick={async () => { if (!confirm('Raumzuweisung wirklich entfernen?')) return; await handleRoomSave([], null) }}
                        style={{ padding: '4px 10px', background: '#fee2e2', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 500 }}
                      >✕ Entfernen</button>
                    </>
                  )}
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ClubRoomEditor
                    initialTables={data.roomData.tables}
                    initialViewFrame={data.roomData.viewFrame ?? null}
                    onSave={handleRoomSave}
                    readOnly={!isVorstand}
                  />
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                <div style={{ textAlign: 'center', maxWidth: 460 }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🗺️</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Noch kein Raum verknüpft</h3>
                  <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
                    Wähle einen Raum aus deiner Bibliothek oder erstelle einen neuen Raum im Raum-Editor.
                    Nach dem Speichern im Raum-Editor wirst du automatisch hierher zurückgeleitet.
                  </p>
                  {isVorstand && (
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button onClick={openRoomPicker}
                        style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, boxShadow: '0 2px 8px rgba(102,126,234,0.35)' }}
                      >📂 Aus Bibliothek auswählen</button>
                      <button onClick={openRoomEditor}
                        style={{ padding: '10px 20px', background: 'white', color: '#667eea', border: '2px solid #c7d2fe', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                      >🗺️ Neuen Raum erstellen</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: Speiseplanung ═══ */}
        {activeTab === 'food' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{ textAlign: 'center', maxWidth: 440 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Öffentliche Reservierungsseite</h3>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                Richte eine öffentliche Anmeldeseite für „{event.title}" ein.
                Kommt in einem kommenden Update.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Room Picker Modal ═══ */}
      {showRoomPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 540, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>📂 Raum auswählen</h3>
              <button onClick={() => setShowRoomPicker(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            {savedRooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <p style={{ fontSize: 15, color: '#64748b', marginBottom: 16 }}>
                  Noch keine gespeicherten Räume gefunden.<br />Erstelle zuerst einen Raum im Raum-Editor.
                </p>
                <button onClick={() => { setShowRoomPicker(false); openRoomEditor() }}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                >🗺️ Zum Raum-Editor</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedRooms.map(room => (
                  <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>{room.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {room.data?.tables?.length ?? 0} Tisch{(room.data?.tables?.length ?? 0) !== 1 ? 'e' : ''}
                        {room.createdAt && ` · ${new Date(room.createdAt).toLocaleDateString('de-DE')}`}
                      </div>
                    </div>
                    <button onClick={() => applyRoom(room)}
                      style={{ padding: '7px 16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >Auswählen</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Aus deiner persönlichen Raum-Bibliothek</span>
              <button onClick={() => { setShowRoomPicker(false); openRoomEditor() }}
                style={{ padding: '6px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}
              >🗺️ Raum-Editor öffnen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function modulePillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px', borderRadius: 10,
    border: active ? '2px solid #667eea' : '2px solid #e2e8f0',
    background: active ? 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))' : 'white',
    color: active ? '#667eea' : '#64748b',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
  }
}
