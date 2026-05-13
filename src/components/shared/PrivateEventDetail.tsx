import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import userStorage from '../../utils/userStorage'
import { syncUserData } from '../../utils/sync'
import { hydrateUserData } from '../../utils/sync'
import api from '../../api/apiClient'
import type { PrivateEventItem, EventModules, EventMenuData, EventGuestInviteData, EventDashboardConfig, EventChecklistData, EventBudgetData, EventTimelineData } from '../../types/event'
import { migratePrivateEvent, PRIVATE_MODULE_OPTIONS } from '../../types/event'
import type { Table, ViewFrame, AssignedGroup } from '../../types/room'
import type { Group } from '../room/Importer'
import { usePageHeader } from '../layout/PageHeaderContext'
import { useEventTabs } from '../layout/EventTabContext'
import { useDeviceType } from '../../utils/useDeviceType'
import EventRoomEditor from './EventRoomEditor'
import Room from '../room/Room'
import EventChecklist from './EventChecklist'
import EventBudget from './EventBudget'
import EventTimeline from './EventTimeline'
import EventMenuPlan from './EventMenuPlan'
import EventGuestInvite from './EventGuestInvite'
import EventGuestDashboard from './EventGuestDashboard'

type TabKey = 'overview' | 'room' | 'seating' | 'menu' | 'guestInvite' | 'dashboard' | 'checklist' | 'budget' | 'timeline'

interface TabDef {
  key: TabKey
  moduleKey?: keyof EventModules
  label: string
  icon: string
}

const ALL_TABS: TabDef[] = [
  { key: 'overview', label: 'Übersicht', icon: '📊' },
  { key: 'room', moduleKey: 'room', label: 'Raumplanung', icon: '🏠' },
  { key: 'seating', moduleKey: 'seating', label: 'Tischplanung', icon: '🪑' },
  { key: 'menu', moduleKey: 'menu', label: 'Menüplanung', icon: '🍽️' },
  { key: 'guestInvite', moduleKey: 'guestInvite', label: 'Einladungen', icon: '💌' },
  { key: 'dashboard', moduleKey: 'dashboard', label: 'Gäste-Info', icon: '📱' },
  { key: 'checklist', moduleKey: 'checklist', label: 'Checkliste', icon: '✅' },
  { key: 'budget', moduleKey: 'budget', label: 'Budget', icon: '💰' },
  { key: 'timeline', moduleKey: 'timeline', label: 'Ablaufplan', icon: '⏱️' },
]

type SavedRoom = {
  id: string
  name: string
  createdAt?: string
  data: { tables: Table[]; viewFrame?: ViewFrame | null }
}

