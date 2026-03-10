import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getClub, getClubEvents, getClubEvent, updateClubEvent, deleteClubEvent } from '../../api/clubApi'
import type { Club, ClubEvent, ClubEventData, ClubEventModules } from '../../types/club'
import { TEMPLATE_LABELS } from '../../types/club'
import type { Table, ViewFrame } from '../../types/room'
import type { MenuItem, ToGoOrder, OrderItem } from '../../types/togo'
import userStorage from '../../utils/userStorage'
import { formatDateShort } from '../../utils/dateFormatting'
import { usePageHeader } from '../layout/PageHeaderContext'
import ClubRoomEditor from './ClubRoomEditor'
import ClubToGo from './ClubToGo'
import ClubReservationPanel from './ClubReservationPanel'
import ClubRoomPage from './ClubRoomPage'
import InviteMembers from './InviteMembers'
import type { Reservation } from '../../types/reservation'
import type { Group } from '../room/Importer'
import type { AssignedGroup } from '../../types/room'

type TabKey = 'overview' | 'room' | 'food' | 'seating' | 'reservation' | 'invite'

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
  { key: 'room', moduleKey: 'room', label: 'Sitzplanung', icon: '🪑' },
  { key: 'food', moduleKey: 'food', label: 'Speiseplanung', icon: '🍽️' },
  { key: 'seating', moduleKey: 'seating', label: 'Gästeplanung', icon: '👥' },
  { key: 'reservation', moduleKey: 'reservation', label: 'Reservierung', icon: '📝' },
  { key: 'invite', moduleKey: 'invite', label: 'Mitgliedereinladung', icon: '📨' },
]

// ── Vereinsräume helpers (localStorage keyed by clubId) ─────
function loadClubRooms(clubId: string): SavedRoom[] {
  try { return JSON.parse(localStorage.getItem(`tm:clubrooms-${clubId}`) || '[]') } catch { return [] }
}
function saveToClubLibrary(clubId: string, room: SavedRoom): void {
  const list = loadClubRooms(clubId)
  const cleaned = list.filter(r => r.id !== room.id)
  localStorage.setItem(`tm:clubrooms-${clubId}`, JSON.stringify([room, ...cleaned]))
}

