import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getClub, getClubEvents, getClubEvent, updateClubEvent, deleteClubEvent, getClubRooms, createClubRoom } from '../../api/clubApi'
import type { Club, ClubEvent, ClubEventData, ClubEventModules } from '../../types/club'
import { TEMPLATE_LABELS, CLUB_MODULE_OPTIONS } from '../../types/club'
import type { Table, ViewFrame } from '../../types/room'
import type { MenuItem, ToGoOrder, OrderItem } from '../../types/togo'
import userStorage from '../../utils/userStorage'
import { formatDateShort } from '../../utils/dateFormatting'
import { usePageHeader } from '../layout/PageHeaderContext'
import { useEventTabs } from '../layout/EventTabContext'
import { useDeviceType } from '../../utils/useDeviceType'
import EventRoomEditor from '../shared/EventRoomEditor'
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
  const eventRoomEditorRef = useRef<any>(null)
  const seatingRoomRef = useRef<any>(null)
  const [autoSaving, setAutoSaving] = useState(false)
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null)

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
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [roomsError, setRoomsError] = useState<string | null>(null)
  const [moduleEditing, setModuleEditing] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState<keyof ClubEventModules | null>(null)

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

  // Persist on unload: try sendBeacon for club events, fallback to localStorage
  useEffect(() => {
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      if (!clubId || !eventId || !event) return
      // gather latest module state from seatingRoomRef and room editor
      const payload: any = { id: eventId, data: event.data, title: event.title }
      try {
        const seating = seatingRoomRef.current?.getCurrentData?.()
        if (seating) payload.data = { ...payload.data, seatingData: { groups: seating.groups, assignedGroups: seating.assignedGroups } }
      } catch {}
      try {
        const roomEditor = eventRoomEditorRef.current?.getCurrentData?.()
        if (roomEditor) payload.data = { ...payload.data, roomData: { tables: roomEditor.tables, viewFrame: roomEditor.viewFrame, gridHeight: roomEditor.gridHeight } }
      } catch {}

      // Try sendBeacon to API endpoint
      try {
        const RUNTIME_BASE = typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.VITE_API_URL
        const BUILD_BASE = (import.meta as any).env?.VITE_API_URL
        let BASE = RUNTIME_BASE || BUILD_BASE
        if (!BASE) {
          const proto = window.location.protocol
          const host = window.location.hostname
          BASE = `${proto}//${host}:4000`
        }
        const url = `${BASE}/clubs/${clubId}/events/${eventId}`
        const blob = new Blob([JSON.stringify({ data: payload.data, title: payload.title })], { type: 'application/json' })
        const ok = navigator.sendBeacon ? navigator.sendBeacon(url, blob) : false
        if (!ok) {
          // fallback: persist locally for later sync
          const key = `tm:pendingClubSaves`
          try {
            const raw = localStorage.getItem(key) || '[]'
            const arr = JSON.parse(raw)
            arr.push({ clubId, eventId, payload })
            localStorage.setItem(key, JSON.stringify(arr))
          } catch {}
        }
      } catch (e) {
        try {
          const key = `tm:pendingClubSaves`
          const raw = localStorage.getItem(key) || '[]'
          const arr = JSON.parse(raw)
          arr.push({ clubId, eventId, payload })
          localStorage.setItem(key, JSON.stringify(arr))
        } catch {}
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [clubId, eventId, event, seatingRoomRef, eventRoomEditorRef])

  // ── One-time localStorage → API migration for club rooms ──
  useEffect(() => {
    if (!clubId || !token) return
    const key = `tm:clubrooms-${clubId}`
    const raw = localStorage.getItem(key)
    if (!raw) return
    let rooms: SavedRoom[] = []
    try { rooms = JSON.parse(raw) } catch { return }
    if (!Array.isArray(rooms) || rooms.length === 0) { localStorage.removeItem(key); return }
    ;(async () => {
      try {
        for (const room of rooms) {
          await createClubRoom(clubId, { name: room.name, data: room.data }, token)
        }
        localStorage.removeItem(key)
      } catch { /* migration will retry next time */ }
    })()
  }, [clubId, token])

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

  // Calculate visible tabs early so autoSaveActiveTab can use it
  const completedSet = new Set(data?.completedModules ?? [])
  const visibleTabs = ALL_TABS.filter(t => !t.moduleKey || (data?.modules?.[t.moduleKey] && !completedSet.has(t.key)))

  // ── Save callbacks ──────────────────────────────────────────
  const handleRoomSave = useCallback(async (tables: Table[], viewFrame: ViewFrame | null, grid?: { width?: number; height?: number }) => {
    if (!clubId || !eventId || !data) return
    const roomData: any = { tables, viewFrame }
    if (grid?.height != null) roomData.gridHeight = grid.height
    if (grid?.width != null) roomData.gridWidth = grid.width
    const updated = await updateClubEvent(clubId, eventId, { data: { ...data, roomData } as any }, token || undefined)
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

  // Helper to auto-save active tab before switching
  const autoSaveActiveTab = useCallback(async (fromTab: TabKey) => {
    if (!event || !data) return

    // Only consider saves for tabs that are currently visible (module enabled)
    const tabVisible = visibleTabs.some(t => t.key === fromTab)
    if (!tabVisible) {
      return
    }

    // Skip non-saveable tabs
    if (fromTab === 'overview') return

    // Get persisted version for comparison (from localStorage)
    const persistedRaw = localStorage.getItem('events') || '[]'
    let persistedEvent: any | null = null
    try {
      const list = JSON.parse(persistedRaw as string) as any[]
      persistedEvent = list.find(e => e.id === eventId) || null
    } catch { persistedEvent = null }

    // If no persisted event found, don't auto-save
    if (!persistedEvent) return

    // Determine if data actually changed
    let shouldSave = false

    if (fromTab === 'room') {
      shouldSave = !!eventRoomEditorRef.current?.isDirty?.()
    } else if (fromTab === 'seating') {
      const isDirtyFn = seatingRoomRef.current?.isDirty
      if (typeof isDirtyFn === 'function') {
        shouldSave = !!isDirtyFn()
      } else {
        const current = seatingRoomRef.current?.getCurrentData?.() ?? { groups: data.seatingData?.groups ?? [], assignedGroups: data.seatingData?.assignedGroups ?? {} }
        const local = JSON.stringify(current ?? null)
        const remote = JSON.stringify(persistedEvent.seatingData ?? null)
        shouldSave = local !== remote
      }
    } else if (fromTab === 'food') {
      const local = JSON.stringify(data.togoConfig ?? null)
      const remote = JSON.stringify(persistedEvent.togoConfig ?? null)
      shouldSave = local !== remote
    } else if (fromTab === 'invite') {
      const local = JSON.stringify(data.invitedMemberIds ?? null)
      const remote = JSON.stringify(persistedEvent.invitedMemberIds ?? null)
      shouldSave = local !== remote
    }

    if (!shouldSave) return

    setAutoSaving(true)
    setAutoSaveToast('Speichert…')
    try {
      if (fromTab === 'room') {
        if (eventRoomEditorRef.current?.saveIfDirty) {
          await eventRoomEditorRef.current.saveIfDirty()
        }
      } else if (fromTab === 'seating') {
        if (seatingRoomRef.current?.saveIfDirty) {
          await seatingRoomRef.current.saveIfDirty()
        }
      } else if (fromTab === 'food' && data.togoConfig) {
        const { menuItems = [], orders = [] } = data.togoConfig
        await handleFoodSave(menuItems, orders)
      } else if (fromTab === 'invite' && data.invitedMemberIds) {
        await handleInviteSave(data.invitedMemberIds)
      }
      setAutoSaveToast('Gespeichert ✓')
      setTimeout(() => setAutoSaveToast(null), 1800)
    } catch (e) {
      console.error('club:autoSaveActiveTab:error', e, { fromTab })
      setAutoSaveToast('Fehler beim Speichern')
      setTimeout(() => setAutoSaveToast(null), 2500)
    } finally {
      setAutoSaving(false)
    }
  }, [event, data, visibleTabs, eventId, eventRoomEditorRef, seatingRoomRef, handleRoomSave, handleSeatingSave, handleFoodSave, handleInviteSave])

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

  // ── Module management ───────────────────────────────────────
  function moduleHasData(key: keyof ClubEventModules): boolean {
    if (!data) return false
    switch (key) {
      case 'room': return (data.roomData?.tables?.length ?? 0) > 0
      case 'food': return (data.togoConfig?.orders?.length ?? 0) > 0 || (data.togoConfig?.menuItems?.length ?? 0) > 0
      case 'seating': return (data.seatingData?.groups?.length ?? 0) > 0
      case 'reservation': return (data.syncedReservationIds?.length ?? 0) > 0
      case 'invite': return (data.invitedMemberIds?.length ?? 0) > 0
      default: return false
    }
  }

  async function toggleEventModule(key: keyof ClubEventModules) {
    if (!data) return
    const newVal = !data.modules[key]
    if (!newVal && moduleHasData(key)) {
      setConfirmDisable(key)
      return
    }
    applyModuleToggle(key)
  }

  async function applyModuleToggle(key: keyof ClubEventModules) {
    if (!clubId || !eventId || !data || !event) return
    const newModules = { ...data.modules }
    const newVal = !newModules[key]
    newModules[key] = newVal
    if (key === 'seating' && newVal) newModules.room = true
    if (key === 'room' && !newVal) newModules.seating = false

    let newCompleted = [...(data.completedModules ?? [])]
    if (newCompleted.includes(key)) {
      newCompleted = newCompleted.filter(k => k !== key)
    }

    const updatedData = { ...data, modules: newModules, completedModules: newCompleted }
    const updated = await updateClubEvent(clubId, eventId, { data: updatedData as any }, token || undefined)
    setEvent(updated)
    setConfirmDisable(null)
  }

  async function toggleModuleCompleted(key: string) {
    if (!clubId || !eventId || !data || !event) return
    const completed = new Set(data.completedModules ?? [])
    if (completed.has(key)) completed.delete(key)
    else {
      completed.add(key)
      if (activeTab === key) setActiveTab('overview')
    }
    const updatedData = { ...data, completedModules: [...completed] }
    const updated = await updateClubEvent(clubId, eventId, { data: updatedData as any }, token || undefined)
    setEvent(updated)
  }

  const device = useDeviceType()
  const isMobile = device === 'mobile'
  const { setEventTabs, clearEventTabs } = useEventTabs()
  const tabBarRef = useRef<HTMLDivElement>(null)

  // Scroll active tab into view when it changes
  useEffect(() => {
    const activeEl = tabBarRef.current?.querySelector('[data-active="true"]') as HTMLElement
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeTab])

  // Broadcast visible tabs to BottomTabBar on mobile
  useEffect(() => {
    if (!isMobile || !event) return
    setEventTabs(
      visibleTabs.map(t => ({ key: t.key, label: t.label, icon: t.icon })),
      activeTab,
      (key: string) => { void autoSaveActiveTab(activeTab).then(() => setActiveTab(key as TabKey)) },
    )
  }, [isMobile, visibleTabs, event?.id, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep context activeTab in sync when local activeTab changes
  useEffect(() => {
    if (!isMobile || !event) return
    setEventTabs(
      visibleTabs.map(t => ({ key: t.key, label: t.label, icon: t.icon })),
      activeTab,
      (key: string) => { void autoSaveActiveTab(activeTab).then(() => setActiveTab(key as TabKey)) },
    )
  }, [activeTab, visibleTabs, isMobile, event?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear event tabs on unmount
  useEffect(() => {
    return () => { clearEventTabs() }
  }, [clearEventTabs])

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
  async function loadClubRoomsFromApi() {
    if (!clubId) return
    setRoomsLoading(true)
    setRoomsError(null)
    try {
      const rooms = await getClubRooms(clubId, token || undefined)
      setSavedRooms(rooms.map((r: any) => ({ id: r.id, name: r.name, createdAt: r.created_at, data: r.data })))
    } catch (err: any) {
      setRoomsError(err?.message || 'Fehler beim Laden der Räume.')
      setSavedRooms([])
    } finally {
      setRoomsLoading(false)
    }
  }

  function openRoomPicker(mode: 'club' | 'personal' = 'club') {
    setPickerMode(mode)
    if (mode === 'club') {
      loadClubRoomsFromApi()
    } else {
      const raw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms')
      try { setSavedRooms(raw ? JSON.parse(raw) : []) } catch { setSavedRooms([]) }
    }
    setShowRoomPicker(true)
  }

  function switchPickerMode(mode: 'club' | 'personal') {
    setPickerMode(mode)
    if (mode === 'club') {
      loadClubRoomsFromApi()
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
    // If applied from personal rooms, also save to club library via API
    if (pickerMode === 'personal') {
      try {
        await createClubRoom(clubId, { name: room.name, data: room.data }, token || undefined)
      } catch { /* ignore – room already exists or save failed */ }
    }
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

      {!isMobile && autoSaveToast && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, background: '#0f172a', color: 'white', padding: '8px 12px', borderRadius: 10, boxShadow: '0 10px 30px rgba(2,6,23,0.6)', zIndex: 4000, fontWeight: 700 }}>
          {autoSaveToast}
        </div>
      )}

      {/* ── Slim module / tab bar (desktop/tablet only) ─────────────────────────────── */}
      {!isMobile && (
      <div ref={tabBarRef} className="scrollable-tabs" style={{ background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 0, padding: '0 16px', flexShrink: 0 }}>
        <button
          onClick={() => navigate(`/app/club/${clubId}/events`)}
          style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 13, padding: '10px 8px 10px 0', fontWeight: 500, flexShrink: 0, marginRight: 8 }}
        >← Zurück</button>

        <div style={{ width: 1, height: 20, background: '#e2e8f0', marginRight: 8, flexShrink: 0 }} />

        {visibleTabs.map(tab => {
          const active = activeTab === tab.key
          return (
            <button key={tab.key} onClick={async () => {
                try { await autoSaveActiveTab(activeTab) } catch (e) { console.error('club:autoSave:error', e) }
                setActiveTab(tab.key)
              }}
              data-active={active ? 'true' : undefined}
              style={{
                padding: '10px 16px', border: 'none',
                borderBottom: active ? '2px solid #667eea' : '2px solid transparent',
                background: 'none',
                color: active ? '#667eea' : '#64748b',
                fontWeight: active ? 700 : 500,
                fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >{tab.icon} {tab.label}</button>
          )
        })}
      </div>
      )}

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
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Zuletzt gespeichert:</span>
                    <span style={{ color: '#1e293b' }}>{formatDateShort(event.updated_at)}</span>
                  </>
                )}
              </div>
            </div>

            {/* ── Module verwalten (collapsible) ── */}
            <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
              {isVorstand ? (
                <button onClick={() => setModuleEditing(!moduleEditing)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>🧩</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Module verwalten</span>
                    {(() => {
                      const active = CLUB_MODULE_OPTIONS.filter(m => !!data.modules[m.key])
                      const done = active.filter(m => completedSet.has(m.key)).length
                      return (
                        <span style={{ fontSize: 11, color: done > 0 ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                          {done}/{active.length} erledigt
                        </span>
                      )
                    })()}
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{moduleEditing ? '▲ Fertig' : '▼ Module ändern'}</span>
                </button>
              ) : (
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>🧩 Aktive Module</h3>
              )}

              {!moduleEditing && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: isVorstand ? 12 : 0 }}>
                  {CLUB_MODULE_OPTIONS.filter(m => !!data.modules[m.key]).map(m => {
                    const done = completedSet.has(m.key)
                    return (
                      <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        <button onClick={() => done ? toggleModuleCompleted(m.key) : setActiveTab(m.key as TabKey)}
                          style={{
                            padding: isVorstand ? '6px 10px 6px 14px' : '8px 16px',
                            borderRadius: isVorstand ? '20px 0 0 20px' : 10,
                            border: '1px solid ' + (done ? '#bbf7d0' : '#e2e8f0'),
                            borderRight: isVorstand ? 'none' : undefined,
                            background: done ? '#f0fdf4' : '#f8fafc', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600,
                            color: done ? '#16a34a' : '#475569',
                          }}
                        >{done ? '✅' : m.icon} {m.label}</button>
                        {isVorstand && (
                          <button
                            onClick={() => toggleModuleCompleted(m.key)}
                            title={done ? 'Modul wieder öffnen' : 'Als erledigt markieren'}
                            style={{
                              padding: '6px 10px', borderRadius: '0 20px 20px 0',
                              border: '1px solid ' + (done ? '#bbf7d0' : '#e2e8f0'),
                              background: done ? '#16a34a' : '#f8fafc', cursor: 'pointer',
                              fontSize: 12, lineHeight: 1, color: done ? '#fff' : '#94a3b8',
                              display: 'flex', alignItems: 'center',
                            }}
                          >{done ? '↺' : '✓'}</button>
                        )}
                      </div>
                    )
                  })}
                  {!CLUB_MODULE_OPTIONS.some(m => !!data.modules[m.key]) && (
                    <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Keine Module aktiviert.</span>
                  )}
                </div>
              )}

              {moduleEditing && isVorstand && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {CLUB_MODULE_OPTIONS.map(mod => {
                    const active = !!data.modules[mod.key]
                    return (
                      <button key={mod.key} onClick={() => toggleEventModule(mod.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                          border: active ? '2px solid #667eea' : '1px solid #e2e8f0',
                          background: active ? 'linear-gradient(135deg, rgba(102,126,234,0.04), rgba(118,75,162,0.04))' : 'white',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                          border: active ? '2px solid #667eea' : '2px solid #cbd5e1',
                          background: active ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {active && <span style={{ color: 'white', fontSize: 11, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{mod.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#667eea' : '#1e293b' }}>{mod.label}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{mod.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
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
              <EventRoomEditor
                key={`room-${event.id}-${(data.roomData?.tables?.length ?? 0)}`}
                initialTables={data.roomData?.tables ?? []}
                initialViewFrame={data.roomData?.viewFrame ?? null}
                initialGridHeight={data.roomData?.gridHeight ?? 20}
                onSave={handleRoomSave}
                readOnly={!isVorstand}
                ref={eventRoomEditorRef}
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
              ref={seatingRoomRef as any}
              tables={data.roomData?.tables ?? []}
              viewFrame={data.roomData?.viewFrame ?? null}
              gridHeight={data.roomData?.gridHeight ?? 20}
              gridWidth={data.roomData?.gridWidth ?? 28}
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
              {roomsLoading && pickerMode === 'club' ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#64748b', fontSize: 14 }}>Räume werden geladen…</div>
              ) : roomsError && pickerMode === 'club' ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
                  <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 12 }}>{roomsError}</p>
                  <button onClick={() => loadClubRoomsFromApi()}
                    style={{ padding: '7px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}
                  >↻ Erneut versuchen</button>
                </div>
              ) : savedRooms.length === 0 ? (
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

      {/* ═══ Confirm deactivate module dialog ═══ */}
      {confirmDisable && (() => {
        const mod = CLUB_MODULE_OPTIONS.find(m => m.key === confirmDisable)
        if (!mod) return null
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setConfirmDisable(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '24px', maxWidth: 400, width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Modul deaktivieren?</h3>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                <strong>{mod.icon} {mod.label}</strong> enthält bereits Daten.
              </p>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Das Modul wird ausgeblendet, aber die Daten bleiben erhalten. Wenn es später wieder aktiviert wird, ist alles noch da.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmDisable(null)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}
                >Abbrechen</button>
                <button onClick={() => applyModuleToggle(confirmDisable)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'white' }}
                >Deaktivieren</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
