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

export default function RoomEditor() {
  const [tables, setTables] = useState<Table[]>([])
  const [nextId, setNextId] = useState(1)
  const [capacityInput, setCapacityInput] = useState('4')
  const [roomName, setRoomName] = useState('Neuer Raum')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveRoomName, setSaveRoomName] = useState('Neuer Raum')
  const [isEditingExisting, setIsEditingExisting] = useState(false)
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
    const room = { tables }
    localStorage.setItem('currentRoom', JSON.stringify(room))
    const list = JSON.parse(localStorage.getItem('rooms') || '[]')
    const entry = { id: `r-${Date.now()}`, name: name || `Raum ${list.length + 1}`, createdAt: new Date().toLocaleDateString(), data: room }
    localStorage.setItem('rooms', JSON.stringify([...list, entry]))
    setShowSaveModal(false)
    navigate('/room')
  }

  return (
    <div className="container">
      <h1>{isEditingExisting ? 'Raum bearbeiten' : 'Raum anlegen'}</h1>
      <div className="editor-controls">
        <input
          type="text"
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          placeholder="Raumname"
          style={{ width: 240 }}
        />
        <input
          type="number"
          value={capacityInput}
          onChange={e => setCapacityInput(e.target.value)}
          placeholder="Plätze"
        />
        <button onClick={addTable}>Tisch anlegen</button>
        <button onClick={() => { setSaveRoomName(roomName); setShowSaveModal(true); }} disabled={tables.length === 0}>Speichern</button>
      </div>
      <div
        className="grid"
        ref={gridRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
          border: '1px solid #ccc',
          width: gridSize * cellSize + 'px',
          height: gridSize * cellSize + 'px',
          position: 'relative',
          backgroundImage: `
            linear-gradient(to right, #ddd 1px, transparent 1px),
            linear-gradient(to bottom, #ddd 1px, transparent 1px)
          `,
          backgroundSize: `${cellSize}px ${cellSize}px`
        }}
      >
        {tables.map(table => (
          <div
            key={table.id}
            draggable
            onDragStart={e => handleDragStart(e, table.id)}
            onContextMenu={e => {
              e.preventDefault()
              // Rotate table
              setTables(tables.map(t => t.id === table.id ? { ...t, width: t.height, height: t.width } : t))
            }}
            style={{
              gridColumn: `${table.x + 1} / span ${table.width}`,
              gridRow: `${table.y + 1} / span ${table.height}`,
              background: 'lightblue',
              border: '1px solid blue',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'move'
            }}
            title="Rechtsklick zum Rotieren"
          >
            {table.id} ({table.capacity})
          </div>
        ))}
      </div>

      {showSaveModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 360 }}>
            <h3>Raum speichern</h3>
            <input
              type="text"
              value={saveRoomName}
              onChange={e => setSaveRoomName(e.target.value)}
              placeholder="Raumname"
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => confirmSaveRoom(saveRoomName)}>Speichern</button>
              <button onClick={() => setShowSaveModal(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}