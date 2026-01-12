import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

type Table = {
  id: string
  x: number
  y: number
  capacity: number
  width: number
  height: number
}

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
  const gridRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const gridSize = 20
  const cellSize = 40

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
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
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
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
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
            {tables.map(table => (
              <div
                key={table.id}
                draggable
                data-table="true"
                onDragStart={e => handleDragStart(e, table.id)}
                onContextMenu={e => {
                  e.preventDefault()
                  setTables(tables.map(t => t.id === table.id ? { ...t, width: t.height, height: t.width } : t))
                }}
                style={{
                  gridColumn: `${table.x + 1} / span ${table.width}`,
                  gridRow: `${table.y + 1} / span ${table.height}`,
                  background: 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)',
                  border: '2px solid #6366f1',
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
                title="Rechtsklick zum Rotieren"
              >
                {table.id} ({table.capacity})
              </div>
            ))}
          </div>
        </div>
      </div>

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