// ============================================================================
// EventRoomEditor – Embedded room/table editor for event modules
// Derived from RoomEditor.tsx, but uses props + callback instead of localStorage.
// ============================================================================
import React, { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useDeviceType } from '../../utils/useDeviceType'
import type { Table, ViewFrame } from '../../types/room'

export interface EventRoomEditorProps {
  initialTables: Table[]
  initialViewFrame?: ViewFrame | null
  initialGridHeight?: number
  onSave: (tables: Table[], viewFrame: ViewFrame | null, grid?: { width?: number; height?: number }) => Promise<void>
  readOnly?: boolean
}

const EventRoomEditor = forwardRef(function EventRoomEditor({ initialTables, initialViewFrame, onSave, readOnly, initialGridHeight }: EventRoomEditorProps, ref) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const [tables, setTables] = useState<Table[]>(initialTables)
  const [nextId, setNextId] = useState(() => {
    const maxId = Math.max(0, ...initialTables.map(t => parseInt(t.id.replace(/\D/g, ''), 10) || 0))
    return maxId + 1
  })
  const [capacityInput, setCapacityInput] = useState('4')
  const [viewFrame, setViewFrame] = useState<ViewFrame | null>(initialViewFrame ?? null)
  const [frameDragStart, setFrameDragStart] = useState<{ x: number; y: number } | null>(null)
  const [defineViewMode, setDefineViewMode] = useState(false)
  const [showHelp, setShowHelp] = useState(true)
  const [draggingTable, setDraggingTable] = useState<Table | null>(null)
  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null)
  const origTableStateRef = useRef<Table | null>(null)
  const [undoStack, setUndoStack] = useState<Table[][]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId: string } | null>(null)
  const [sizeModal, setSizeModal] = useState<{ tableId: string; capacity: string } | null>(null)
  const [renameModal, setRenameModal] = useState<{ tableId: string; newId: string; error?: string; warning?: string } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveToast, setSaveToast] = useState<string | null>(null)

  const gridWidth = 28
  const [gridHeight, setGridHeight] = useState<number>(initialGridHeight ?? 20)
  const cellSize = 40
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const [scrollData, setScrollData] = useState({ scrollLeft: 0, clientWidth: 0, scrollWidth: 0 })

  useEffect(() => {
    setTables(initialTables)
    const maxId = Math.max(0, ...initialTables.map(t => parseInt(t.id.replace(/\D/g, ''), 10) || 0))
    setNextId(maxId + 1)
    setViewFrame(initialViewFrame ?? null)
    setGridHeight(initialGridHeight ?? 20)
  }, [initialTables, initialViewFrame, initialGridHeight])

  // Track last saved state to detect dirty changes
  const lastSavedRef = useRef<{ tables: Table[]; viewFrame: ViewFrame | null; gridHeight: number }>({ tables: initialTables, viewFrame: initialViewFrame ?? null, gridHeight: initialGridHeight ?? 20 })
  const isDirty = useMemo(() => {
    try {
      if (JSON.stringify(lastSavedRef.current.tables) !== JSON.stringify(tables)) return true
    } catch { return true }
    const vs = lastSavedRef.current.viewFrame
    if (JSON.stringify(vs) !== JSON.stringify(viewFrame)) return true
    if (lastSavedRef.current.gridHeight !== gridHeight) return true
    return false
  }, [tables, viewFrame, gridHeight])

  function pushUndo(currentTables: Table[]) {
    setUndoStack(prev => [...prev, currentTables].slice(-5))
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

  function changeGridHeight(newHeight: number) {
    if (readOnly) return
    pushUndo(tables)
    setGridHeight(newHeight)
    setTables(prev => prev.map(t => ({ ...t, y: Math.min(t.y, Math.max(0, newHeight - t.height)) })))
  }

  // Update scroll button visibility and positions
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function update() {
      setScrollData({ scrollLeft: el.scrollLeft, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth })
      setShowScrollButtons(el.scrollWidth > el.clientWidth + 8)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [containerRef, tables.length, gridWidth, cellSize])

  const handleSaveClick = useCallback(async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await onSave(tables, viewFrame, { width: gridWidth, height: gridHeight })
      setSaveToast('Gespeichert ✓')
      // update lastSaved snapshot
      lastSavedRef.current = { tables, viewFrame: viewFrame ?? null, gridHeight }
      setTimeout(() => setSaveToast(null), 2000)
    } catch (err: any) {
      setSaveError(err?.message || 'Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }, [onSave, tables, viewFrame, gridWidth, gridHeight])

  // Expose imperative handle for parent to trigger save-if-dirty
  useImperativeHandle(ref, () => ({
    isDirty: () => isDirty,
    saveIfDirty: async () => {
      if (!isDirty) return
      await handleSaveClick()
    }
    ,
    getCurrentData: () => ({ tables, viewFrame, gridHeight }),
  }), [isDirty, handleSaveClick, tables, viewFrame, gridHeight])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return
      if (!selectedTableId) return
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setTables(prev => {
          pushUndo(prev)
          return prev.map(t => (t.id === selectedTableId ? { ...t, rotation: ((t.rotation ?? 0) + 1) % 4 } : t))
        })
      } else if (e.key === 'Delete') {
        e.preventDefault()
        setTables(prev => {
          pushUndo(prev)
          return prev.filter(t => t.id !== selectedTableId)
        })
        setSelectedTableId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedTableId, readOnly])

  function addTable() {
    if (readOnly) return
    const capacity = parseInt(capacityInput, 10) || 4
    const width = Math.ceil(capacity / 2)
    const height = 2
    const newTable: Table = {
      id: `T${nextId}`,
      x: Math.floor(Math.random() * (gridWidth - width)),
      y: Math.floor(Math.random() * (gridHeight - height)),
      capacity,
      width,
      height,
      locked: false,
    }
    pushUndo(tables)
    setTables([...tables, newTable])
    setNextId(nextId + 1)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (readOnly || !gridRef.current) return
    const tableId = e.dataTransfer.getData('text/plain')
    const table = tables.find(t => t.id === tableId)
    if (!table) return
    const rect = gridRef.current.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / cellSize)
    const y = Math.floor((e.clientY - rect.top) / cellSize)
    const clampedX = Math.max(0, Math.min(gridWidth - table.width, x))
    const clampedY = Math.max(0, Math.min(gridHeight - table.height, y))
    const overlaps = tables.some(t => {
      if (t.id === tableId) return false
      return !(clampedX + table.width <= t.x || clampedX >= t.x + t.width || clampedY + table.height <= t.y || clampedY >= t.y + t.height)
    })
    if (overlaps) return
    pushUndo(tables)
    setTables(tables.map(t => (t.id === tableId ? { ...t, x: clampedX, y: clampedY } : t)))
    setDraggingTable(null)
    setDragPreviewPos(null)
  }

  useEffect(() => {
    if (!draggingTable || readOnly) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setTables(prev => prev.map(t => (t.id === draggingTable.id ? { ...t, width: t.height, height: t.width } : t)))
        setDraggingTable(prev => (prev ? { ...prev, width: prev.height, height: prev.width } : prev))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [draggingTable, readOnly])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return
      if (e.key === 'Escape' && draggingTable) {
        e.preventDefault()
        if (origTableStateRef.current) {
          const orig = origTableStateRef.current
          setTables(prev => prev.map(t => (t.id === orig.id ? { ...orig } : t)))
        }
        setDraggingTable(null)
        setDragPreviewPos(null)
        origTableStateRef.current = null
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        performUndo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        if (tables.length === 0) return
        e.preventDefault()
        void handleSaveClick()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [draggingTable, tables, readOnly, handleSaveClick])

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

  function getClientPoint(e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) {
    // Support mouse and touch events
    if ((e as TouchEvent).changedTouches && (e as TouchEvent).changedTouches.length) {
      const t = (e as TouchEvent).changedTouches[0]
      return { clientX: t.clientX, clientY: t.clientY }
    }
    if ((e as React.TouchEvent).changedTouches && (e as React.TouchEvent).changedTouches.length) {
      const t = (e as React.TouchEvent).changedTouches[0]
      return { clientX: t.clientX, clientY: t.clientY }
    }
    const me = e as MouseEvent
    return { clientX: (me as any).clientX, clientY: (me as any).clientY }
  }

  function eventToCell(e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent): { x: number; y: number } | null {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    const p = getClientPoint(e)
    const x = Math.floor((p.clientX - rect.left) / cellSize)
    const y = Math.floor((p.clientY - rect.top) / cellSize)
    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) return null
    return { x, y }
  }

  function startFrame(e: React.MouseEvent | React.TouchEvent) {
    if (!defineViewMode) return
    if ((e as any).target && (e as any).target.closest && (e as any).target.closest('[data-table="true"]')) return
    const cell = eventToCell(e)
    if (!cell) return
    setFrameDragStart(cell)
    setViewFrame({ x: cell.x, y: cell.y, width: 1, height: 1 })
  }

  useEffect(() => {
    function onMove(ev: MouseEvent | TouchEvent) {
      if (!frameDragStart) return
      const cell = eventToCell(ev as any)
      if (!cell) return
      const minX = Math.min(frameDragStart.x, cell.x)
      const minY = Math.min(frameDragStart.y, cell.y)
      const maxX = Math.max(frameDragStart.x, cell.x)
      const maxY = Math.max(frameDragStart.y, cell.y)
      setViewFrame({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    }

    function onUp(ev: MouseEvent | TouchEvent) {
      if (!frameDragStart) return
      const cell = eventToCell(ev as any)
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
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [frameDragStart])

  // Horizontal scroll helpers for mobile: pan grid left/right
  const scrollAmount = cellSize * 6
  function scrollGridBy(delta: number) {
    try {
      const container = gridRef.current?.parentElement as HTMLElement | null
      if (!container) return
      container.scrollBy({ left: delta, behavior: 'smooth' })
    } catch {}
  }

  return (
    <div style={{ height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
        <div
          style={{
            ...(isMobile
              ? { background: 'white', borderBottom: '1px solid #e2e8f0', padding: '12px 14px' }
              : { flex: '0 0 320px', maxWidth: '360px', background: 'white', boxShadow: '2px 0 12px rgba(0,0,0,0.05)', padding: '20px', overflowY: 'auto' }),
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '8px' : '12px',
          }}>
          {!readOnly && (isMobile ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100, flex: '0 0 auto' }}>
                <label htmlFor="event-room-grid-height-mobile" style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Rasterhöhe</label>
                <select id="event-room-grid-height-mobile" value={String(gridHeight)} onChange={e => changeGridHeight(Math.max(8, parseInt(e.target.value, 10) || 20))} style={{ minWidth: 100, padding: '8px 10px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, textAlign: 'center' }} title="Rasterhöhe auswählen" onFocus={e => (e.currentTarget.style.borderColor = '#667eea')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}>
                  <option value="20">Standard</option>
                  <option value="40">Mittel (+20)</option>
                  <option value="50">Groß (+30)</option>
                  <option value="60">Maxi (+40)</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 80, flex: '0 0 auto' }}>
                <label htmlFor="event-room-capacity-mobile" style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Personen</label>
                <input
                  id="event-room-capacity-mobile"
                  type="number"
                  value={capacityInput}
                  onChange={e => setCapacityInput(e.target.value)}
                  placeholder="4"
                  style={{ minWidth: 56, maxWidth: 72, padding: '8px 10px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 500, outline: 'none', textAlign: 'center' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginLeft: 'auto', flex: '0 0 auto' }}>
                <button onClick={addTable} style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>+ Tisch</button>
              </div>
            </div>
          ) : (
            <>
              <label htmlFor="event-room-capacity" style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>👥 Personenzahl pro Tisch</label>
              <input
                id="event-room-capacity"
                type="number"
                value={capacityInput}
                onChange={e => setCapacityInput(e.target.value)}
                placeholder="z. B. 4"
                style={{ padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: 500, outline: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#667eea' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0' }}
              />
              <button onClick={addTable} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, boxShadow: '0 2px 8px rgba(102,126,234,0.3)' }}>+ Tisch hinzufügen</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="event-room-grid-height" style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Rasterhöhe</label>
                  <select id="event-room-grid-height" value={String(gridHeight)} onChange={e => changeGridHeight(Math.max(8, parseInt(e.target.value, 10) || 20))} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} onFocus={e => (e.currentTarget.style.borderColor = '#667eea')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}>
                    <option value="20">Standart</option>
                    <option value="40">Mittel (+20)</option>
                    <option value="50">Groß (+30)</option>
                    <option value="60">Maxi (+40)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setDefineViewMode(prev => !prev)} style={{ flex: 1, padding: '10px 12px', background: '#fff', color: '#0f172a', border: '2px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Ansicht definieren</button>
                  <button onClick={() => setViewFrame(null)} style={{ flex: 1, padding: '10px 12px', background: '#fff', color: '#64748b', border: '2px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Zurücksetzen</button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={performUndo} disabled={undoStack.length === 0} title="Rückgängig (Strg+Z)" style={{ flex: 1, padding: '12px 10px', background: undoStack.length > 0 ? '#f8fafc' : '#f1f5f9', color: undoStack.length > 0 ? '#374151' : '#94a3b8', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: undoStack.length > 0 ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600, opacity: undoStack.length > 0 ? 1 : 0.5, whiteSpace: 'nowrap' }}>↩ {undoStack.length > 0 ? `(${undoStack.length})` : ''}</button>
                </div>
              </div>
            </>
          ))}

          {saveError && <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>{saveError}</div>}

          {showHelp && !readOnly && !isMobile && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#0c4a6e', position: 'relative' }}>
              <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: '#0c4a6e', cursor: 'pointer', fontSize: '16px', padding: '0', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Hinweis schließen">✕</button>
              <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><span>💡</span><span>Bedienungshinweise</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>• Tisch verschieben: Tisch anklicken zum Aufnehmen, auf Ziel klicken zum Absetzen</div>
                <div>• Tisch drehen: Taste <strong>R</strong> (während Tisch aufgenommen)</div>
                <div>• Ziehen abbrechen: <strong>ESC</strong></div>
                <div>• Rückgängig: <strong>Strg+Z</strong> (max. 5 Schritte)</div>
                <div>• Speichern: <strong>Strg+S</strong></div>
                <div>• Rechtsklick: Kontextmenü zum <strong>Größe ändern</strong> oder <strong>Löschen</strong></div>
              </div>
            </div>
          )}

          {viewFrame && !isMobile && <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>Aktueller Rahmen: x:{viewFrame.x}, y:{viewFrame.y}, w:{viewFrame.width}, h:{viewFrame.height}</div>}

          {!isMobile && (
            <>
              <div style={{ marginTop: 8, fontSize: 13, color: '#64748b', fontWeight: 600 }}>🪑 Tische ({tables.length})</div>
              {tables.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Noch keine Tische vorhanden.</div>}
            </>
          )}
        </div>

        <div ref={containerRef} style={{ position: 'relative', flex: 1, padding: isMobile ? '8px' : '24px', display: 'flex', justifyContent: isMobile ? 'flex-start' : 'center', alignItems: 'flex-start', WebkitOverflowScrolling: 'touch', minHeight: 0, height: 'calc(100vh - 120px)', overflowX: 'auto', overflowY: 'auto' }}>
          <div
            className="grid"
            ref={gridRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragPreviewPos(null)}
            onMouseDown={startFrame}
            onTouchStart={e => startFrame(e)}
            onMouseMove={e => updateDragPreview(e)}
            onTouchMove={e => { if (frameDragStart) e.preventDefault(); updateDragPreview(e as any) }}
            onClick={e => {
              if (readOnly || !draggingTable) return
              const cell = eventToCell(e)
              if (!cell) return
              const clampedX = Math.max(0, Math.min(gridWidth - draggingTable.width, cell.x))
              const clampedY = Math.max(0, Math.min(gridHeight - draggingTable.height, cell.y))
              const overlaps = tables.some(t => {
                if (t.id === draggingTable.id) return false
                return !(clampedX + draggingTable.width <= t.x || clampedX >= t.x + t.width || clampedY + draggingTable.height <= t.y || clampedY >= t.y + t.height)
              })
              if (overlaps) return
              pushUndo(tables)
              setTables(tables.map(t => (t.id === draggingTable.id ? { ...t, x: clampedX, y: clampedY } : t)))
              setDraggingTable(null)
              setDragPreviewPos(null)
              origTableStateRef.current = null
            }}
            onTouchEnd={e => {
              if (readOnly || !draggingTable) return
              const cell = eventToCell(e as any)
              if (!cell) return
              const clampedX = Math.max(0, Math.min(gridWidth - draggingTable.width, cell.x))
              const clampedY = Math.max(0, Math.min(gridHeight - draggingTable.height, cell.y))
              const overlaps = tables.some(t => {
                if (t.id === draggingTable.id) return false
                return !(clampedX + draggingTable.width <= t.x || clampedX >= t.x + t.width || clampedY + draggingTable.height <= t.y || clampedY >= t.y + t.height)
              })
              if (overlaps) return
              pushUndo(tables)
              setTables(tables.map(t => (t.id === draggingTable.id ? { ...t, x: clampedX, y: clampedY } : t)))
              setDraggingTable(null)
              setDragPreviewPos(null)
              origTableStateRef.current = null
            }}
            style={{ display: 'grid', gridTemplateColumns: `repeat(${gridWidth}, ${cellSize}px)`, gridTemplateRows: `repeat(${gridHeight}, ${cellSize}px)`, border: '2px solid #e2e8f0', borderRadius: '12px', width: `${gridWidth * cellSize}px`, height: `${gridHeight * cellSize}px`, position: 'relative', background: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', backgroundImage: `linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)`, backgroundSize: `${cellSize}px ${cellSize}px` }}
          >
            {defineViewMode && <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(99,102,241,0.1)', color: '#3730a3', border: '1px solid #a5b4fc', padding: '6px 8px', borderRadius: 6, fontSize: 12, pointerEvents: 'none' }}>Ansicht: Ziehen, um Rahmen aufzuziehen</div>}
            {viewFrame && <div style={{ position: 'absolute', left: viewFrame.x * cellSize, top: viewFrame.y * cellSize, width: viewFrame.width * cellSize, height: viewFrame.height * cellSize, border: '2px dashed #3b82f6', boxShadow: '0 0 0 2px rgba(59,130,246,0.2) inset', pointerEvents: 'none', borderRadius: '6px' }} />}
            {draggingTable && dragPreviewPos && <div style={{ gridColumn: `${dragPreviewPos.x + 1} / span ${draggingTable.width}`, gridRow: `${dragPreviewPos.y + 1} / span ${draggingTable.height}`, background: 'rgba(102, 126, 234, 0.3)', border: '2px dashed #667eea', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 100, fontWeight: '600', fontSize: '14px', color: '#667eea' }}>{draggingTable.id}</div>}

            {tables.map(table => (
              <div
                key={table.id}
                data-table="true"
                draggable={!readOnly}
                onDragStart={e => {
                  if (readOnly) return
                  e.dataTransfer.setData('text/plain', table.id)
                  origTableStateRef.current = { ...table }
                  setDraggingTable(table)
                }}
                onContextMenu={e => {
                  if (readOnly) return
                  e.preventDefault()
                  setSelectedTableId(table.id)
                  setContextMenu({ x: e.clientX, y: e.clientY, tableId: table.id })
                }}
                onClick={e => {
                  if (readOnly) return
                  e.stopPropagation()
                  if (!draggingTable) {
                    origTableStateRef.current = { ...table }
                    setDraggingTable(table)
                    setDragPreviewPos({ x: table.x, y: table.y })
                    setSelectedTableId(table.id)
                    return
                  }
                  setSelectedTableId(table.id)
                }}
                onTouchStart={e => {
                  if (readOnly) return
                  e.stopPropagation()
                  origTableStateRef.current = { ...table }
                  setDraggingTable(table)
                  setDragPreviewPos({ x: table.x, y: table.y })
                  setSelectedTableId(table.id)
                }}
                style={{ gridColumn: `${table.x + 1} / span ${table.width}`, gridRow: `${table.y + 1} / span ${table.height}`, background: 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)', border: '2px solid #6366f1', borderRadius: '8px', pointerEvents: draggingTable && draggingTable.id === table.id ? 'none' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: readOnly ? 'default' : 'move', opacity: draggingTable && draggingTable.id === table.id ? 0.35 : 1, fontWeight: '600', fontSize: '14px', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,0.3)', transition: 'all 0.2s' }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.zIndex = '10'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.zIndex = '1'
                }}
                title={readOnly ? undefined : 'Tisch anklicken und R zum Rotieren; Rechtsklick öffnet Menü'}
              >
                {(() => {
                  const match = table.id.match(/(\d+)$/)
                  const num = match ? match[1] : table.id
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
          {isMobile && showScrollButtons && (
            <>
              <button aria-label="Links" onClick={() => scrollGridBy(-scrollAmount)} style={{ position: 'absolute', left: (scrollData.scrollLeft + 8) + 'px', top: '50%', transform: 'translateY(-50%)', zIndex: 1002, background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: 999, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', cursor: 'pointer' }}>◀</button>
              <button aria-label="Rechts" onClick={() => scrollGridBy(scrollAmount)} style={{ position: 'absolute', left: (scrollData.scrollLeft + scrollData.clientWidth - 48) + 'px', top: '50%', transform: 'translateY(-50%)', zIndex: 1002, background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: 999, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', cursor: 'pointer' }}>▶</button>
            </>
          )}
        </div>
      </div>

      {contextMenu && !readOnly && (
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: 'white', border: '1px solid #cbd5e1', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', borderRadius: 8, zIndex: 2000, minWidth: 180 }} onMouseLeave={() => setContextMenu(null)}>
          <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>🪑 {contextMenu.tableId}</div>
          <button onClick={() => {
            const id = contextMenu.tableId
            const num = (id.match(/(\d+)$/) || [])[1] || ''
            setRenameModal({ tableId: id, newId: num })
            setContextMenu(null)
          }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>✏️ Tischnummer ändern</button>
          <button onClick={() => {
            const current = tables.find(t => t.id === contextMenu.tableId)
            setSizeModal({ tableId: contextMenu.tableId, capacity: String(current?.capacity ?? 4) })
            setContextMenu(null)
          }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>📏 Größe ändern</button>
          <button onClick={() => {
            setTables(prev => {
              pushUndo(prev)
              return prev.filter(t => t.id !== contextMenu.tableId)
            })
            setContextMenu(null)
            if (selectedTableId === contextMenu.tableId) setSelectedTableId(null)
          }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444' }}>🗑️ Tisch löschen</button>
        </div>
      )}

      {renameModal && !readOnly && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2150 }} onClick={() => setRenameModal(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, minWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>✏️ Tischnummer ändern – {renameModal.tableId}</h3>
            <label style={{ display: 'block', fontSize: 13, color: '#334155', fontWeight: 600, marginBottom: 6 }}>Neue Tischnummer</label>
            <input type="text" value={renameModal.newId} onChange={e => {
              const value = e.target.value
              const full = /^\d+$/.test(value) ? `T${value}` : value
              const collision = tables.some(t => t.id === full && t.id !== renameModal.tableId)
              setRenameModal({ ...renameModal, newId: value, error: undefined, warning: collision ? 'Tischnummer bereits vergeben — der andere Tisch erhält eine neue Nummer' : undefined })
            }} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
            {renameModal.error && <div style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>{renameModal.error}</div>}
            {renameModal.warning && <div style={{ color: '#b45309', marginTop: 8, fontSize: 13 }}>{renameModal.warning}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setRenameModal(null)} style={{ flex: 1, padding: '10px 14px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={() => {
                const raw = renameModal.newId.trim()
                if (!raw) {
                  setRenameModal({ ...renameModal, error: 'Tischnummer darf nicht leer sein' })
                  return
                }
                const newId = /^\d+$/.test(raw) ? `T${raw}` : raw
                const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const existing = tables.find(t => t.id === newId && t.id !== renameModal.tableId)
                if (existing) {
                  const match = existing.id.match(/^(.*?)(\d+)$/)
                  const prefix = match ? match[1] : 'T'
                  const nums = tables
                    .map(t => {
                      const currentMatch = t.id.match(new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`))
                      return currentMatch ? parseInt(currentMatch[1], 10) : null
                    })
                    .filter((num): num is number => num !== null)
                  const maxNum = nums.length ? Math.max(...nums) : 0
                  let candidate = `${prefix}${maxNum + 1}`
                  while (tables.some(t => t.id === candidate)) {
                    const candidateNum = parseInt(candidate.replace(/[^0-9]/g, ''), 10) || maxNum + 1
                    candidate = `${prefix}${candidateNum + 1}`
                  }
                  const otherOldId = existing.id
                  const otherNewId = candidate
                  pushUndo(tables)
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
                pushUndo(tables)
                setTables(prev => prev.map(t => (t.id === renameModal.tableId ? { ...t, id: newId } : t)))
                if (selectedTableId === renameModal.tableId) setSelectedTableId(newId)
                setRenameModal(null)
              }} disabled={!renameModal.newId || renameModal.newId.trim() === ''} style={{ flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {sizeModal && !readOnly && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }} onClick={() => setSizeModal(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, minWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>📏 Größe ändern – {sizeModal.tableId}</h3>
            <label style={{ display: 'block', fontSize: 13, color: '#334155', fontWeight: 600, marginBottom: 6 }}>Personenzahl</label>
            <input type="number" value={sizeModal.capacity} onChange={e => setSizeModal({ ...sizeModal, capacity: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setSizeModal(null)} style={{ flex: 1, padding: '10px 14px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={() => {
                const cap = Math.max(1, parseInt(sizeModal.capacity || '4', 10))
                pushUndo(tables)
                setTables(prev => prev.map(t => (t.id === sizeModal.tableId ? { ...t, capacity: cap, width: Math.ceil(cap / 2), height: 2 } : t)))
                setSizeModal(null)
              }} style={{ flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {saveToast && <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', background: '#22c55e', color: 'white', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14, fontWeight: 500, zIndex: 3000 }}>{saveToast}</div>}
    </div>
  )
})

export default EventRoomEditor