export default function ClubEventDetail() {
  const { clubId, eventId } = useParams<{ clubId: string; eventId: string }>()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const { setPageTitle, setHeaderContent } = usePageHeader()

  const location = useLocation()

  const [club, setClub] = useState<Club | null>(null)
  const [event, setEvent] = useState<ClubEvent | null>(null)
  const [loading, setLoading] = useState(true)
  // Restore active tab when returning from ClubRoomPage
  const [activeTab, setActiveTab] = useState<TabKey>(
    () => (location.state as any)?.activeTab || 'overview'
  )

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editFrom, setEditFrom] = useState('')
  const [editTo, setEditTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([])
  const [pickerMode, setPickerMode] = useState<'club' | 'personal'>('club')

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

  // Refresh event from API when switching to room tab (picks up ClubRoomPage saves)
  useEffect(() => {
    if (activeTab !== 'room' || !clubId || !eventId) return
    getClubEvent(clubId, eventId, token || undefined)
      .then(setEvent)
      .catch(() => { /* silent – keep existing data on error */ })
  }, [activeTab])

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

  const handleSeatingSave = useCallback(async (groups: Group[], assignedGroups: Record<string, AssignedGroup[]>) => {
    if (!clubId || !eventId || !data) return
    const updated = await updateClubEvent(clubId, eventId, { data: { ...data, seatingData: { groups, assignedGroups } } as any }, token || undefined)
    setEvent(updated)
  }, [clubId, eventId, data, token])

  const handleInviteSave = useCallback(async (selectedIds: string[]) => {
    if (!clubId || !eventId || !data) return
    const updated = await updateClubEvent(clubId, eventId, { data: { ...data, invitedMemberIds: selectedIds } as any }, token || undefined)
    setEvent(updated)
  }, [clubId, eventId, data, token])

  const handleReservationSync = useCallback(async (reservations: Reservation[], newSyncedIds: string[]) => {
    if (!clubId || !eventId || !data) return

    const withFood = reservations.filter(r =>
      Array.isArray(r.food_selections) && (r.food_selections as any[]).some((f: any) => f.quantity > 0)
    )
    const withoutFood = reservations.filter(r =>
      !Array.isArray(r.food_selections) || !(r.food_selections as any[]).some((f: any) => f.quantity > 0)
    )

    let updates: Partial<ClubEventData> = { syncedReservationIds: newSyncedIds }

    // ── Sync to Gästeplanung (seating) – reservations WITHOUT food ────
    if (data.modules.seating && withoutFood.length > 0) {
      const existingGroups: Group[] = data.seatingData?.groups ?? []
      const existingIds = new Set(existingGroups.map(g => g.id))
      const newGroups: Group[] = withoutFood
        .filter(r => !existingIds.has(r.id))
        .map(r => ({
          id: r.id,
          name: r.name,
          size: r.group_size,
          ...(r.notes ? { note: r.notes } : {}),
        }))
      if (newGroups.length > 0) {
        updates = {
          ...updates,
          seatingData: {
            groups: [...existingGroups, ...newGroups],
            assignedGroups: data.seatingData?.assignedGroups ?? {},
          },
        }
      }
    }

    // ── Sync to Speiseplanung (food/togo) – reservations WITH food ────
    if (data.modules.food && withFood.length > 0) {
      const existingOrders: ToGoOrder[] = data.togoConfig?.orders ?? []
      const existingOrderIds = new Set(existingOrders.map(o => o.id))
      const newOrders: ToGoOrder[] = withFood
        .filter(r => !existingOrderIds.has(r.id))
        .map(r => ({
          id: r.id,
          familyName: r.name,
          time: data.timeFrom || '',
          items: (r.food_selections as any[])
            .filter((f: any) => f.quantity > 0)
            .map((f: any): OrderItem => ({ menuItemId: f.menuItemId, quantity: f.quantity })),
          ...(r.notes ? { note: r.notes } : {}),
          createdAt: r.created_at,
        }))
      if (newOrders.length > 0) {
        updates = {
          ...updates,
          togoConfig: {
            menuItems: data.togoConfig?.menuItems ?? [],
            orders: [...existingOrders, ...newOrders],
          },
        }
      }
    }

    const updated = await updateClubEvent(
      clubId, eventId,
      { data: { ...data, ...updates } as any },
      token || undefined
    )
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
  function openRoomPicker(mode: 'club' | 'personal' = 'club') {
    setPickerMode(mode)
    if (mode === 'club') {
      setSavedRooms(loadClubRooms(clubId!))
    } else {
      const raw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms')
      try { setSavedRooms(raw ? JSON.parse(raw) : []) } catch { setSavedRooms([]) }
    }
    setShowRoomPicker(true)
  }

  function switchPickerMode(mode: 'club' | 'personal') {
    setPickerMode(mode)
    if (mode === 'club') {
      setSavedRooms(loadClubRooms(clubId!))
    } else {
      const raw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms')
      try { setSavedRooms(raw ? JSON.parse(raw) : []) } catch { setSavedRooms([]) }
    }
  }

  async function applyRoom(room: SavedRoom) {
    if (!clubId || !eventId || !data) return
    const updated = await updateClubEvent(clubId, eventId, {
      data: { ...data, roomData: { tables: room.data.tables, viewFrame: room.data.viewFrame ?? null } } as any,
    }, token || undefined)
    setEvent(updated)
    saveToClubLibrary(clubId, room)   // persist to Vereinsräume
    setShowRoomPicker(false)
  }

  function openRoomEditor() {
    navigate(`/app/club/${clubId}/events/${eventId}/room-editor`)
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
                <span style={{ color: '#1e293b' }}>{formatDateShort(event.created_at)}</span>
                {event.updated_at && event.updated_at !== event.created_at && (
                  <>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Geändert:</span>
                    <span style={{ color: '#1e293b' }}>{formatDateShort(event.updated_at)}</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>🧩 Aktive Module</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {data.modules?.room && (
                  <button onClick={() => setActiveTab('room')} style={modulePillStyle(true)}>🪑 Sitzplanung</button>
                )}
                {data.modules?.food && (
                  <button onClick={() => setActiveTab('food')} style={modulePillStyle(true)}>🍽️ Speiseplanung</button>
                )}
                {data.modules?.seating && (
                  <button onClick={() => setActiveTab('seating')} style={modulePillStyle(true)}>👥 Gästeplanung</button>
                )}
                {data.modules?.reservation && (
                  <button onClick={() => setActiveTab('reservation')} style={modulePillStyle(true)}>📝 Reservierung</button>
                )}
                {!data.modules?.room && !data.modules?.food && !data.modules?.seating && !data.modules?.reservation && (
                  <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Keine Module aktiviert.</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: Sitzplanung ═══ */}
        {activeTab === 'room' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Toolbar – only for Vorstand */}
            {isVorstand && (
              <div style={{ padding: '0 16px', height: 40, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {(data.roomData?.tables?.length ?? 0) > 0
                    ? `🪑 ${data.roomData!.tables.length} Tisch${data.roomData!.tables.length !== 1 ? 'e' : ''}`
                    : '🪑 Noch keine Tische – füge sie über die Seitenleiste hinzu'}
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={() => openRoomPicker()}
                  style={{ padding: '4px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}
                >🏛️ Vereinsraum laden</button>
                {(data.roomData?.tables?.length ?? 0) > 0 && (
                  <button onClick={async () => { if (!confirm('Sitzplanung wirklich entfernen?')) return; await handleRoomSave([], null) }}
                    style={{ padding: '4px 10px', background: '#fee2e2', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 500 }}
                  >✕ Entfernen</button>
                )}
              </div>
            )}

            {/* Always-on embedded editor */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ClubRoomEditor
                key={`room-${event.id}-${(data.roomData?.tables?.length ?? 0)}`}
                initialTables={data.roomData?.tables ?? []}
                initialViewFrame={data.roomData?.viewFrame ?? null}
                onSave={handleRoomSave}
                readOnly={!isVorstand}
              />
            </div>

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

        {/* ═══ TAB: Gästeplanung ═══ */}
        {activeTab === 'seating' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <ClubRoomPage
              tables={data.roomData?.tables ?? []}
              viewFrame={data.roomData?.viewFrame ?? null}
              initialGroups={data.seatingData?.groups ?? []}
              initialAssignedGroups={data.seatingData?.assignedGroups ?? {}}
              onSave={handleSeatingSave}
              readOnly={!isVorstand}
              onOpenRoomEditor={openRoomEditor}
            />
          </div>
        )}

        {/* ═══ TAB: Reservierung ═══ */}
        {activeTab === 'reservation' && (
          <ClubReservationPanel
            clubId={clubId!}
            eventId={eventId!}
            token={token || undefined}
            isVorstand={isVorstand}
            hasFoodModule={!!data.modules.food}
            hasSeatingModule={!!data.modules.seating}
            eventTitle={event.title}
            eventTimeFrom={data.timeFrom}
            eventTimeTo={data.timeTo}
            menuItemsFromFood={data.togoConfig?.menuItems ?? []}
            syncedReservationIds={data.syncedReservationIds ?? []}
            onSync={handleReservationSync}
          />
        )}

        {/* ═══ TAB: Mitgliedereinladung ═══ */}
        {activeTab === 'invite' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <InviteMembers
              clubId={clubId!}
              eventId={eventId!}
              token={token || undefined}
              initialSelected={data.invitedMemberIds ?? []}
              readOnly={!isVorstand}
              onSave={handleInviteSave}
            />
          </div>
        )}
      </div>

      {/* ═══ Vereinsraum Picker Modal ═══ */}
      {showRoomPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 0, width: 560, maxWidth: '92vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>🪑 Sitzplan laden</h3>
              <button onClick={() => setShowRoomPicker(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>×</button>
            </div>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 0, padding: '12px 24px 0', borderBottom: '1px solid #e2e8f0', marginTop: 12 }}>
              {(['club', 'personal'] as const).map(mode => (
                <button key={mode} onClick={() => switchPickerMode(mode)}
                  style={{
                    padding: '8px 16px', border: 'none', background: 'none',
                    borderBottom: pickerMode === mode ? '2px solid #667eea' : '2px solid transparent',
                    color: pickerMode === mode ? '#667eea' : '#64748b',
                    fontWeight: pickerMode === mode ? 700 : 500,
                    fontSize: 13, cursor: 'pointer', marginBottom: -1,
                  }}
                >{mode === 'club' ? '🏛️ Vereinsräume' : '👤 Meine Räume'}</button>
              ))}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
              {savedRooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  {pickerMode === 'club' ? (
                    <>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>🏛️</div>
                      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
                        Noch keine Vereinsräume gespeichert.<br />
                        Erstelle einen Raum – er wird automatisch zur Vereinsbibliothek hinzugefügt.
                      </p>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => { setShowRoomPicker(false); openRoomEditor() }}
                          style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >➕ Neuen Raum erstellen</button>
                        <button onClick={() => switchPickerMode('personal')}
                          style={{ padding: '9px 18px', background: 'white', color: '#667eea', border: '2px solid #c7d2fe', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >👤 Aus meinen Räumen</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
                      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
                        Keine persönlichen Räume gefunden.<br />
                        Erstelle zuerst einen Raum im Raum-Editor.
                      </p>
                      <button onClick={() => { setShowRoomPicker(false); openRoomEditor() }}
                        style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >➕ Raum-Editor öffnen</button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedRooms.map(room => (
                    <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {room.data?.tables?.length ?? 0} Tisch{(room.data?.tables?.length ?? 0) !== 1 ? 'e' : ''}
                          {room.createdAt && ` · ${formatDateShort(room.createdAt)}`}
                        </div>
                      </div>
                      <button onClick={() => applyRoom(room)}
                        style={{ padding: '7px 16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                      >Verwenden</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {pickerMode === 'club' ? 'Geteilte Vereinsbibliothek' : 'Persönliche Raum-Bibliothek · wird nach Auswahl zum Verein hinzugefügt'}
              </span>
              <button onClick={() => { setShowRoomPicker(false); openRoomEditor() }}
                style={{ padding: '6px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}
              >➕ Neuer Raum</button>
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
