import React, { useEffect, useState, useCallback, useMemo } from 'react'
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
import ClubRoomEditor from '../club/ClubRoomEditor'
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
  const [moduleEditing, setModuleEditing] = useState(false)

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
  const handleRoomSave = useCallback(async (tables: Table[], viewFrame: ViewFrame | null) => {
    if (!event) return
    await persistEvent({ ...event, roomData: { tables, viewFrame } })
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
    newModules[key] = newVal
    // Seating requires room
    if (key === 'seating' && newVal) newModules.room = true
    // Disabling room also disables seating
    if (key === 'room' && !newVal) newModules.seating = false

    const updated: PrivateEventItem = { ...event, modules: newModules }
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
  }

  const visibleTabs = ALL_TABS.filter(t => !t.moduleKey || event?.modules?.[t.moduleKey])

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

      {/* ── Tab bar ── */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 0, padding: '0 16px', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/app/events')}
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
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                    {PRIVATE_MODULE_OPTIONS.filter(m => !!event.modules[m.key]).length}/{PRIVATE_MODULE_OPTIONS.length} aktiv
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#64748b' }}>{moduleEditing ? '▲ Einklappen' : '▼ Anpassen'}</span>
              </button>

              {!moduleEditing && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {PRIVATE_MODULE_OPTIONS.filter(m => !!event.modules[m.key]).map(m => (
                    <button key={m.key} onClick={() => setActiveTab(m.key as TabKey)}
                      style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}
                    >{m.icon} {m.label}</button>
                  ))}
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
                <button onClick={async () => { if (!confirm('Raumplanung wirklich entfernen?')) return; await handleRoomSave([], null) }}
                  style={{ padding: '4px 10px', background: '#fee2e2', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 500 }}
                >✕ Entfernen</button>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ClubRoomEditor
                key={`room-${event.id}-${(event.roomData?.tables?.length ?? 0)}`}
                initialTables={event.roomData?.tables ?? []}
                initialViewFrame={event.roomData?.viewFrame ?? null}
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
                    Keine gespeicherten Räume gefunden.<br />
                    Erstelle zuerst einen Raum.
                  </p>
                  <button onClick={() => { setShowRoomPicker(false); navigate('/app/rooms/new', { state: { returnToEvent: eventId } }) }}
                    style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >➕ Raum-Editor öffnen</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedRooms.map(room => (
                    <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{room.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {room.data.tables?.length ?? 0} Tische
                          {room.createdAt && ` · ${room.createdAt}`}
                        </div>
                      </div>
                      <button onClick={() => applyRoom(room)}
                        style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >Übernehmen</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