export default function PrivateEventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const { setPageTitle, setHeaderContent } = usePageHeader()
  const userId = user?.id ?? null

  const [event, setEvent] = useState<PrivateEventItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editFrom, setEditFrom] = useState('')
  const [editTo, setEditTo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([])
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [templateConflict, setTemplateConflict] = useState<SavedRoom | null>(null)
  const [roomTemplateToast, setRoomTemplateToast] = useState<string | null>(null)
  const [templateEditId, setTemplateEditId] = useState<string | null>(null)
  const [templateEditName, setTemplateEditName] = useState('')
  const [templateEditError, setTemplateEditError] = useState<string | null>(null)
  const [moduleEditing, setModuleEditing] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState<keyof EventModules | null>(null)

  // Load event from localStorage
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (userId) await hydrateUserData(token, userId)
      if (!mounted) return

      const rawEvents = userStorage.getItem('events', userId) || localStorage.getItem('events') || '[]'
      const events = JSON.parse(rawEvents as string) as any[]
      const found = events.find((e: any) => e.id === eventId)
      if (found) {
        setEvent(migratePrivateEvent(found))
      }
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [eventId, userId, token])

  // Re-hydrate from backend when switching to guestInvite tab
  // so the host always sees fresh RSVP statuses
  useEffect(() => {
    if (activeTab !== 'guestInvite' || !userId || !token) return
    let mounted = true
    ;(async () => {
      await hydrateUserData(token, userId)
      if (!mounted) return
      const rawEvents = userStorage.getItem('events', userId) || localStorage.getItem('events') || '[]'
      const events = JSON.parse(rawEvents as string) as any[]
      const found = events.find((e: any) => e.id === eventId)
      if (found) setEvent(migratePrivateEvent(found))
    })()
    return () => { mounted = false }
  }, [activeTab, eventId, userId, token])

  // ── Persist helper ──
  const persistEvent = useCallback(async (updated: PrivateEventItem) => {
    const rawEvents = userStorage.getItem('events', userId) || localStorage.getItem('events') || '[]'
    const events = JSON.parse(rawEvents as string) as any[]
    const newList = events.map((e: any) => e.id === updated.id ? updated : e)
    userStorage.setItem('events', JSON.stringify(newList), userId)
    userStorage.setItem('currentEvent', JSON.stringify(updated), userId)
    setEvent(updated)
    if (userId) {
      try { await syncUserData(token, userId) } catch {}
    }
  }, [userId, token])

  // ── Save callbacks ──
  const handleRoomSave = useCallback(async (tables: Table[], viewFrame: ViewFrame | null, grid?: { width?: number; height?: number }) => {
    if (!event) return
    const roomData: any = { tables, viewFrame }
    if (grid?.height != null) roomData.gridHeight = grid.height
    if (grid?.width != null) roomData.gridWidth = grid.width
    await persistEvent({ ...event, roomData })
  }, [event, persistEvent])

  const handleSeatingSave = useCallback(async (groups: Group[], assignedGroups: Record<string, AssignedGroup[]>) => {
    if (!event) return
    await persistEvent({ ...event, seatingData: { groups, assignedGroups } })
  }, [event, persistEvent])

  // ── New module save callbacks ──
  const handleChecklistSave = useCallback(async (data: EventChecklistData) => {
    if (!event) return
    await persistEvent({ ...event, checklistData: data })
  }, [event, persistEvent])

  const handleBudgetSave = useCallback(async (data: EventBudgetData) => {
    if (!event) return
    await persistEvent({ ...event, budgetData: data })
  }, [event, persistEvent])

  const handleTimelineSave = useCallback(async (data: EventTimelineData) => {
    if (!event) return
    await persistEvent({ ...event, timelineData: data })
  }, [event, persistEvent])

  const handleMenuSave = useCallback(async (menuData: EventMenuData) => {
    if (!event) return
    await persistEvent({ ...event, menuData })
  }, [event, persistEvent])

  const handleGuestInviteSave = useCallback(async (guestInviteData: EventGuestInviteData) => {
    if (!event) return
    await persistEvent({ ...event, guestInviteData })
  }, [event, persistEvent])

  const handleDashboardSave = useCallback(async (dashboardConfig: EventDashboardConfig) => {
    if (!event) return
    await persistEvent({ ...event, dashboardConfig })
  }, [event, persistEvent])

  // ── Toggle modules after creation ──
  async function toggleEventModule(key: keyof EventModules) {
    if (!event) return
    const newModules = { ...event.modules }
    const newVal = !newModules[key]

    // If deactivating a module that has data, ask for confirmation first
    if (!newVal && moduleHasData(event, key)) {
      setConfirmDisable(key)
      return
    }

    applyModuleToggle(key)
  }

  function moduleHasData(ev: PrivateEventItem, key: keyof EventModules): boolean {
    switch (key) {
      case 'room': return (ev.roomData?.tables?.length ?? 0) > 0
      case 'seating': return (ev.seatingData?.groups?.length ?? 0) > 0
      case 'checklist': return (ev.checklistData?.items?.length ?? 0) > 0
      case 'budget': return (ev.budgetData?.items?.length ?? 0) > 0
      case 'timeline': return (ev.timelineData?.entries?.length ?? 0) > 0
      case 'menu': return (ev.menuData?.courses?.length ?? 0) > 0
      case 'guestInvite': return (ev.guestInviteData?.invitations?.length ?? 0) > 0
      case 'dashboard': return !!ev.dashboardConfig
      default: return false
    }
  }

  async function applyModuleToggle(key: keyof EventModules) {
    if (!event) return
    const newModules = { ...event.modules }
    const newVal = !newModules[key]
    newModules[key] = newVal
    // Seating requires room
    if (key === 'seating' && newVal) newModules.room = true
    // Disabling room also disables seating
    if (key === 'room' && !newVal) newModules.seating = false

    const updated: PrivateEventItem = { ...event, modules: newModules }
    // Clear completed flag when toggling a module
    if (updated.completedModules?.includes(key)) {
      updated.completedModules = updated.completedModules.filter(k => k !== key)
    }
    // Initialize data for newly enabled modules
    if (newVal) {
      if (key === 'room' && !updated.roomData) updated.roomData = { tables: [], viewFrame: null }
      if (key === 'seating' && !updated.seatingData) updated.seatingData = { groups: [], assignedGroups: {} }
      if (key === 'checklist' && !updated.checklistData) updated.checklistData = { items: [] }
      if (key === 'budget' && !updated.budgetData) updated.budgetData = { items: [], currency: 'EUR' }
      if (key === 'timeline' && !updated.timelineData) updated.timelineData = { entries: [] }
      if (key === 'menu' && !updated.menuData) updated.menuData = { courses: [] }
      if (key === 'guestInvite' && !updated.guestInviteData) updated.guestInviteData = { shareToken: Math.random().toString(36).slice(2) + Date.now().toString(36), shareMode: 'open', invitations: [] }
      if (key === 'dashboard' && !updated.dashboardConfig) updated.dashboardConfig = { showTimeline: false, showMenu: false, showSeating: false, showLocation: true }
    }
    await persistEvent(updated)
    setConfirmDisable(null)
  }

  async function toggleModuleCompleted(key: string) {
    if (!event) return
    const completed = new Set(event.completedModules ?? [])
    if (completed.has(key)) completed.delete(key)
    else {
      completed.add(key)
      // If the completed tab is currently active, switch to overview
      if (activeTab === key) setActiveTab('overview')
    }
    await persistEvent({ ...event, completedModules: [...completed] })
  }

  const completedSet = new Set(event?.completedModules ?? [])
  const visibleTabs = ALL_TABS.filter(t => !t.moduleKey || (event?.modules?.[t.moduleKey] && !completedSet.has(t.key)))

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
      (key: string) => setActiveTab(key as TabKey),
    )
  }, [isMobile, visibleTabs.length, event?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep context activeTab in sync when local activeTab changes
  useEffect(() => {
    if (!isMobile || !event) return
    setEventTabs(
      visibleTabs.map(t => ({ key: t.key, label: t.label, icon: t.icon })),
      activeTab,
      (key: string) => setActiveTab(key as TabKey),
    )
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear event tabs on unmount
  useEffect(() => {
    return () => { clearEventTabs() }
  }, [clearEventTabs])

  // Merge accepted RSVP guests into seating groups
  const seatingGroups = useMemo(() => {
    const existing = event?.seatingData?.groups ?? []
    const invitations = event?.guestInviteData?.invitations ?? []
    const accepted = invitations.filter(i => i.status === 'accepted')
    if (!accepted.length) return existing

    const existingIds = new Set(existing.map(g => g.id))
    const merged = [...existing]
    for (const inv of accepted) {
      const guestGroupId = `rsvp-${inv.id}`
      if (!existingIds.has(guestGroupId)) {
        merged.push({
          id: guestGroupId,
          name: inv.name,
          size: inv.confirmedCount ?? inv.groupSize,
        })
      }
    }
    return merged
  }, [event?.seatingData?.groups, event?.guestInviteData?.invitations])

  function startEditing() {
    if (!event) return
    setEditTitle(event.name)
    setEditDate(event.eventDate || '')
    setEditFrom(event.from || '')
    setEditTo(event.to || '')
    setEditing(true)
    setError(null)
  }

  async function handleSave() {
    if (!event) return
    if (!editTitle.trim()) { setError('Name ist erforderlich.'); return }
    setError(null)
    const now = new Date()
    await persistEvent({
      ...event,
      name: editTitle.trim(),
      eventDate: editDate,
      from: editFrom,
      to: editTo,
      lastModified: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
    })
    setEditing(false)
  }

  async function handleDelete() {
    if (!event) return
    if (!confirm(`Event "${event.name}" wirklich löschen?`)) return
    const rawEvents = userStorage.getItem('events', userId) || localStorage.getItem('events') || '[]'
    const events = JSON.parse(rawEvents as string) as any[]
    const newList = events.filter((e: any) => e.id !== event.id)
    userStorage.setItem('events', JSON.stringify(newList), userId)
    try { await api.del(`/events/${event.id}`, token ?? undefined) } catch {}
    if (userId) { try { await syncUserData(token, userId) } catch {} }
    setPageTitle(null)
    setHeaderContent(null)
    navigate('/app/events')
  }

  // ── Room picker ──
  function openRoomPicker() {
    const raw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms')
    try { setSavedRooms(raw ? JSON.parse(raw) : []) } catch { setSavedRooms([]) }
    setTemplateEditId(null)
    setTemplateEditName('')
    setTemplateEditError(null)
    setShowRoomPicker(true)
  }

  async function applyRoom(room: SavedRoom) {
    if (!event) return
    await persistEvent({
      ...event,
      roomId: room.id,
      roomData: { tables: room.data.tables, viewFrame: room.data.viewFrame ?? null },
    })
    setShowRoomPicker(false)
  }

  async function startEmptyRoomPlanning() {
    if (!event) return
    await persistEvent({
      ...event,
      roomId: undefined,
      roomData: { tables: [], viewFrame: null },
    })
    setShowRoomPicker(false)
  }

  function openSaveTemplateModal() {
    if (!event?.roomData?.tables?.length) return
    setTemplateName(event.name ? `${event.name} Raumvorlage` : 'Neue Raumvorlage')
    setTemplateError(null)
    setTemplateConflict(null)
    setShowSaveTemplateModal(true)
  }

  function buildDuplicateTemplateName(baseName: string, rooms: SavedRoom[]) {
    let suffix = 2
    let candidate = `${baseName} (${suffix})`
    while (rooms.some(room => room.name === candidate)) {
      suffix += 1
      candidate = `${baseName} (${suffix})`
    }
    return candidate
  }

  function updateSavedRooms(nextRooms: SavedRoom[]) {
    userStorage.setItem('rooms', JSON.stringify(nextRooms), userId)
    setSavedRooms(nextRooms)
  }

  function startRenameTemplate(room: SavedRoom) {
    setTemplateEditId(room.id)
    setTemplateEditName(room.name)
    setTemplateEditError(null)
  }

  function cancelRenameTemplate() {
    setTemplateEditId(null)
    setTemplateEditName('')
    setTemplateEditError(null)
  }

  function submitRenameTemplate(roomId: string) {
    const trimmedName = templateEditName.trim()
    if (!trimmedName) {
      setTemplateEditError('Name der Vorlage ist erforderlich.')
      return
    }
    if (savedRooms.some(room => room.id !== roomId && room.name === trimmedName)) {
      setTemplateEditError('Eine andere Vorlage mit diesem Namen existiert bereits.')
      return
    }
    const nextRooms = savedRooms.map(room => (room.id === roomId ? { ...room, name: trimmedName } : room))
    updateSavedRooms(nextRooms)
    cancelRenameTemplate()
    setRoomTemplateToast(`Vorlage „${trimmedName}“ umbenannt.`)
    setTimeout(() => setRoomTemplateToast(null), 3000)
  }

  function deleteTemplate(roomId: string) {
    const room = savedRooms.find(entry => entry.id === roomId)
    if (!room) return
    if (!confirm(`Vorlage „${room.name}" wirklich löschen?`)) return
    const nextRooms = savedRooms.filter(entry => entry.id !== roomId)
    updateSavedRooms(nextRooms)
    if (templateEditId === roomId) {
      cancelRenameTemplate()
    }
    setRoomTemplateToast(`Vorlage „${room.name}“ gelöscht.`)
    setTimeout(() => setRoomTemplateToast(null), 3000)
  }

  function renderRoomPreview(room: SavedRoom) {
    const tables = room.data.tables ?? []
    if (tables.length === 0) {
      return <div style={{ fontSize: 11, color: '#94a3b8' }}>Keine Tischdaten</div>
    }

    const maxX = Math.max(...tables.map(table => table.x + table.width), 1)
    const maxY = Math.max(...tables.map(table => table.y + table.height), 1)
    const width = 96
    const height = 68
    const cellWidth = width / maxX
    const cellHeight = height / maxY

    return (
      <div style={{ width, height, position: 'relative', borderRadius: 8, background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #dbeafe', overflow: 'hidden' }}>
        {tables.map(table => (
          <div
            key={table.id}
            style={{
              position: 'absolute',
              left: table.x * cellWidth,
              top: table.y * cellHeight,
              width: Math.max(table.width * cellWidth - 2, 8),
              height: Math.max(table.height * cellHeight - 2, 8),
              borderRadius: 4,
              background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)',
            }}
            title={table.id}
          />
        ))}
      </div>
    )
  }

  function writeRoomTemplate(name: string, mode: 'overwrite' | 'duplicate') {
    if (!event?.roomData?.tables?.length) return
    const rawRooms = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms') || '[]'
    const rooms = JSON.parse(rawRooms as string) as SavedRoom[]
    const existing = rooms.find(room => room.name === name)
    const finalName = mode === 'duplicate' && existing ? buildDuplicateTemplateName(name, rooms) : name
    const entry: SavedRoom = {
      id: mode === 'overwrite' && existing ? existing.id : `r-${Date.now()}`,
      name: finalName,
      createdAt: mode === 'overwrite' && existing ? existing.createdAt ?? new Date().toLocaleDateString() : new Date().toLocaleDateString(),
      data: {
        tables: event.roomData.tables,
        viewFrame: event.roomData.viewFrame ?? null,
      },
    }
    const nextRooms = mode === 'overwrite' && existing
      ? rooms.map(room => (room.id === existing.id ? entry : room))
      : [...rooms, entry]

    userStorage.setItem('rooms', JSON.stringify(nextRooms), userId)
    setSavedRooms(nextRooms)
    setShowSaveTemplateModal(false)
    setTemplateConflict(null)
    setTemplateError(null)
    setRoomTemplateToast(mode === 'overwrite' ? `Vorlage „${entry.name}“ überschrieben.` : `Vorlage „${entry.name}“ gespeichert.`)
    setTimeout(() => setRoomTemplateToast(null), 3000)
  }

  async function saveRoomAsTemplate() {
    if (!event?.roomData?.tables?.length) return
    const trimmedName = templateName.trim()
    if (!trimmedName) {
      setTemplateError('Name der Vorlage ist erforderlich.')
      return
    }

    const rawRooms = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms') || '[]'
    const rooms = JSON.parse(rawRooms as string) as SavedRoom[]
    const existing = rooms.find(room => room.name === trimmedName)
    if (existing) {
      setTemplateConflict(existing)
      setTemplateError(null)
      return
    }

    writeRoomTemplate(trimmedName, 'duplicate')
  }

  // ── Page header ──
  useEffect(() => {
    if (!event) return

    setPageTitle(event.name, '📅')
    setHeaderContent(null)
  }, [event])

  useEffect(() => {
    return () => { setPageTitle(null); setHeaderContent(null) }
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Laden…</div>
  if (!event) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Event nicht gefunden.</div>

  const dateLabel = event.eventDate
    ? new Date(event.eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* ── Tab bar (desktop/tablet only when mobile uses bottom tabs) ── */}
      {!isMobile && (
      <div ref={tabBarRef} className="scrollable-tabs" style={{ background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 0, padding: '0 16px', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/app/events')}
          style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 13, padding: '10px 8px 10px 0', fontWeight: 500, flexShrink: 0, marginRight: 8 }}
        >← Zurück</button>

        <div style={{ width: 1, height: 20, background: '#e2e8f0', marginRight: 8, flexShrink: 0 }} />

        {visibleTabs.map(tab => {
          const active = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
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

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* ═══ TAB: Übersicht ═══ */}
        {activeTab === 'overview' && (() => {
          // ── Compute stats from event data ──
          const invitations = event.guestInviteData?.invitations ?? []
          const guestTotal = invitations.length
          const guestAccepted = invitations.filter(i => i.status === 'accepted').length
          const guestDeclined = invitations.filter(i => i.status === 'declined').length
          const guestPending = invitations.filter(i => i.status === 'pending').length
          const confirmedHeadcount = invitations.filter(i => i.status === 'accepted').reduce((s, i) => s + (i.confirmedCount ?? i.groupSize), 0)

          const checkItems = event.checklistData?.items ?? []
          const checkDone = checkItems.filter(i => i.done).length
          const checkOverdue = checkItems.filter(i => !i.done && i.dueDate && new Date(i.dueDate) < new Date()).length

          const budgetItems = event.budgetData?.items ?? []
          const budgetEstimated = budgetItems.reduce((s, i) => s + i.estimated, 0)
          const budgetActual = budgetItems.reduce((s, i) => s + (i.actual ?? 0), 0)
          const budgetLimit = event.budgetData?.totalBudget ?? 0
          const budgetCurrency = event.budgetData?.currency === 'EUR' ? '€' : event.budgetData?.currency ?? '€'

          const timelineEntries = event.timelineData?.entries?.length ?? 0
          const menuCourses = event.menuData?.courses?.length ?? 0
          const menuChoices = event.menuData?.courses?.reduce((s, c) => s + c.choices.length, 0) ?? 0

          const countdownDays = (() => {
            if (!event.eventDate) return null
            const diff = new Date(event.eventDate + 'T00:00:00').getTime() - Date.now()
            return diff > 0 ? Math.floor(diff / 86400000) : diff === 0 ? 0 : null
          })()

          const timeLabel2 = event.from && event.to ? `${event.from} – ${event.to} Uhr` : event.from ? `ab ${event.from} Uhr` : null

          // ── Build action hints ──
          const hints: { text: string; tab: TabKey; icon: string; color: string }[] = []
          if (event.modules.guestInvite && guestPending > 0)
            hints.push({ text: `${guestPending} ${guestPending === 1 ? 'Gast hat' : 'Gäste haben'} noch nicht geantwortet`, tab: 'guestInvite', icon: '⏳', color: '#f59e0b' })
          if (event.modules.checklist && checkOverdue > 0)
            hints.push({ text: `${checkOverdue} überfällige ${checkOverdue === 1 ? 'Aufgabe' : 'Aufgaben'}`, tab: 'checklist', icon: '⚠️', color: '#ef4444' })
          if (event.modules.budget && budgetLimit > 0 && budgetActual > budgetLimit)
            hints.push({ text: `Budget um ${budgetCurrency}${(budgetActual - budgetLimit).toLocaleString('de-DE')} überschritten`, tab: 'budget', icon: '💸', color: '#ef4444' })
          if (event.modules.guestInvite && guestTotal === 0)
            hints.push({ text: 'Noch keine Gäste eingeladen', tab: 'guestInvite', icon: '💌', color: '#667eea' })
          if (event.modules.dashboard && !event.dashboardConfig?.welcomeMessage && !event.dashboardConfig?.locationName)
            hints.push({ text: 'Gäste-Info noch nicht eingerichtet', tab: 'dashboard', icon: '📱', color: '#667eea' })
          if (event.modules.timeline && timelineEntries === 0)
            hints.push({ text: 'Ablaufplan ist noch leer', tab: 'timeline', icon: '⏱️', color: '#64748b' })

          const oInputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
          const oLabelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }

          return (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>

            {/* ── Hero Banner ── */}
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 20, padding: '28px 28px 24px', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

              {editing ? (
                /* ── Inline edit form ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    placeholder="Event-Name" autoFocus
                    style={{ padding: '10px 14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 18, fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2, display: 'block' }}>Datum</label>
                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ minWidth: 100 }}>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2, display: 'block' }}>Von</label>
                      <input type="time" value={editFrom} onChange={e => setEditFrom(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ minWidth: 100 }}>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2, display: 'block' }}>Bis</label>
                      <input type="time" value={editTo} onChange={e => setEditTo(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  {error && <span style={{ color: '#fca5a5', fontSize: 12 }}>{error}</span>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleSave}
                      style={{ padding: '8px 20px', background: 'white', color: '#667eea', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                    >✓ Speichern</button>
                    <button onClick={() => { setEditing(false); setError(null) }}
                      style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                    >Abbrechen</button>
                  </div>
                </div>
              ) : (
                /* ── Display mode ── */
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{event.name}</h2>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={startEditing}
                        style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                      >✏️ Bearbeiten</button>
                      <button onClick={handleDelete}
                        style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.4)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
                      >🗑️</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 14, opacity: 0.9, flexWrap: 'wrap', marginBottom: countdownDays != null ? 8 : 0 }}>
                    {dateLabel && <span>📅 {dateLabel}</span>}
                    {timeLabel2 && <span>🕐 {timeLabel2}</span>}
                  </div>
                  {countdownDays != null && (
                    <div style={{ marginTop: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'inline-flex', alignItems: 'baseline', gap: 6, backdropFilter: 'blur(4px)' }}>
                      <span style={{ fontSize: 24, fontWeight: 800 }}>{countdownDays}</span>
                      <span style={{ fontSize: 13, opacity: 0.9 }}>{countdownDays === 1 ? 'Tag' : 'Tage'} noch</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Quick Stats ── */}
            {(() => {
              const stats: { icon: string; label: string; value: string; sub?: string; tab: TabKey; color: string }[] = []
              if (event.modules.guestInvite) {
                stats.push({ icon: '💌', label: 'Gäste', value: `${guestAccepted}/${guestTotal}`, sub: confirmedHeadcount > 0 ? `${confirmedHeadcount} Personen` : 'zugesagt', tab: 'guestInvite', color: '#667eea' })
              }
              if (event.modules.checklist && checkItems.length > 0) {
                stats.push({ icon: '✅', label: 'Checkliste', value: `${checkDone}/${checkItems.length}`, sub: 'erledigt', tab: 'checklist', color: '#10b981' })
              }
              if (event.modules.budget && budgetItems.length > 0) {
                stats.push({ icon: '💰', label: 'Budget', value: `${budgetCurrency}${budgetActual.toLocaleString('de-DE')}`, sub: budgetLimit > 0 ? `von ${budgetCurrency}${budgetLimit.toLocaleString('de-DE')}` : `geplant: ${budgetCurrency}${budgetEstimated.toLocaleString('de-DE')}`, tab: 'budget', color: budgetLimit > 0 && budgetActual > budgetLimit ? '#ef4444' : '#f59e0b' })
              }
              if (event.modules.timeline && timelineEntries > 0) {
                stats.push({ icon: '⏱️', label: 'Ablauf', value: `${timelineEntries}`, sub: timelineEntries === 1 ? 'Programmpunkt' : 'Programmpunkte', tab: 'timeline', color: '#8b5cf6' })
              }
              if (event.modules.menu && menuCourses > 0) {
                stats.push({ icon: '🍽️', label: 'Menü', value: `${menuCourses}`, sub: `${menuCourses === 1 ? 'Gang' : 'Gänge'} · ${menuChoices} Gerichte`, tab: 'menu', color: '#ec4899' })
              }
              if (stats.length === 0) return null
              return (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`, gap: 12 }}>
                  {stats.map(s => (
                    <button key={s.tab} onClick={() => setActiveTab(s.tab)}
                      style={{ background: 'white', borderRadius: 14, padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      {s.sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{s.sub}</div>}
                      {/* Progress bar for checklist */}
                      {s.tab === 'checklist' && checkItems.length > 0 && (
                        <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: '#10b981', width: `${(checkDone / checkItems.length) * 100}%`, transition: 'width 0.3s' }} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* ── Action Hints ── */}
            {hints.length > 0 && (
              <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>📌 Nächste Schritte</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {hints.map((h, i) => (
                    <button key={i} onClick={() => setActiveTab(h.tab)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: 'none', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
                      <span style={{ fontSize: 14 }}>{h.icon}</span>
                      <span style={{ fontSize: 13, color: h.color, fontWeight: 500, flex: 1 }}>{h.text}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Module verwalten (collapsible) ── */}
            <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <button onClick={() => setModuleEditing(!moduleEditing)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>🧩</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Module verwalten</span>
                  {(() => {
                    const active = PRIVATE_MODULE_OPTIONS.filter(m => !!event.modules[m.key])
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

              {!moduleEditing && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {PRIVATE_MODULE_OPTIONS.filter(m => !!event.modules[m.key]).map(m => {
                    const done = completedSet.has(m.key)
                    return (
                      <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        <button onClick={() => done ? toggleModuleCompleted(m.key) : setActiveTab(m.key as TabKey)}
                          style={{
                            padding: '6px 10px 6px 14px', borderRadius: '20px 0 0 20px',
                            border: '1px solid ' + (done ? '#bbf7d0' : '#e2e8f0'), borderRight: 'none',
                            background: done ? '#f0fdf4' : '#f8fafc', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600,
                            color: done ? '#16a34a' : '#475569',
                          }}
                        >{done ? '✅' : m.icon} {m.label}</button>
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
                      </div>
                    )
                  })}
                  {!PRIVATE_MODULE_OPTIONS.some(m => !!event.modules[m.key]) && (
                    <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Keine Module aktiviert. Klicke auf „Anpassen".</span>
                  )}
                </div>
              )}

              {moduleEditing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {PRIVATE_MODULE_OPTIONS.map(mod => {
                    const active = !!event.modules[mod.key]
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

            {/* ── Confirm deactivate module dialog ── */}
            {confirmDisable && (() => {
              const mod = PRIVATE_MODULE_OPTIONS.find(m => m.key === confirmDisable)
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
                      Das Modul wird ausgeblendet, aber deine Daten bleiben erhalten. Wenn du es später wieder aktivierst, ist alles noch da.
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

            {/* ── Meta-Info ── */}
            {(event.createdAt || event.lastModified) && (
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8', paddingLeft: 4 }}>
                {event.createdAt && <span>Erstellt: {event.createdAt}</span>}
                {event.lastModified && <span>Zuletzt geändert: {event.lastModified}</span>}
              </div>
            )}
          </div>
          )
        })()}

        {/* ═══ TAB: Raumplanung ═══ */}
        {activeTab === 'room' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '0 16px', height: 40, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {(event.roomData?.tables?.length ?? 0) > 0
                  ? `🪑 ${event.roomData!.tables.length} Tisch${event.roomData!.tables.length !== 1 ? 'e' : ''}`
                  : '🪑 Noch keine Tische – füge sie über die Seitenleiste hinzu'}
              </span>
              <div style={{ flex: 1 }} />
              <button onClick={openRoomPicker}
                style={{ padding: '4px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}
              >📂 Raum laden</button>
              {(event.roomData?.tables?.length ?? 0) > 0 && (
                <button onClick={openSaveTemplateModal}
                  style={{ padding: '4px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}
                >💾 Als Vorlage speichern</button>
              )}
              {(event.roomData?.tables?.length ?? 0) > 0 && (
                <button onClick={async () => { if (!confirm('Raumplanung wirklich entfernen?')) return; await handleRoomSave([], null) }}
                  style={{ padding: '4px 10px', background: '#fee2e2', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 500 }}
                >✕ Entfernen</button>
              )}
            </div>
            {roomTemplateToast && (
              <div style={{ margin: '12px 16px 0', padding: '10px 12px', background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                {roomTemplateToast}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <EventRoomEditor
                key={`room-${event.id}-${(event.roomData?.tables?.length ?? 0)}`}
                initialTables={event.roomData?.tables ?? []}
                initialViewFrame={event.roomData?.viewFrame ?? null}
                initialGridHeight={event.roomData?.gridHeight ?? 20}
                onSave={handleRoomSave}
              />
            </div>
          </div>
        )}

        {/* ═══ TAB: Tischplanung (Seating) ═══ */}
        {activeTab === 'seating' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Room clubEventProps={{
              tables: event.roomData?.tables ?? [],
              viewFrame: event.roomData?.viewFrame ?? null,
              gridHeight: event.roomData?.gridHeight ?? 20,
              gridWidth: event.roomData?.gridWidth ?? 28,
              initialGroups: seatingGroups,
              initialAssignedGroups: event.seatingData?.assignedGroups ?? {},
              onSave: handleSeatingSave,
              onOpenRoomEditor: () => setActiveTab('room'),
            }} />
          </div>
        )}

        {/* ═══ TAB: Menüplanung ═══ */}
        {activeTab === 'menu' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <EventMenuPlan
              key={`menu-${event.id}`}
              data={event.menuData ?? { courses: [] }}
              onSave={handleMenuSave}
            />
          </div>
        )}

        {/* ═══ TAB: Einladungen ═══ */}
        {activeTab === 'guestInvite' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <EventGuestInvite
              key={`invite-${event.id}`}
              data={event.guestInviteData ?? { shareToken: '', shareMode: 'open', invitations: [] }}
              eventName={event.name}
              eventDate={event.eventDate}
              eventFrom={event.from}
              eventTo={event.to}
              menuData={event.menuData}
              timelineData={event.timelineData}
              onSave={handleGuestInviteSave}
            />
          </div>
        )}

        {/* ═══ TAB: Gäste-Info ═══ */}
        {activeTab === 'dashboard' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <EventGuestDashboard
              key={`dashboard-${event.id}`}
              config={event.dashboardConfig ?? { showTimeline: false, showMenu: false, showSeating: false, showLocation: true }}
              eventName={event.name}
              eventDate={event.eventDate}
              eventFrom={event.from}
              eventTo={event.to}
              menuData={event.menuData}
              timelineData={event.timelineData}
              seatingData={event.seatingData}
              roomData={event.roomData}
              onSave={handleDashboardSave}
            />
          </div>
        )}

        {/* ═══ TAB: Checkliste ═══ */}
        {activeTab === 'checklist' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <EventChecklist
              key={`checklist-${event.id}`}
              data={event.checklistData ?? { items: [] }}
              onSave={handleChecklistSave}
            />
          </div>
        )}

        {/* ═══ TAB: Budget ═══ */}
        {activeTab === 'budget' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <EventBudget
              key={`budget-${event.id}`}
              data={event.budgetData ?? { items: [], currency: 'EUR' }}
              onSave={handleBudgetSave}
            />
          </div>
        )}

        {/* ═══ TAB: Ablaufplan ═══ */}
        {activeTab === 'timeline' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <EventTimeline
              key={`timeline-${event.id}`}
              data={event.timelineData ?? { entries: [] }}
              eventDate={event.eventDate}
              timeFrom={event.from}
              timeTo={event.to}
              onSave={handleTimelineSave}
            />
          </div>
        )}
      </div>

      {/* ═══ Room Picker Modal ═══ */}
      {showRoomPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 0, width: 560, maxWidth: '92vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>📂 Raum laden</h3>
              <button onClick={() => setShowRoomPicker(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
              {savedRooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
                  <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
                    Keine persönlichen Raum-Vorlagen gefunden.<br />
                    Starte direkt mit einer leeren Raumplanung in diesem Event.
                  </p>
                  <button onClick={() => { void startEmptyRoomPlanning() }}
                    style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >➕ Leere Raumplanung starten</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedRooms.map(room => (
                    <div key={room.id} style={{ display: 'flex', alignItems: 'stretch', gap: 12, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        {renderRoomPreview(room)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {templateEditId === room.id ? (
                          <>
                            <input
                              type="text"
                              value={templateEditName}
                              onChange={e => {
                                setTemplateEditName(e.target.value)
                                setTemplateEditError(null)
                              }}
                              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '2px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600, outline: 'none' }}
                              autoFocus
                            />
                            {templateEditError && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>{templateEditError}</div>}
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <button onClick={() => submitRenameTemplate(room.id)} style={{ padding: '6px 10px', background: '#0f766e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Speichern</button>
                              <button onClick={cancelRenameTemplate} style={{ padding: '6px 10px', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Abbrechen</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              {room.data.tables?.length ?? 0} Tische
                              {room.createdAt && ` · ${room.createdAt}`}
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => applyRoom(room)}
                          style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >Übernehmen</button>
                        {templateEditId !== room.id && (
                          <>
                            <button onClick={() => startRenameTemplate(room)} style={{ padding: '6px 10px', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Umbenennen</button>
                            <button onClick={() => deleteTemplate(room.id)} style={{ padding: '6px 10px', background: 'white', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Löschen</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSaveTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 420, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>💾 Raum als Vorlage speichern</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              Diese Vorlage steht danach in privaten Events und als persönliche Quelle für Vereinsräume zur Verfügung.
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Vorlagenname</label>
            <input
              type="text"
              value={templateName}
              onChange={e => {
                setTemplateName(e.target.value)
                setTemplateConflict(null)
                setTemplateError(null)
              }}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none' }}
              autoFocus
            />
            {templateError && <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626' }}>{templateError}</div>}
            {templateConflict && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}>
                Eine Vorlage mit diesem Namen existiert bereits.
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => writeRoomTemplate(templateConflict.name, 'overwrite')} style={{ padding: '8px 12px', background: '#f97316', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Vorlage überschreiben</button>
                  <button onClick={() => writeRoomTemplate(templateConflict.name, 'duplicate')} style={{ padding: '8px 12px', background: 'white', color: '#9a3412', border: '1px solid #fdba74', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Als Duplikat speichern</button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={() => { setShowSaveTemplateModal(false); setTemplateError(null); setTemplateConflict(null) }} style={{ padding: '10px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569', fontWeight: 600 }}>Abbrechen</button>
              <button onClick={() => { void saveRoomAsTemplate() }} style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
