import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../auth/AuthContext'
import userStorage from '../../utils/userStorage'
import logger from '../../utils/logger'
import { syncUserData, hydrateUserData } from '../../utils/sync'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import type { Table } from '../../types/room'
import { usePageHeader } from '../layout/PageHeaderContext'

type ViewFrame = { x: number; y: number; width: number; height: number }

export default function RoomEditor() {
  const [tables, setTables] = useState<Table[]>([])
  const [nextId, setNextId] = useState(1)
  const [capacityInput, setCapacityInput] = useState('4')
  const [roomName, setRoomName] = useState('Neuer Raum')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveRoomName, setSaveRoomName] = useState('Neuer Raum')
  const [isEditingExisting, setIsEditingExisting] = useState(false)
  const { setPageTitle, setHeaderContent } = usePageHeader()
  const [viewFrame, setViewFrame] = useState<ViewFrame | null>(null)
  const [frameDragStart, setFrameDragStart] = useState<{ x: number; y: number } | null>(null)
  const [defineViewMode, setDefineViewMode] = useState(false)
  const [showHelp, setShowHelp] = useState(true)
  const [draggingTable, setDraggingTable] = useState<Table | null>(null)
  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null)
  // Original-Zustand des aufgenommenen Tisches (für ESC-Abbruch)
  const origTableStateRef = useRef<Table | null>(null)
  // Undo-Stack für Tisch-Mutationen (max 5)
  const [undoStack, setUndoStack] = useState<Table[][]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId: string } | null>(null)
  const [sizeModal, setSizeModal] = useState<{ tableId: string; capacity: string } | null>(null)
  const [renameModal, setRenameModal] = useState<{ tableId: string; newId: string; error?: string; warning?: string } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { roomId } = useParams<{ roomId: string }>()
  const { user, token } = useAuth()
  const [roomLoading, setRoomLoading] = useState(!!roomId && roomId !== 'new')
  const [roomNotFound, setRoomNotFound] = useState(false)
  const [isSavingRoom, setIsSavingRoom] = useState(false)
  const [saveRoomError, setSaveRoomError] = useState<string | null>(null)
  const [duplicateConfirmModal, setDuplicateConfirmModal] = useState<{ name: string; existingId: string; existingCreatedAt: string } | null>(null)
  const userId = user ? user.id : null
  const pendingEventId: string | null = (location.state as any)?.pendingEventId || null
  const returnToEventId: string | null = (location.state as any)?.returnToEventId || null
  const returnToClubEvent: { clubId: string; eventId: string } | null = (location.state as any)?.returnToClubEvent || null
  const [existingRoomId, setExistingRoomId] = useState<string | null>(null)
  const [existingCreatedAt, setExistingCreatedAt] = useState<string | null>(null)

  const gridWidth = 28
  const gridHeight = 20
  const cellSize = 40

  // Undo-Hilfsfunktionen
  function pushUndoEditor(currentTables: Table[]) {
    setUndoStack(prev => [...prev, currentTables].slice(-5))
  }

  function performUndoEditor() {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const stack = [...prev]
      const restored = stack.pop()!
      setTables(restored)
      return stack
    })
  }

  // Keyboard: rotate selected table with 'R', delete with 'Delete'
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showSaveModal) return
      if (!selectedTableId) return
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setTables(prev => {
          pushUndoEditor(prev)
          return prev.map(t => {
            if (t.id === selectedTableId) {
              return { ...t, rotation: ((t.rotation ?? 0) + 1) % 4 }
            }
            return t
          })
        })
      } else if (e.key === 'Delete') {
        e.preventDefault()
        setTables(prev => {
          pushUndoEditor(prev)
          return prev.filter(t => t.id !== selectedTableId)
        })
        setSelectedTableId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedTableId, showSaveModal])

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
          logger.error('RoomEditor', { action: 'findRoomById', err: e })
        }
        // Room ID from URL not found in saved rooms
        setRoomNotFound(true)
        setRoomLoading(false)
        return
      }

      // Fallback: load from currentRoom localStorage (normal new-room or legacy flow)
      const currentRoom = userStorage.getItem('currentRoom', userId) || localStorage.getItem('currentRoom')
      if (currentRoom) {
        try {
          const room = JSON.parse(currentRoom)
          if (room.tables && room.tables.length > 0) {
            setTables(room.tables)
            const maxId = Math.max(...room.tables.map((t: Table) => parseInt(t.id.slice(1), 10) || 0))
            setNextId(maxId + 1)

            // Try to find a matching saved room entry to determine if we're editing an existing room
            const roomsRaw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms')
            let matchedName: string | null = null
            let matchedId: string | null = null
            let matchedCreatedAt: string | null = null
            if (roomsRaw) {
              try {
                const list = JSON.parse(roomsRaw)
                for (const entry of list) {
                  try {
                    if (entry && entry.data && entry.data.tables) {
                      if (JSON.stringify(entry.data.tables) === JSON.stringify(room.tables)) {
                        matchedName = entry.name
                        matchedId = entry.id
                        matchedCreatedAt = entry.createdAt || null
                        break
                      }
                    }
                  } catch (e) {
                    // ignore
                  }
                }
              } catch (e) {
                // ignore
              }
            }

            if (matchedName) {
              setIsEditingExisting(true)
              setRoomName(matchedName)
              setSaveRoomName(matchedName)
              setExistingRoomId(matchedId)
              setExistingCreatedAt(matchedCreatedAt)
            } else {
              setIsEditingExisting(false)
              setRoomName('Neuer Raum')
              setSaveRoomName('Neuer Raum')
            }

            if (room.viewFrame) {
              setViewFrame(room.viewFrame)
            }
          }
        } catch (e) {
          logger.error('RoomEditor', { action: 'loadRoom', err: e })
        }
      }
      setRoomLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  function addTable() {
    const capacity = parseInt(capacityInput) || 4
    const width = Math.ceil(capacity / 2)
    const height = 2
    const newTable: Table = {
      id: `T${nextId}`,
      x: Math.floor(Math.random() * (gridWidth - width)),
      y: Math.floor(Math.random() * (gridHeight - height)),
      capacity,
      width,
      height,
      locked: false
    }
    pushUndoEditor(tables)
    setTables([...tables, newTable])
    setNextId(nextId + 1)
  }

  function handleDragStart(e: React.DragEvent, tableId: string) {
    e.dataTransfer.setData('text/plain', tableId)
    const table = tables.find(t => t.id === tableId)
    if (table) {
      origTableStateRef.current = { ...table }
      setDraggingTable(table)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const tableId = e.dataTransfer.getData('text/plain')
    const table = tables.find(t => t.id === tableId)
    if (!table) return
    const rect = gridRef.current!.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / cellSize)
    const y = Math.floor((e.clientY - rect.top) / cellSize)
    const clampedX = Math.max(0, Math.min(gridWidth - table.width, x))
    const clampedY = Math.max(0, Math.min(gridHeight - table.height, y))

    // disallow overlap with other tables
    const overlaps = tables.some(t => {
      if (t.id === tableId) return false
      return !(clampedX + table.width <= t.x || clampedX >= t.x + t.width || clampedY + table.height <= t.y || clampedY >= t.y + t.height)
    })
    if (overlaps) return

    // allow moving even if new rect intersects previous rect of same table

    pushUndoEditor(tables)
    setTables(tables.map(t => t.id === tableId ? { ...t, x: clampedX, y: clampedY } : t))
    setDraggingTable(null)
    setDragPreviewPos(null)
  }

  // Rotate table with 'R' while dragging
  useEffect(() => {
    if (!draggingTable) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (showSaveModal) return
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setTables(prev => prev.map(t => t.id === draggingTable.id ? { ...t, width: t.height, height: t.width } : t))
        setDraggingTable(prev => prev ? { ...prev, width: prev.height, height: prev.width } : prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [draggingTable, showSaveModal])

  // Globale Shortcuts: ESC (Ziehen abbrechen + Original wiederherstellen), Ctrl+Z (Rükgängig), Ctrl+S (Speichern-Dialog)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (draggingTable) {
          e.preventDefault()
          // Tisch auf Ursprungsposition/-größe zurücksetzen
          if (origTableStateRef.current) {
            const orig = origTableStateRef.current
            setTables(prev => prev.map(t => t.id === orig.id ? { ...orig } : t))
          }
          setDraggingTable(null)
          setDragPreviewPos(null)
          origTableStateRef.current = null
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        performUndoEditor()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        if (showSaveModal) return
        if (tables.length === 0) return
        e.preventDefault()
        setSaveRoomError(null)
        setSaveRoomName(roomName)
        setShowSaveModal(true)
        return
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [draggingTable, showSaveModal, tables, roomName])

  function updateDragPreview(e: React.DragEvent | React.MouseEvent) {
    if (!draggingTable || !gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / cellSize)
    const y = Math.floor((e.clientY - rect.top) / cellSize)
    const clampedX = Math.max(0, Math.min(gridWidth - draggingTable.width, x))
    const clampedY = Math.max(0, Math.min(gridHeight - draggingTable.height, y))
    setDragPreviewPos({ x: clampedX, y: clampedY })
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    updateDragPreview(e)
  }

  async function confirmSaveRoom(name: string, overrideExistingId?: string, overrideCreatedAt?: string) {
    setSaveRoomError(null)
    const room = { tables, viewFrame: viewFrame || undefined }
    userStorage.setItem('currentRoom', JSON.stringify(room), userId)
    const raw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms') || '[]'
    const list = JSON.parse(raw as string)

    // Determine the effective name
    const effectiveName = name || `Raum ${list.length + 1}`

    // Check for duplicate name (unless we already confirmed overwrite via modal)
    if (!overrideExistingId) {
      const duplicate = list.find((e: any) => e.name === effectiveName && e.id !== existingRoomId)
      if (duplicate) {
        // Show confirmation modal instead of saving right away
        setDuplicateConfirmModal({ name: effectiveName, existingId: duplicate.id, existingCreatedAt: duplicate.createdAt || '' })
        setShowSaveModal(false)
        return
      }
    }

    let entry: any
    // If editing an existing room (same id) OR overwriting a duplicate by name
    const targetId = overrideExistingId || existingRoomId
    if (targetId) {
      // Overwrite existing entry, preserve createdAt
      const targetCreatedAt = overrideCreatedAt !== undefined ? overrideCreatedAt : (existingCreatedAt || new Date().toLocaleDateString())
      entry = { id: targetId, name: effectiveName, createdAt: targetCreatedAt, data: room }
      const updated = list.map((e: any) => e.id === targetId ? entry : e)
      // If targetId not in list (shouldn't happen, but safety), append
      if (!list.find((e: any) => e.id === targetId)) {
        updated.push(entry)
      }
      userStorage.setItem('rooms', JSON.stringify(updated), userId)
    } else {
      // New room
      entry = { id: `r-${Date.now()}`, name: effectiveName, createdAt: new Date().toLocaleDateString(), data: room }
      userStorage.setItem('rooms', JSON.stringify([...list, entry]), userId)
    }

    // If this room was created as part of event creation, link it to the event
    const targetEventId = pendingEventId || returnToEventId
    if (targetEventId) {
      try {
        const rawEvent = userStorage.getItem('currentEvent', userId) || localStorage.getItem('currentEvent')
        if (rawEvent) {
          const event = JSON.parse(rawEvent as string)
          if (event && event.id === targetEventId) {
            event.roomId = entry.id
            userStorage.setItem('currentEvent', JSON.stringify(event), userId)
            // Also update the event in the events list
            const rawEvents = userStorage.getItem('events', userId) || localStorage.getItem('events') || '[]'
            const events = JSON.parse(rawEvents as string)
            const updatedEvents = events.map((e: any) => e.id === targetEventId ? { ...e, roomId: entry.id } : e)
            userStorage.setItem('events', JSON.stringify(updatedEvents), userId)
          }
        }
      } catch (e) {
        logger.error('RoomEditor', { action: 'linkEventToRoom', err: e })
      }
    }

    // show saving indicator during background sync
    setIsSavingRoom(true)
    setShowSaveModal(false)
    setDuplicateConfirmModal(null)

    if (pendingEventId) {
      navigate(`/app/events/${pendingEventId}`)
    } else if (returnToEventId) {
      navigate(`/app/events/${returnToEventId}`)
    } else if (returnToClubEvent) {
      navigate(`/app/club/${returnToClubEvent.clubId}/events/${returnToClubEvent.eventId}`, {
        state: { applyFromPersonalRoom: { roomId: entry.id } }
      })
    } else {
      navigate('/app/rooms')
    }

    try {
      if (userId) {
        await syncUserData(token, userId)
      }
    } catch (e: any) {
      logger.error('RoomEditor', { action: 'syncAfterSave', err: e })
    }
    setIsSavingRoom(false)
  }

  function eventToCell(e: MouseEvent | React.MouseEvent): { x: number; y: number } | null {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    const x = Math.floor(((e as any).clientX - rect.left) / cellSize)
    const y = Math.floor(((e as any).clientY - rect.top) / cellSize)
    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) return null
    return { x, y }
  }

  function startFrame(e: React.MouseEvent) {
    if (!defineViewMode) return
    if ((e.target as HTMLElement).closest('[data-table="true"]')) return
    const cell = eventToCell(e)
    if (!cell) return
    setFrameDragStart(cell)
    setViewFrame({ x: cell.x, y: cell.y, width: 1, height: 1 })
  }

  useEffect(() => {
    function onMove(ev: MouseEvent) {
      if (!frameDragStart) return
      const cell = eventToCell(ev)
      if (!cell) return
      const minX = Math.min(frameDragStart.x, cell.x)
      const minY = Math.min(frameDragStart.y, cell.y)
      const maxX = Math.max(frameDragStart.x, cell.x)
      const maxY = Math.max(frameDragStart.y, cell.y)
      setViewFrame({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    }

    function onUp(ev: MouseEvent) {
      if (!frameDragStart) return
      const cell = eventToCell(ev)
      if (!cell) {
        setFrameDragStart(null)
        return
      }
      const minX = Math.min(frameDragStart.x, cell.x)
      const minY = Math.min(frameDragStart.y, cell.y)
      const maxX = Math.max(frameDragStart.x, cell.x)
      const maxY = Math.max(frameDragStart.y, cell.y)
      setViewFrame({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
      setFrameDragStart(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [frameDragStart])

  // Set page header title (dynamic based on editing mode)
  useEffect(() => {
    setPageTitle(isEditingExisting ? 'Raum bearbeiten' : 'Neuen Raum erstellen', '🏗️')
    return () => { setPageTitle(null); setHeaderContent(null) }
  }, [isEditingExisting, setPageTitle, setHeaderContent])

  if (roomLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Laden…</div>
  if (roomNotFound) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <p style={{ fontSize: 48, margin: '0 0 16px' }}>🔍</p>
      <p style={{ fontSize: 18, color: '#991b1b', margin: '0 0 16px' }}>Raum nicht gefunden.</p>
      <button onClick={() => navigate('/app/rooms')} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Zurück zur Raumübersicht</button>
    </div>
  )

  return (
    <div style={{ 
      height: '100%', 
      background: '#f8fafc', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      {/* Main Content: Sidebar + Grid */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          flex: '0 0 320px',
          maxWidth: '360px',
          background: 'white',
          boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto'
        }}>
          {/* Room name (read-only display) */}
          <div style={{
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#334155'
          }} title="Raumname wird beim Speichern geändert">
            🏷️ {roomName}
          </div>
          <input
            type="number"
            value={capacityInput}
            onChange={e => setCapacityInput(e.target.value)}
            placeholder="z. B. 4"
            style={{ padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: 500, outline: 'none' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#667eea')}
            onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
          />
          <button
            onClick={addTable}
            style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, boxShadow: '0 2px 8px rgba(102,126,234,0.3)' }}
          >+ Tisch hinzufügen</button>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setDefineViewMode(prev => !prev)}
              style={{ flex: 1, padding: '10px 12px', background: '#fff', color: '#0f172a', border: '2px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
            >Ansicht definieren</button>
            <button
              onClick={() => setViewFrame(null)}
              style={{ flex: 1, padding: '10px 12px', background: '#fff', color: '#64748b', border: '2px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
            >Zurücksetzen</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setSaveRoomError(null); setSaveRoomName(roomName); setShowSaveModal(true); }}
              disabled={tables.length === 0}
              style={{ flex: 2, padding: '12px 14px', background: tables.length === 0 ? '#e2e8f0' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: tables.length === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 700, opacity: tables.length === 0 ? 0.6 : 1 }}
            >💾 Speichern</button>
            <button
              onClick={performUndoEditor}
              disabled={undoStack.length === 0}
              title="Rückgängig (Strg+Z)"
              style={{ flex: 1, padding: '12px 10px', background: undoStack.length > 0 ? '#f8fafc' : '#f1f5f9', color: undoStack.length > 0 ? '#374151' : '#94a3b8', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: undoStack.length > 0 ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600, opacity: undoStack.length > 0 ? 1 : 0.5, whiteSpace: 'nowrap' }}
            >↩ {undoStack.length > 0 ? `(${undoStack.length})` : ''}</button>
          </div>
          
          {showHelp && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              color: '#0c4a6e',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#0c4a6e',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Hinweis schließen"
              >✕</button>
              <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💡</span>
                <span>Bedienungshinweise</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Desktop:</strong></div>
                <div>• Tisch verschieben: Tisch anklicken zum Aufnehmen, auf Ziel klicken zum Absetzen</div>
                <div>• Tisch drehen: Taste <strong>R</strong> (während Tisch aufgenommen)</div>
                <div>• Ziehen abbrechen: <strong>ESC</strong> (setzt Tisch auf Ursprungsposition zurück)</div>
                <div>• Rückgängig: <strong>Strg+Z</strong> (max. 5 Schritte)</div>
                <div>• Speichern: <strong>Strg+S</strong></div>
                <div>• Rechtsklick: Kontextmenü zum <strong>Größe ändern</strong> oder <strong>Löschen</strong></div>
                {/* Tablet/Phone instructions removed (deprecated) */}
              </div>
            </div>
          )}
          {viewFrame && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Aktueller Rahmen: x:{viewFrame.x}, y:{viewFrame.y}, w:{viewFrame.width}, h:{viewFrame.height}
            </div>
          )}
        </div>

        {/* Grid Container */}
        <div style={{ flex: 1, padding: '24px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div
            className="grid"
            ref={gridRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragPreviewPos(null)}
            onMouseDown={startFrame}
            onMouseMove={(e) => updateDragPreview(e)}
            onClick={(e) => {
              // Click to drop when a table is picked up
              if (!draggingTable) return
              const cell = eventToCell(e as React.MouseEvent)
              if (!cell) return
              const clampedX = Math.max(0, Math.min(gridWidth - draggingTable.width, cell.x))
              const clampedY = Math.max(0, Math.min(gridHeight - draggingTable.height, cell.y))

              // disallow overlap with other tables
              const overlaps = tables.some(t => {
                if (t.id === draggingTable.id) return false
                return !(clampedX + draggingTable.width <= t.x || clampedX >= t.x + t.width || clampedY + draggingTable.height <= t.y || clampedY >= t.y + t.height)
              })
              if (overlaps) return

              // allow moving even if new rect intersects previous rect of same table

              pushUndoEditor(tables)
              setTables(tables.map(t => t.id === draggingTable.id ? { ...t, x: clampedX, y: clampedY } : t))
              setDraggingTable(null)
              setDragPreviewPos(null)
              origTableStateRef.current = null
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridWidth}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${gridHeight}, ${cellSize}px)`,
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              width: gridWidth * cellSize + 'px',
              height: gridHeight * cellSize + 'px',
              position: 'relative',
              background: 'white',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              backgroundImage: `
                linear-gradient(to right, #f1f5f9 1px, transparent 1px),
                linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)
              `,
              backgroundSize: `${cellSize}px ${cellSize}px`
            }}
          >
            {defineViewMode && (
              <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(99,102,241,0.1)', color: '#3730a3', border: '1px solid #a5b4fc', padding: '6px 8px', borderRadius: 6, fontSize: 12, pointerEvents: 'none' }}>
                Ansicht: Ziehen, um Rahmen aufzuziehen
              </div>
            )}
            {viewFrame && (
              <div
                style={{
                  position: 'absolute',
                  left: viewFrame.x * cellSize,
                  top: viewFrame.y * cellSize,
                  width: viewFrame.width * cellSize,
                  height: viewFrame.height * cellSize,
                  border: '2px dashed #3b82f6',
                  boxShadow: '0 0 0 2px rgba(59,130,246,0.2) inset',
                  pointerEvents: 'none',
                  borderRadius: '6px'
                }}
              />
            )}
            
            {/* Drag Preview */}
            {draggingTable && dragPreviewPos && (
              <div
                style={{
                  gridColumn: `${dragPreviewPos.x + 1} / span ${draggingTable.width}`,
                  gridRow: `${dragPreviewPos.y + 1} / span ${draggingTable.height}`,
                  background: 'rgba(102, 126, 234, 0.3)',
                  border: '2px dashed #667eea',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 100,
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#667eea'
                }}
              >
                {draggingTable.id}
              </div>
            )}
            {tables.map(table => (
              <div
                key={table.id}
                data-table="true"
                onContextMenu={e => {
                  e.preventDefault()
                  setSelectedTableId(table.id)
                  setContextMenu({ x: e.clientX, y: e.clientY, tableId: table.id })
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  // Click to pick up table (if not already dragging)
                  if (!draggingTable) {
                    origTableStateRef.current = { ...table }
                    setDraggingTable(table)
                    setDragPreviewPos({ x: table.x, y: table.y })
                    setSelectedTableId(table.id)
                    return
                  }
                  // If already dragging something, just select
                  setSelectedTableId(table.id)
                }}
                style={{
                  gridColumn: `${table.x + 1} / span ${table.width}`,
                  gridRow: `${table.y + 1} / span ${table.height}`,
                  background: 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)',
                  border: '2px solid #6366f1',
                  pointerEvents: draggingTable && draggingTable.id === table.id ? 'none' : undefined,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'move',
                  opacity: draggingTable && draggingTable.id === table.id ? 0.35 : 1,
                  fontWeight: '600',
                  fontSize: '14px',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.zIndex = '10'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
                title="Tisch anklicken und R zum Rotieren; Rechtsklick öffnet Menü"
              >
                {(() => {
                  const m = table.id.match(/(\d+)$/)
                  const num = m ? m[1] : table.id
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div>{`Tisch ${num}`}</div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>{`(${table.capacity})`}</div>
                    </div>
                  )
                })()}
              </div>
            ))}
            
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: 'white', border: '1px solid #cbd5e1', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', borderRadius: 8, zIndex: 2000, minWidth: 180 }}
             onMouseLeave={() => setContextMenu(null)}>
          <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>🪑 {contextMenu.tableId}</div>
          <button onClick={() => {
            const id = contextMenu.tableId
            const num = (id.match(/(\d+)$/) || [])[1] || ''
            setRenameModal({ tableId: id, newId: num })
            setContextMenu(null)
          }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            ✏️ Tischnummer ändern
          </button>
          <button onClick={() => { const t = tables.find(t => t.id === contextMenu.tableId); setSizeModal({ tableId: contextMenu.tableId, capacity: String(t?.capacity ?? 4) }); setContextMenu(null) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            📏 Größe ändern
          </button>
          <button onClick={() => { setTables(prev => { pushUndoEditor(prev); return prev.filter(t => t.id !== contextMenu.tableId) }); setContextMenu(null); if (selectedTableId === contextMenu.tableId) setSelectedTableId(null) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444' }}>
            🗑️ Tisch löschen
          </button>
        </div>
      )}

      {/* Rename Table Modal */}
      {renameModal && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2150 }} onClick={() => setRenameModal(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, minWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>✏️ Tischnummer ändern – {renameModal.tableId}</h3>
            <label style={{ display: 'block', fontSize: 13, color: '#334155', fontWeight: 600, marginBottom: 6 }}>Neue Tischnummer</label>
            <input type="text" value={renameModal.newId} onChange={e => {
              const val = e.target.value
              const full = (/^\d+$/.test(val) ? `T${val}` : val)
              // detect collision and set warning
              const collision = tables.some(t => t.id === full && t.id !== renameModal.tableId)
              setRenameModal({ ...renameModal, newId: val, error: undefined, warning: collision ? 'Tischnummer bereits vergeben — der andere Tisch erhält eine neue Nummer' : undefined })
            }}
                   style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}/>
            {renameModal.error && <div style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>{renameModal.error}</div>}
            {renameModal.warning && <div style={{ color: '#b45309', marginTop: 8, fontSize: 13 }}>{renameModal.warning}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setRenameModal(null)}
                      style={{ flex: 1, padding: '10px 14px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={() => {
                        const raw = (renameModal.newId || '').trim()
                        if (!raw) { setRenameModal({ ...renameModal, error: 'Tischnummer darf nicht leer sein' }); return }
                        const newId = (/^\d+$/.test(raw) ? `T${raw}` : raw)

                        // Helper: escape regexp
                        const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

                        const existing = tables.find(t => t.id === newId && t.id !== renameModal.tableId)
                        if (existing) {
                          // compute new id for the existing table based on its prefix (if numeric suffix exists)
                          const m = existing.id.match(/^(.*?)(\d+)$/)
                          const prefix = m ? m[1] : 'T'
                          // collect numbers with same prefix
                          const nums = tables.map(t => {
                            const mm = t.id.match(new RegExp('^' + escapeRegExp(prefix) + '(\\d+)$'))
                            return mm ? parseInt(mm[1], 10) : null
                          }).filter(n => n !== null) as number[]
                          const maxNum = nums.length ? Math.max(...nums) : 0
                          let candidate = `${prefix}${maxNum + 1}`
                          // ensure uniqueness
                          while (tables.some(t => t.id === candidate)) {
                            const nn = parseInt(candidate.replace(/[^0-9]/g, ''), 10) || (maxNum + 1)
                            candidate = `${prefix}${nn + 1}`
                          }

                          const otherOldId = existing.id
                          const otherNewId = candidate

                          pushUndoEditor(tables)
                          setTables(prev => prev.map(t => {
                            if (t.id === otherOldId) return { ...t, id: otherNewId }
                            if (t.id === renameModal.tableId) return { ...t, id: newId }
                            return t
                          }))

                          if (selectedTableId === renameModal.tableId) setSelectedTableId(newId)
                          if (selectedTableId === otherOldId) setSelectedTableId(otherNewId)
                          setRenameModal(null)
                          return
                        }

                        // No collision: simple rename
                        pushUndoEditor(tables)
                        setTables(prev => prev.map(t => t.id === renameModal.tableId ? { ...t, id: newId } : t))
                        if (selectedTableId === renameModal.tableId) setSelectedTableId(newId)
                        setRenameModal(null)
                      }}
                      disabled={!renameModal.newId || renameModal.newId.trim() === ''}
                      style={{ flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Size Change Modal */}
      {sizeModal && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }} onClick={() => setSizeModal(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, minWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>📏 Größe ändern – {sizeModal.tableId}</h3>
            <label style={{ display: 'block', fontSize: 13, color: '#334155', fontWeight: 600, marginBottom: 6 }}>Personenzahl</label>
            <input type="number" value={sizeModal.capacity} onChange={e => setSizeModal({ ...sizeModal, capacity: e.target.value })}
                   style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}/>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setSizeModal(null)}
                      style={{ flex: 1, padding: '10px 14px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={() => {
                        const cap = Math.max(1, parseInt(sizeModal.capacity || '4'))
                        pushUndoEditor(tables)
                        setTables(prev => prev.map(t => t.id === sizeModal.tableId ? { ...t, capacity: cap, width: Math.ceil(cap / 2), height: 2 } : t))
                        setSizeModal(null)
                      }}
                      style={{ flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', minWidth: '420px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>💾 Raum speichern</h3>
            {saveRoomError && (
              <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 500 }}>
                {saveRoomError}
              </div>
            )}
            <input
              type="text"
              value={saveRoomName}
              onChange={e => setSaveRoomName(e.target.value)}
              placeholder="Raumname"
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#667eea'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button 
                onClick={() => confirmSaveRoom(saveRoomName)}
                disabled={isSavingRoom}
                style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: isSavingRoom ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(102,126,234,0.3)', transition: 'all 0.2s' }}
                onMouseOver={e => { if (!isSavingRoom) e.currentTarget.style.transform = 'translateY(-2px)'}}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >{isSavingRoom ? 'Speichert…' : 'Speichern'}</button>
              <button 
                onClick={() => { setSaveRoomError(null); setShowSaveModal(false) }}
                style={{ padding: '12px 24px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'white'; }}
              >Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Name Confirmation Modal */}
      {duplicateConfirmModal && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', minWidth: '420px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>⚠️ Name bereits vorhanden</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
              Ein Raum mit dem Namen <strong>„{duplicateConfirmModal.name}"</strong> existiert bereits.<br />
              Soll der bestehende Raum überschrieben werden?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => confirmSaveRoom(duplicateConfirmModal.name, duplicateConfirmModal.existingId, duplicateConfirmModal.existingCreatedAt)}
                disabled={isSavingRoom}
                style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: isSavingRoom ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700' }}
              >{isSavingRoom ? 'Speichert…' : 'Überschreiben'}</button>
              <button
                onClick={() => { setDuplicateConfirmModal(null); setSaveRoomName(duplicateConfirmModal.name); setShowSaveModal(true) }}
                style={{ flex: 1, padding: '12px 24px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
              >Namen anpassen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
