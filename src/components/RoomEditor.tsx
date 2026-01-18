import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Table } from '../types/room'

type ViewFrame = { x: number; y: number; width: number; height: number }

export default function RoomEditor() {
  const [tables, setTables] = useState<Table[]>([])
  const [nextId, setNextId] = useState(1)
  const [capacityInput, setCapacityInput] = useState('4')
  const [roomName, setRoomName] = useState('Neuer Raum')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveRoomName, setSaveRoomName] = useState('Neuer Raum')
  const [isEditingExisting, setIsEditingExisting] = useState(false)
  const [viewFrame, setViewFrame] = useState<ViewFrame | null>(null)
  const [frameDragStart, setFrameDragStart] = useState<{ x: number; y: number } | null>(null)
  const [defineViewMode, setDefineViewMode] = useState(false)
  const [showHelp, setShowHelp] = useState(true)
  const [draggingTable, setDraggingTable] = useState<Table | null>(null)
  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId: string } | null>(null)
  const [sizeModal, setSizeModal] = useState<{ tableId: string; capacity: string } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const gridSize = 20
  const cellSize = 40

  // Keyboard: rotate selected table with 'R', delete with 'Delete'
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedTableId) return
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setTables(prev => prev.map(t => {
          if (t.id === selectedTableId) {
            return { ...t, rotation: ((t.rotation ?? 0) + 1) % 4 }
          }
          return t
        }))
      } else if (e.key === 'Delete') {
        e.preventDefault()
        setTables(prev => prev.filter(t => t.id !== selectedTableId))
        setSelectedTableId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedTableId])

  useEffect(() => {
    const currentRoom = localStorage.getItem('currentRoom')
    if (currentRoom) {
      try {
        const room = JSON.parse(currentRoom)
        if (room.tables && room.tables.length > 0) {
          setTables(room.tables)
          const maxId = Math.max(...room.tables.map((t: Table) => parseInt(t.id.slice(1), 10) || 0))
          setNextId(maxId + 1)
          setIsEditingExisting(true)
          setRoomName('Bearbeiteter Raum')
          setSaveRoomName('Bearbeiteter Raum')
          if (room.viewFrame) {
            setViewFrame(room.viewFrame)
          }
        }
      } catch (e) {
        console.error('Fehler beim Laden des Raums', e)
      }
    }
  }, [])

  function addTable() {
    const capacity = parseInt(capacityInput) || 4
    const width = Math.ceil(capacity / 2)
    const height = 2
    const newTable: Table = {
      id: `T${nextId}`,
      x: Math.floor(Math.random() * (gridSize - width)),
      y: Math.floor(Math.random() * (gridSize - height)),
      capacity,
      width,
      height
    }
    setTables([...tables, newTable])
    setNextId(nextId + 1)
  }

  function handleDragStart(e: React.DragEvent, tableId: string) {
    e.dataTransfer.setData('text/plain', tableId)
    const table = tables.find(t => t.id === tableId)
    if (table) setDraggingTable(table)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const tableId = e.dataTransfer.getData('text/plain')
    const table = tables.find(t => t.id === tableId)
    if (!table) return
    const rect = gridRef.current!.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / cellSize)
    const y = Math.floor((e.clientY - rect.top) / cellSize)
    setTables(tables.map(t => t.id === tableId ? { ...t, x: Math.max(0, Math.min(gridSize - t.width, x)), y: Math.max(0, Math.min(gridSize - t.height, y)) } : t))
    setDraggingTable(null)
    setDragPreviewPos(null)
  }

  // Rotate table with 'R' while dragging
  useEffect(() => {
    if (!draggingTable) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setTables(prev => prev.map(t => t.id === draggingTable.id ? { ...t, width: t.height, height: t.width } : t))
        setDraggingTable(prev => prev ? { ...prev, width: prev.height, height: prev.width } : prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [draggingTable])

  function updateDragPreview(e: React.DragEvent | React.MouseEvent) {
    if (!draggingTable || !gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / cellSize)
    const y = Math.floor((e.clientY - rect.top) / cellSize)
    const clampedX = Math.max(0, Math.min(gridSize - draggingTable.width, x))
    const clampedY = Math.max(0, Math.min(gridSize - draggingTable.height, y))
    setDragPreviewPos({ x: clampedX, y: clampedY })
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    updateDragPreview(e)
  }

  function confirmSaveRoom(name: string) {
    const room = { tables, viewFrame: viewFrame || undefined }
    localStorage.setItem('currentRoom', JSON.stringify(room))
    const list = JSON.parse(localStorage.getItem('rooms') || '[]')
    const entry = { id: `r-${Date.now()}`, name: name || `Raum ${list.length + 1}`, createdAt: new Date().toLocaleDateString(), data: room }
    localStorage.setItem('rooms', JSON.stringify([...list, entry]))
    setShowSaveModal(false)
    navigate('/room')
  }

  function eventToCell(e: MouseEvent | React.MouseEvent): { x: number; y: number } | null {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    const x = Math.floor(((e as any).clientX - rect.left) / cellSize)
    const y = Math.floor(((e as any).clientY - rect.top) / cellSize)
    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return null
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

  return (
    <div style={{ 
      height: '100%', 
      background: '#f8fafc', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '16px 24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button 
          onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        >←</button>
        <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '600', color: 'white' }}>🏗️ {isEditingExisting ? 'Raum bearbeiten' : 'Raum anlegen'}</h1>
      </div>
      
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
          <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Personenzahl pro Tisch</label>
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
          <button
            onClick={() => { setSaveRoomName(roomName); setShowSaveModal(true); }}
            disabled={tables.length === 0}
            style={{ padding: '12px 16px', background: tables.length === 0 ? '#e2e8f0' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: tables.length === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 700, opacity: tables.length === 0 ? 0.6 : 1 }}
          >💾 Speichern</button>
          
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
                <div>• Tisch verschieben: Ziehen mit Maus</div>
                <div>• Tisch drehen: Taste <strong>R</strong> (Tisch vorher anklicken)</div>
                <div>• Rechtsklick: Kontextmenü zum <strong>Größe ändern</strong> oder <strong>Löschen</strong></div>
                <div style={{ marginTop: '6px' }}><strong>Tablet/Phone:</strong></div>
                <div>• Tisch verschieben: Ziehen mit Finger</div>
                <div>• Tisch drehen: <strong>Länger gedrückt halten</strong> (0.5s)</div>
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
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              width: gridSize * cellSize + 'px',
              height: gridSize * cellSize + 'px',
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
                draggable
                data-table="true"
                onDragStart={e => handleDragStart(e, table.id)}
                onContextMenu={e => {
                  e.preventDefault()
                  setSelectedTableId(table.id)
                  setContextMenu({ x: e.clientX, y: e.clientY, tableId: table.id })
                }}
                onClick={() => setSelectedTableId(table.id)}
                style={{
                  gridColumn: `${table.x + 1} / span ${table.width}`,
                  gridRow: `${table.y + 1} / span ${table.height}`,
                  background: 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)',
                  border: selectedTableId === table.id ? '3px solid #22c55e' : '2px solid #6366f1',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'move',
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
                {table.id} ({table.capacity})
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
          <button onClick={() => { setTables(prev => prev.map(t => t.id === contextMenu.tableId ? { ...t, width: t.height, height: t.width } : t)); setContextMenu(null) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            🔄 Rotieren (R)
          </button>
          <button onClick={() => { const t = tables.find(t => t.id === contextMenu.tableId); setSizeModal({ tableId: contextMenu.tableId, capacity: String(t?.capacity ?? 4) }); setContextMenu(null) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            📏 Größe ändern
          </button>
          <button onClick={() => { setTables(prev => prev.filter(t => t.id !== contextMenu.tableId)); setContextMenu(null); if (selectedTableId === contextMenu.tableId) setSelectedTableId(null) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'white', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444' }}>
            🗑️ Tisch löschen
          </button>
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
                style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(102,126,234,0.3)', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >Speichern</button>
              <button 
                onClick={() => setShowSaveModal(false)}
                style={{ padding: '12px 24px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'white'; }}
              >Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}