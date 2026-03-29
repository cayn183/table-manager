// ============================================================================
// RoomEditorMobile: Simplified room editor for mobile devices
// Touch: pinch-to-zoom, one-finger-pan, long-press context menu, drag-after-long-press
// ============================================================================
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import userStorage from '../../utils/userStorage'
import logger from '../../utils/logger'
import { syncUserData, hydrateUserData } from '../../utils/sync'
import type { Table } from '../../types/room'
import { useSetPageHeader } from '../layout/PageHeaderContext'
import BottomSheet from '../layout/BottomSheet'

type ViewFrame = { x: number; y: number; width: number; height: number }

const GRID_W = 28
const GRID_H = 20
const MIN_CELL = 18 // Minimum cell pixel size for mobile

export default function RoomEditorMobile() {
  const [tables, setTables] = useState<Table[]>([])
  const [nextId, setNextId] = useState(1)
  const [capacityInput, setCapacityInput] = useState(4)
  const [roomName, setRoomName] = useState('Neuer Raum')
  const [viewFrame, setViewFrame] = useState<ViewFrame | null>(null)
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  const [saveRoomName, setSaveRoomName] = useState('Neuer Raum')
  const [isEditingExisting, setIsEditingExisting] = useState(false)
  const [existingRoomId, setExistingRoomId] = useState<string | null>(null)
  const [existingCreatedAt, setExistingCreatedAt] = useState<string | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<Table[][]>([])
  const [isSaving, setIsSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const { roomId } = useParams<{ roomId: string }>()
  const { user, token } = useAuth()
  const [roomLoading, setRoomLoading] = useState(!!roomId && roomId !== 'new')
  const [roomNotFound, setRoomNotFound] = useState(false)
  const userId = user ? user.id : null
  const pendingEventId: string | null = (location.state as any)?.pendingEventId || null
  const returnToEventId: string | null = (location.state as any)?.returnToEventId || null
  const returnToClubEvent: { clubId: string; eventId: string } | null = (location.state as any)?.returnToClubEvent || null

  const { setHeaderContent } = useSetPageHeader('Raum-Editor', '🏗️')

  // Load existing room data
  useEffect(() => {
    let mounted = true
    ;(async () => {
      // Deep-link support: load room by URL param ID
      if (roomId && roomId !== 'new') {
        if (userId) await hydrateUserData(token, userId)
        if (!mounted) return
        const roomsRaw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms') || '[]'
        try {
          const list = JSON.parse(roomsRaw as string) as any[]
          const found = list.find((e: any) => e.id === roomId)
          if (found?.data?.tables?.length) {
            setTables(found.data.tables)
            const maxId = Math.max(...found.data.tables.map((t: Table) => parseInt(t.id.slice(1), 10) || 0))
            setNextId(maxId + 1)
            setIsEditingExisting(true)
            setRoomName(found.name)
            setSaveRoomName(found.name)
            setExistingRoomId(found.id)
            setExistingCreatedAt(found.createdAt || null)
            if (found.data.viewFrame) setViewFrame(found.data.viewFrame)
            setRoomLoading(false)
            return
          }
        } catch (e) {
          logger.error('RoomEditorMobile', { action: 'findRoomById', err: e })
        }
        setRoomNotFound(true)
        setRoomLoading(false)
        return
      }

      // Fallback: load from currentRoom localStorage (normal new-room or legacy flow)
      const raw = userStorage.getItem('currentRoom', userId) || localStorage.getItem('currentRoom')
      if (raw) {
        try {
          const room = JSON.parse(raw as string)
          if (room.tables?.length) {
            setTables(room.tables)
            const maxId = Math.max(...room.tables.map((t: Table) => parseInt(t.id.slice(1), 10) || 0))
            setNextId(maxId + 1)
            if (room.viewFrame) setViewFrame(room.viewFrame)

            const roomsRaw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms')
            if (roomsRaw) {
              const list = JSON.parse(roomsRaw as string)
              for (const entry of list) {
                if (entry?.data?.tables && JSON.stringify(entry.data.tables) === JSON.stringify(room.tables)) {
                  setIsEditingExisting(true)
                  setRoomName(entry.name)
                  setSaveRoomName(entry.name)
                  setExistingRoomId(entry.id)
                  setExistingCreatedAt(entry.createdAt || null)
                  break
                }
              }
            }
          }
        } catch (e) { logger.error('RoomEditorMobile', { action: 'loadRoom', err: e }) }
      }
      setRoomLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  // Undo
  function pushUndo(current: Table[]) {
    setUndoStack(prev => [...prev, current].slice(-5))
  }
  function performUndo() {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const stack = [...prev]
      const restored = stack.pop()!
      setTables(restored)
      return stack
    })
  }

  // Add table
  const addTable = useCallback(() => {
    const capacity = capacityInput
    const width = Math.ceil(capacity / 2)
    const height = 2

    // Find a free spot
    let x = 0, y = 0
    let placed = false
    outer: for (let ty = 0; ty < GRID_H - height; ty++) {
      for (let tx = 0; tx < GRID_W - width; tx++) {
        const overlaps = tables.some(t =>
          !(tx + width <= t.x || tx >= t.x + t.width || ty + height <= t.y || ty >= t.y + t.height)
        )
        if (!overlaps) { x = tx; y = ty; placed = true; break outer }
      }
    }
    if (!placed) { x = 0; y = 0 }

    pushUndo(tables)
    const newTable: Table = { id: `T${nextId}`, x, y, capacity, width, height, locked: false }
    setTables(prev => [...prev, newTable])
    setNextId(prev => prev + 1)
    setSelectedTableId(newTable.id)
  }, [capacityInput, tables, nextId])

  // Delete selected table
  const deleteSelected = useCallback(() => {
    if (!selectedTableId) return
    pushUndo(tables)
    setTables(prev => prev.filter(t => t.id !== selectedTableId))
    setSelectedTableId(null)
  }, [selectedTableId, tables])

  // Rotate selected table (double-tap)
  const rotateSelected = useCallback(() => {
    if (!selectedTableId) return
    pushUndo(tables)
    setTables(prev => prev.map(t => {
      if (t.id !== selectedTableId) return t
      return { ...t, width: t.height, height: t.width, rotation: ((t.rotation ?? 0) + 1) % 4 }
    }))
  }, [selectedTableId, tables])

  // Save room
  async function handleSave() {
    const name = saveRoomName.trim() || `Raum ${Date.now()}`
    const room = { tables, viewFrame: viewFrame || undefined }
    userStorage.setItem('currentRoom', JSON.stringify(room), userId)
    const raw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms') || '[]'
    const list = JSON.parse(raw as string)

    let entry: any
    if (existingRoomId) {
      entry = { id: existingRoomId, name, createdAt: existingCreatedAt || new Date().toLocaleDateString(), data: room }
      const updated = list.map((e: any) => e.id === existingRoomId ? entry : e)
      if (!list.find((e: any) => e.id === existingRoomId)) updated.push(entry)
      userStorage.setItem('rooms', JSON.stringify(updated), userId)
    } else {
      entry = { id: `r-${Date.now()}`, name, createdAt: new Date().toLocaleDateString(), data: room }
      userStorage.setItem('rooms', JSON.stringify([...list, entry]), userId)
    }

    // Link to event if applicable
    const targetEventId = pendingEventId || returnToEventId
    if (targetEventId) {
      try {
        const rawEvent = userStorage.getItem('currentEvent', userId) || localStorage.getItem('currentEvent')
        if (rawEvent) {
          const event = JSON.parse(rawEvent as string)
          if (event?.id === targetEventId) {
            event.roomId = entry.id
            userStorage.setItem('currentEvent', JSON.stringify(event), userId)
            const rawEvents = userStorage.getItem('events', userId) || localStorage.getItem('events') || '[]'
            const events = JSON.parse(rawEvents as string)
            userStorage.setItem('events', JSON.stringify(events.map((e: any) => e.id === targetEventId ? { ...e, roomId: entry.id } : e)), userId)
          }
        }
      } catch (e) { logger.error('RoomEditorMobile', { action: 'linkEvent', err: e }) }
    }

    setIsSaving(true)
    setShowSaveSheet(false)

    if (pendingEventId) navigate(`/app/events/${pendingEventId}`)
    else if (returnToEventId) navigate(`/app/events/${returnToEventId}`)
    else if (returnToClubEvent) navigate(`/app/club/${returnToClubEvent.clubId}/events/${returnToClubEvent.eventId}`, { state: { applyFromPersonalRoom: { roomId: entry.id } } })
    else navigate('/app/rooms')

    try { if (userId) await syncUserData(token, userId) } catch {}
    setIsSaving(false)
  }

  // Compute grid cell size to fit container
  const [cellSize, setCellSize] = useState(MIN_CELL)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width
        const cs = Math.max(MIN_CELL, Math.floor(w / GRID_W))
        setCellSize(cs)
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ── Zoom & Pan state ──────────────────────────────────────────────
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  // ── Touch tracking refs ───────────────────────────────────────────
  const touchStateRef = useRef<{
    mode: 'idle' | 'pending' | 'pan' | 'pinch' | 'drag'
    startX: number
    startY: number
    startPanX: number
    startPanY: number
    startZoom: number
    startDist: number
    longPressTimer: ReturnType<typeof setTimeout> | null
    dragTableId: string | null
    dragStartGridX: number
    dragStartGridY: number
    dragTableOrigX: number
    dragTableOrigY: number
    moved: boolean
  }>({
    mode: 'idle', startX: 0, startY: 0, startPanX: 0, startPanY: 0,
    startZoom: 1, startDist: 0, longPressTimer: null,
    dragTableId: null, dragStartGridX: 0, dragStartGridY: 0,
    dragTableOrigX: 0, dragTableOrigY: 0, moved: false,
  })

  // ── Long-press context menu state ─────────────────────────────────
  const [contextMenuTableId, setContextMenuTableId] = useState<string | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)

  // ── Rename state ──────────────────────────────────────────────────
  const [renameTableId, setRenameTableId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ── Drag indicator ────────────────────────────────────────────────
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null)

  function pinchDistance(e: React.TouchEvent): number {
    const t0 = e.touches[0], t1 = e.touches[1]
    return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
  }

  function clientToGrid(clientX: number, clientY: number): { gx: number; gy: number } {
    const el = containerRef.current
    if (!el) return { gx: 0, gy: 0 }
    const rect = el.getBoundingClientRect()
    const x = (clientX - rect.left - panX) / (cellSize * zoom)
    const y = (clientY - rect.top - panY) / (cellSize * zoom)
    return { gx: Math.floor(x), gy: Math.floor(y) }
  }

  function tableAtPoint(clientX: number, clientY: number): Table | null {
    const { gx, gy } = clientToGrid(clientX, clientY)
    return tables.find(t => gx >= t.x && gx < t.x + t.width && gy >= t.y && gy < t.y + t.height) ?? null
  }

  function clearLongPress() {
    const ts = touchStateRef.current
    if (ts.longPressTimer) { clearTimeout(ts.longPressTimer); ts.longPressTimer = null }
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current

    if (e.touches.length === 2) {
      // ── Pinch start ──
      clearLongPress()
      ts.mode = 'pinch'
      ts.startDist = pinchDistance(e)
      ts.startZoom = zoom
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2
      ts.startX = mx
      ts.startY = my
      ts.startPanX = panX
      ts.startPanY = panY
      return
    }

    if (e.touches.length === 1) {
      const t = e.touches[0]
      ts.startX = t.clientX
      ts.startY = t.clientY
      ts.startPanX = panX
      ts.startPanY = panY
      ts.moved = false

      const hitTable = tableAtPoint(t.clientX, t.clientY)

      if (hitTable) {
        // Start long-press timer for table interaction
        ts.mode = 'pending'
        ts.dragTableId = hitTable.id
        ts.dragTableOrigX = hitTable.x
        ts.dragTableOrigY = hitTable.y
        const { gx, gy } = clientToGrid(t.clientX, t.clientY)
        ts.dragStartGridX = gx
        ts.dragStartGridY = gy

        ts.longPressTimer = setTimeout(() => {
          ts.longPressTimer = null
          // If finger hasn't moved much, activate long-press
          if (!ts.moved) {
            // Vibrate feedback if available
            if (navigator.vibrate) navigator.vibrate(30)
            ts.mode = 'drag'
            setDraggingTableId(hitTable.id)
            setSelectedTableId(hitTable.id)
          }
        }, 500)
      } else {
        // Empty area → pan mode
        ts.mode = 'pan'
      }
    }
  }, [zoom, panX, panY, tables, cellSize])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current

    if (ts.mode === 'pinch' && e.touches.length >= 2) {
      e.preventDefault()
      const newDist = pinchDistance(e)
      const rawZoom = ts.startZoom * (newDist / ts.startDist)
      const newZoom = Math.min(3, Math.max(0.5, rawZoom))

      // Pan to keep pinch center stable
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const dx = mx - ts.startX
      const dy = my - ts.startY

      setZoom(newZoom)
      setPanX(ts.startPanX + dx)
      setPanY(ts.startPanY + dy)
      return
    }

    if (e.touches.length !== 1) return
    const t = e.touches[0]
    const dx = t.clientX - ts.startX
    const dy = t.clientY - ts.startY

    // Detect significant movement to cancel long-press
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      ts.moved = true
    }

    if (ts.mode === 'pending' && ts.moved) {
      // Finger moved before long-press fired → convert to pan
      clearLongPress()
      ts.mode = 'pan'
      ts.dragTableId = null
    }

    if (ts.mode === 'pan') {
      e.preventDefault()
      setPanX(ts.startPanX + dx)
      setPanY(ts.startPanY + dy)
      return
    }

    if (ts.mode === 'drag' && ts.dragTableId) {
      e.preventDefault()
      const { gx, gy } = clientToGrid(t.clientX, t.clientY)
      const deltaGX = gx - ts.dragStartGridX
      const deltaGY = gy - ts.dragStartGridY
      const newX = Math.max(0, Math.min(GRID_W - 1, ts.dragTableOrigX + deltaGX))
      const newY = Math.max(0, Math.min(GRID_H - 1, ts.dragTableOrigY + deltaGY))

      setTables(prev => prev.map(tbl =>
        tbl.id === ts.dragTableId
          ? { ...tbl, x: newX, y: newY }
          : tbl
      ))
    }
  }, [cellSize, zoom, panX, panY])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current

    // If pinch was active and one finger lifted, go idle
    if (ts.mode === 'pinch') {
      ts.mode = 'idle'
      return
    }

    if (ts.mode === 'drag' && ts.dragTableId) {
      // End drag — save undo point
      pushUndo(tables.map(t => t.id === ts.dragTableId
        ? { ...t, x: ts.dragTableOrigX, y: ts.dragTableOrigY }
        : t
      ))
      setDraggingTableId(null)
      ts.mode = 'idle'
      ts.dragTableId = null
      return
    }

    if (ts.mode === 'pending' && !ts.moved && ts.dragTableId) {
      // Short tap on table → select/deselect
      clearLongPress()
      setSelectedTableId(prev => prev === ts.dragTableId ? null : ts.dragTableId)
    }

    if (ts.mode === 'pan' || ts.mode === 'pending') {
      clearLongPress()
    }

    ts.mode = 'idle'
    ts.dragTableId = null
  }, [tables])

  // Open context menu for a table (called on long-press without drag movement)
  useEffect(() => {
    // When dragging state activates, after a slight pause open context menu
    // unless finger moves (which would be a drag). We handle this by detecting
    // when draggingTableId changes but no movement occurs.
  }, [draggingTableId])

  // Context menu opener fires on long-press if finger hasn't moved
  const openContextMenu = useCallback((tableId: string) => {
    setContextMenuTableId(tableId)
    setShowContextMenu(true)
    setSelectedTableId(tableId)
    setDraggingTableId(null)
    touchStateRef.current.mode = 'idle'
  }, [])

  // Override the long-press handler to differentiate context menu vs drag:
  // If the finger is still stationary after long-press fires → context menu
  // If the finger then moves → drag mode (already handled)
  // We do this by making the long-press timer open context menu,
  // and then if the user starts moving, we close context menu and switch to drag.
  // Actually, simpler: long-press = open context menu. Drag is only after closing menu.
  // Let me adjust the touch start to use context menu on long-press instead.

  // Re-implementing: on long-press → open context menu (not immediate drag)
  // Drag is initiated from a "Verschieben" button in the context menu
  const handleTouchStartFinal = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current

    if (e.touches.length === 2) {
      clearLongPress()
      ts.mode = 'pinch'
      ts.startDist = pinchDistance(e)
      ts.startZoom = zoom
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2
      ts.startX = mx
      ts.startY = my
      ts.startPanX = panX
      ts.startPanY = panY
      return
    }

    if (e.touches.length === 1) {
      const t = e.touches[0]
      ts.startX = t.clientX
      ts.startY = t.clientY
      ts.startPanX = panX
      ts.startPanY = panY
      ts.moved = false

      const hitTable = tableAtPoint(t.clientX, t.clientY)

      if (hitTable) {
        ts.mode = 'pending'
        ts.dragTableId = hitTable.id

        ts.longPressTimer = setTimeout(() => {
          ts.longPressTimer = null
          if (!ts.moved) {
            if (navigator.vibrate) navigator.vibrate(30)
            openContextMenu(hitTable.id)
          }
        }, 500)
      } else {
        ts.mode = 'pan'
      }
    }
  }, [zoom, panX, panY, tables, cellSize, openContextMenu])

  const handleTouchMoveFinal = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current

    if (ts.mode === 'pinch' && e.touches.length >= 2) {
      e.preventDefault()
      const newDist = pinchDistance(e)
      const rawZoom = ts.startZoom * (newDist / ts.startDist)
      const newZoom = Math.min(3, Math.max(0.5, rawZoom))
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const dx = mx - ts.startX
      const dy = my - ts.startY
      setZoom(newZoom)
      setPanX(ts.startPanX + dx)
      setPanY(ts.startPanY + dy)
      return
    }

    if (e.touches.length !== 1) return
    const t = e.touches[0]
    const dx = t.clientX - ts.startX
    const dy = t.clientY - ts.startY

    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) ts.moved = true

    if (ts.mode === 'pending' && ts.moved) {
      clearLongPress()
      ts.mode = 'pan'
      ts.dragTableId = null
    }

    if (ts.mode === 'pan') {
      e.preventDefault()
      setPanX(ts.startPanX + dx)
      setPanY(ts.startPanY + dy)
      return
    }

    if (ts.mode === 'drag' && ts.dragTableId) {
      e.preventDefault()
      const { gx, gy } = clientToGrid(t.clientX, t.clientY)
      const deltaGX = gx - ts.dragStartGridX
      const deltaGY = gy - ts.dragStartGridY
      const newX = Math.max(0, Math.min(GRID_W - 1, ts.dragTableOrigX + deltaGX))
      const newY = Math.max(0, Math.min(GRID_H - 1, ts.dragTableOrigY + deltaGY))
      setTables(prev => prev.map(tbl =>
        tbl.id === ts.dragTableId ? { ...tbl, x: newX, y: newY } : tbl
      ))
    }
  }, [cellSize, zoom, panX, panY])

  const handleTouchEndFinal = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current

    if (ts.mode === 'pinch') { ts.mode = 'idle'; return }

    if (ts.mode === 'drag' && ts.dragTableId) {
      pushUndo(tables.map(t => t.id === ts.dragTableId
        ? { ...t, x: ts.dragTableOrigX, y: ts.dragTableOrigY } : t
      ))
      setDraggingTableId(null)
      ts.mode = 'idle'
      ts.dragTableId = null
      return
    }

    if (ts.mode === 'pending' && !ts.moved && ts.dragTableId) {
      clearLongPress()
      setSelectedTableId(prev => prev === ts.dragTableId ? null : ts.dragTableId)
    }

    clearLongPress()
    ts.mode = 'idle'
    ts.dragTableId = null
  }, [tables])

  // Start drag mode from context menu "Verschieben" button
  const startDragFromMenu = useCallback((tableId: string) => {
    setShowContextMenu(false)
    setContextMenuTableId(null)
    const tbl = tables.find(t => t.id === tableId)
    if (!tbl) return

    const ts = touchStateRef.current
    ts.mode = 'drag'
    ts.dragTableId = tableId
    ts.dragTableOrigX = tbl.x
    ts.dragTableOrigY = tbl.y
    ts.dragStartGridX = tbl.x
    ts.dragStartGridY = tbl.y
    setDraggingTableId(tableId)
    setSelectedTableId(tableId)
  }, [tables])

  // Context menu actions
  const contextRotate = useCallback(() => {
    if (!contextMenuTableId) return
    pushUndo(tables)
    setTables(prev => prev.map(t => {
      if (t.id !== contextMenuTableId) return t
      return { ...t, width: t.height, height: t.width, rotation: ((t.rotation ?? 0) + 1) % 4 }
    }))
    setShowContextMenu(false)
    setContextMenuTableId(null)
  }, [contextMenuTableId, tables])

  const contextDelete = useCallback(() => {
    if (!contextMenuTableId) return
    pushUndo(tables)
    setTables(prev => prev.filter(t => t.id !== contextMenuTableId))
    setSelectedTableId(null)
    setShowContextMenu(false)
    setContextMenuTableId(null)
  }, [contextMenuTableId, tables])

  const contextRename = useCallback(() => {
    if (!contextMenuTableId) return
    const tbl = tables.find(t => t.id === contextMenuTableId)
    if (!tbl) return
    setRenameTableId(contextMenuTableId)
    setRenameValue(tbl.id)
    setShowContextMenu(false)
    setContextMenuTableId(null)
  }, [contextMenuTableId, tables])

  const handleRenameConfirm = useCallback(() => {
    if (!renameTableId || !renameValue.trim()) return
    pushUndo(tables)
    setTables(prev => prev.map(t =>
      t.id === renameTableId ? { ...t, id: renameValue.trim() } : t
    ))
    if (selectedTableId === renameTableId) setSelectedTableId(renameValue.trim())
    setRenameTableId(null)
    setRenameValue('')
  }, [renameTableId, renameValue, tables, selectedTableId])

  // Reset zoom
  const resetZoom = useCallback(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }, [])

  const selectedTable = tables.find(t => t.id === selectedTableId)

  if (roomLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Laden…</div>
  if (roomNotFound) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <p style={{ fontSize: 48, margin: '0 0 16px' }}>🔍</p>
      <p style={{ fontSize: 18, color: '#991b1b', margin: '0 0 16px' }}>Raum nicht gefunden.</p>
      <button onClick={() => navigate('/app/rooms')} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Zurück zur Raumübersicht</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc' }}>
      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.9)', padding: '2px 8px', borderRadius: 6 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={resetZoom} style={{ ...toolBtn, padding: '4px 8px', fontSize: 11 }}>1:1</button>
        </div>
      )}

      {/* Drag mode indicator */}
      {draggingTableId && (
        <div style={{
          position: 'absolute', top: 8, left: 12, right: 80, zIndex: 20,
          background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8,
          padding: '6px 12px', fontSize: 12, color: '#4338ca', fontWeight: 600,
          textAlign: 'center',
        }}>
          Tisch verschieben — Finger bewegen, dann loslassen
        </div>
      )}

      {/* Grid area */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStartFinal}
        onTouchMove={handleTouchMoveFinal}
        onTouchEnd={handleTouchEndFinal}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          padding: 8,
          touchAction: 'none',
        }}
      >
        <div style={{
          position: 'relative',
          width: GRID_W * cellSize,
          height: GRID_H * cellSize,
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          backgroundImage: `
            linear-gradient(to right, #f1f5f9 1px, transparent 1px),
            linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)
          `,
          backgroundSize: `${cellSize}px ${cellSize}px`,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}>
          {/* View frame indicator */}
          {viewFrame && (
            <div style={{
              position: 'absolute',
              left: viewFrame.x * cellSize,
              top: viewFrame.y * cellSize,
              width: viewFrame.width * cellSize,
              height: viewFrame.height * cellSize,
              border: '2px dashed #667eea',
              borderRadius: 4,
              pointerEvents: 'none',
              opacity: 0.5,
            }} />
          )}

          {/* Tables */}
          {tables.map(table => {
            const isSelected = table.id === selectedTableId
            const isDragging = table.id === draggingTableId
            return (
              <div
                key={table.id}
                style={{
                  position: 'absolute',
                  left: table.x * cellSize,
                  top: table.y * cellSize,
                  width: table.width * cellSize,
                  height: table.height * cellSize,
                  background: isDragging
                    ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)'
                    : isSelected
                      ? 'linear-gradient(135deg, #eef2ff, #e0e7ff)'
                      : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                  border: isDragging
                    ? '2px solid #3b82f6'
                    : isSelected ? '2px solid #667eea' : '2px solid #cbd5e1',
                  borderRadius: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  boxShadow: isDragging
                    ? '0 4px 12px rgba(59,130,246,0.3)'
                    : isSelected ? '0 0 0 2px rgba(102,126,234,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: isDragging ? 'none' : 'border-color 0.15s, box-shadow 0.15s',
                  zIndex: isDragging ? 20 : isSelected ? 10 : 1,
                  opacity: isDragging ? 0.9 : 1,
                }}
              >
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{table.id}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{table.capacity}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected table info */}
      {selectedTable && !draggingTableId && (
        <div style={{
          padding: '8px 12px',
          background: '#eef2ff',
          borderTop: '1px solid #c7d2fe',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700 }}>🪑 {selectedTable.id}</span>
          <span>{selectedTable.capacity} Plätze</span>
          <div style={{ flex: 1 }} />
          <button onClick={rotateSelected} style={toolBtn}>🔄 Drehen</button>
          <button onClick={deleteSelected} style={{ ...toolBtn, color: '#dc2626', borderColor: '#fca5a5' }}>🗑️</button>
        </div>
      )}

      {/* Bottom controls */}
      <div style={{
        padding: '10px 12px',
        background: '#fff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flexShrink: 0,
      }}>
        {/* Capacity stepper + Add */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Plätze:</span>
          <button onClick={() => setCapacityInput(Math.max(1, capacityInput - 1))} style={stepperBtn}>−</button>
          <span style={{ fontSize: 18, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>{capacityInput}</span>
          <button onClick={() => setCapacityInput(capacityInput + 1)} style={stepperBtn}>+</button>
          <div style={{ flex: 1 }} />
          <button
            onClick={addTable}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            + Tisch
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {undoStack.length > 0 && (
            <button onClick={performUndo} style={{ ...toolBtn, flex: 0 }}>
              ↩ ({undoStack.length})
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { setSaveRoomName(roomName); setShowSaveSheet(true) }}
            disabled={tables.length === 0}
            style={{
              padding: '10px 24px',
              background: tables.length > 0 ? '#22c55e' : '#e2e8f0',
              color: tables.length > 0 ? '#fff' : '#94a3b8',
              border: 'none', borderRadius: 10,
              fontWeight: 600, fontSize: 14,
              cursor: tables.length > 0 ? 'pointer' : 'default',
            }}
          >
            💾 Speichern
          </button>
        </div>
      </div>

      {/* Save Sheet */}
      <BottomSheet open={showSaveSheet} onClose={() => setShowSaveSheet(false)} title="Raum speichern">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' }}>Raumname</label>
            <input
              value={saveRoomName}
              onChange={e => setSaveRoomName(e.target.value)}
              placeholder="z. B. Saal A"
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }}
              autoFocus
            />
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {tables.length} Tisch{tables.length !== 1 ? 'e' : ''} · {tables.reduce((s, t) => s + t.capacity, 0)} Plätze
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '14px 0',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: 16, cursor: 'pointer',
            }}
          >
            {isSaving ? 'Speichern...' : '💾 Speichern'}
          </button>
        </div>
      </BottomSheet>

      {/* Long-press context menu */}
      <BottomSheet open={showContextMenu} onClose={() => { setShowContextMenu(false); setContextMenuTableId(null) }} title={`Tisch ${contextMenuTableId ?? ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={contextRotate} style={contextBtn}>🔄 Drehen</button>
          <button onClick={() => contextMenuTableId && startDragFromMenu(contextMenuTableId)} style={contextBtn}>↕️ Verschieben</button>
          <button onClick={contextRename} style={contextBtn}>✏️ Umbenennen</button>
          <button onClick={contextDelete} style={{ ...contextBtn, color: '#dc2626', borderColor: '#fca5a5' }}>🗑️ Löschen</button>
        </div>
      </BottomSheet>

      {/* Rename dialog */}
      <BottomSheet open={!!renameTableId} onClose={() => { setRenameTableId(null); setRenameValue('') }} title="Tisch umbenennen">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            placeholder="z. B. T1, Tisch links"
            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }}
            autoFocus
          />
          <button
            onClick={handleRenameConfirm}
            disabled={!renameValue.trim()}
            style={{
              padding: '14px 0',
              background: renameValue.trim() ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0',
              color: renameValue.trim() ? '#fff' : '#94a3b8',
              border: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: 16, cursor: renameValue.trim() ? 'pointer' : 'default',
            }}
          >
            Umbenennen
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

// --- Shared styles ---
const toolBtn: React.CSSProperties = { padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const stepperBtn: React.CSSProperties = { width: 40, height: 40, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const contextBtn: React.CSSProperties = { padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }
