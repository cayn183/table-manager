import React, { useState, useEffect, useMemo } from 'react'
import Importer, { Group } from './Importer'
import { bestFitAssign } from '../utils/placement'

type Table = {
  id: string
  x: number
  y: number
  capacity: number
  width: number
  height: number
}

type Room = {
  tables: Table[]
}

type AssignedGroup = {
  group: Group
  rotation: number
  locked: boolean
  x: number
  y: number
}

export default function Room() {
  const [room, setRoom] = useState<Room | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [assignedGroups, setAssignedGroups] = useState<Record<string, AssignedGroup[]>>({})
  const [showModal, setShowModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupSize, setNewGroupSize] = useState('4')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId: string; agIdx: number; isList: boolean; listIdx?: number; isAssignedList?: boolean } | null>(null)
  const [editModal, setEditModal] = useState<{ tableId: string; agIdx: number; isList: boolean; listIdx?: number } | null>(null)
  const [tableSelectModal, setTableSelectModal] = useState<{ group: Group; index: number } | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<{ tableId: string; x: number; y: number } | null>(null)
  const [draggingGroup, setDraggingGroup] = useState<{ group: Group; rotation: number } | null>(null)
  const [previewRotation, setPreviewRotation] = useState<number>(0)
  const [editName, setEditName] = useState('')
  const [editSize, setEditSize] = useState('')

  // Function to generate a random color with 30% opacity
  function getRandomColor() {
    const hue = Math.floor(Math.random() * 360)
    return `hsla(${hue}, 80%, 50%, 0.3)`
  }

  // Assign colors to groups, ensuring adjacent families have different colors
  const groupColors = useMemo(() => {
    const colors: Record<string, string> = {}
    groups.forEach(g => {
      colors[g.name] = getRandomColor()
    })
    // For assigned groups, assign colors if not already
    Object.values(assignedGroups).forEach(ags => {
      ags.forEach(ag => {
        if (!colors[ag.group.name]) {
          colors[ag.group.name] = getRandomColor()
        }
      })
    })
    return colors
  }, [groups, assignedGroups])

  // Function to check if a position is valid for a group in a table
  function isValidPosition(table: Table, group: Group, rotation: number, x: number, y: number, assignedGroups: Record<string, AssignedGroup[]>, skipAg?: AssignedGroup): boolean {
    const positions = getPositionsForSize(group.size, rotation)
    for (const pos of positions) {
      const absX = table.x + x + pos.x
      const absY = table.y + y + pos.y
      // Check within table bounds
      if (absX < table.x || absX >= table.x + table.width || absY < table.y || absY >= table.y + table.height) {
        return false
      }
      // Check no overlap with other groups
      for (const ag of assignedGroups[table.id] || []) {
        if (ag === skipAg) continue
        const agPositions = getPositionsForSize(ag.group.size, ag.rotation)
        for (const agPos of agPositions) {
          if (absX === table.x + ag.x + agPos.x && absY === table.y + ag.y + agPos.y) {
            return false
          }
        }
      }
    }
    return true
  }

  function getPositionsForSize(size: number, rotation: number): { x: number; y: number }[] {
    let positions: { x: number; y: number }[] = []
    if (size === 1) {
      positions = [{ x: 0, y: 0 }]
    } else if (size === 2) {
      positions = [{ x: 0, y: 0 }, { x: 0, y: 1 }] // 1x2
    } else if (size === 3) {
      positions = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }] // L
    } else if (size === 4) {
      positions = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] // 2x2
    } else {
      // For larger, fill in rows
      const cols = Math.ceil(Math.sqrt(size))
      for (let i = 0; i < size; i++) {
        positions.push({ x: i % cols, y: Math.floor(i / cols) })
      }
    }
    // Rotate
    const rotated = positions.map(pos => {
      switch (rotation % 4) {
        case 1: return { x: pos.y, y: -pos.x } // 90 deg
        case 2: return { x: -pos.x, y: -pos.y } // 180 deg
        case 3: return { x: -pos.y, y: pos.x } // 270 deg
        default: return pos
      }
    })
    // Shift to positive
    const minX = Math.min(...rotated.map(p => p.x))
    const minY = Math.min(...rotated.map(p => p.y))
    return rotated.map(p => ({ x: p.x - minX, y: p.y - minY }))
  }

  useEffect(() => {
    if (draggingGroup) {
      const handleMouseMove = (e: MouseEvent) => {
        const gridElement = document.querySelector('.grid') as HTMLElement
        if (!gridElement || !room) return
        const rect = gridElement.getBoundingClientRect()
        const x = Math.floor((e.clientX - rect.left) / cellSize)
        const y = Math.floor((e.clientY - rect.top) / cellSize)
        const table = room.tables.find(t => x >= t.x && x < t.x + t.width && y >= t.y && y < t.y + t.height)
        if (table) {
          const relX = x - table.x
          const relY = y - table.y
          // Find best rotation, preferring current
          let bestRotation = draggingGroup.rotation
          if (!isValidPosition(table, draggingGroup.group, bestRotation, relX, relY, assignedGroups)) {
            for (let rot = 1; rot < 4; rot++) {
              const r = (draggingGroup.rotation + rot) % 4
              if (isValidPosition(table, draggingGroup.group, r, relX, relY, assignedGroups)) {
                bestRotation = r
                break
              }
            }
          }
          setPreviewRotation(bestRotation)
          setDragOverPosition({ tableId: table.id, x: relX, y: relY })
        } else {
          setDragOverPosition(null)
        }
      }
      document.addEventListener('mousemove', handleMouseMove)
      return () => document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [draggingGroup, room, assignedGroups, cellSize])

  function handleImport(parsed: Group[]) {
    setGroups([...groups, ...parsed])
  }

  function addGroup() {
    const size = parseInt(newGroupSize) || 0
    if (size > 0) {
      const name = newGroupName || `Familie ${groups.length + 1}`
      setGroups([...groups, { name, size }])
      setNewGroupName('')
      setNewGroupSize('4')
      setShowModal(false)
    }
  }

  function autoAssign() {
    if (!room) return
    const result = bestFitAssign(room.tables, groups)
    const newAssigned: Record<string, AssignedGroup[]> = {}
    for (const table of room.tables) {
      newAssigned[table.id] = (result[table.id] || []).map(g => ({ group: g, rotation: 0, locked: false, x: 0, y: 0 }))
    }
    setAssignedGroups(newAssigned)
    setGroups([])
  }

  if (!room) return <div>Lade Raum...</div>

  const gridSize = 20
  const cellSize = 40

  return (
    <div className="container">
      <h1>Raum - Plätze belegen</h1>
      <div className="room-content">
        <div className="sidebar">
          <button onClick={() => setShowModal(true)}>Familie anlegen</button>
          <div className="controls">
            <button onClick={autoAssign} disabled={groups.length === 0}>
              Auto Assign (Best-Fit)
            </button>
          </div>
          <h3>Verfügbare Familien ({groups.length})</h3>
          <div className="groups-list">
            {groups.map((g, i) => (
              <div
                key={i}
                className="group-item"
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ index: i, ...g }))
                  setDraggingGroup({ group: g, rotation: 0 })
                }}
                onContextMenu={e => {
                  e.preventDefault()
                  setContextMenu({ x: e.clientX, y: e.clientY, tableId: '', agIdx: -1, isList: true, listIdx: i })
                }}
              >
                {g.name} — {g.size}
              </div>
            ))}
          </div>
          <h3>Zugewiesene Familien</h3>
          <div className="assigned-list">
            {Object.entries(assignedGroups).map(([tableId, ags]) =>
              ags.map((ag, idx) => (
                <div
                  key={`${tableId}-${idx}`}
                  className="assigned-item"
                  onContextMenu={e => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, tableId, agIdx: idx, isList: false, isAssignedList: true })
                  }}
                >
                  {ag.group.name} ({ag.group.size}) - Tisch {tableId.slice(1)}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="room-layout">
          <div
            className="grid"
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
            onDrop={e => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const x = Math.floor((e.clientX - rect.left) / cellSize)
              const y = Math.floor((e.clientY - rect.top) / cellSize)
              // Find which table this position is in
              const table = room.tables.find(t => x >= t.x && x < t.x + t.width && y >= t.y && y < t.y + t.height)
              if (!table) return
              const relX = x - table.x
              const relY = y - table.y
              const data = JSON.parse(e.dataTransfer.getData('text/plain'))
              if (data.tableId) {
                // Moving existing group
                const fromTable = data.tableId
                const agIdx = data.agIdx
                const ag = assignedGroups[fromTable][agIdx]
                if (fromTable === table.id) {
                  // Same table, just move position and rotation
                  if (isValidPosition(table, ag.group, previewRotation, relX, relY, assignedGroups, ag)) {
                    setAssignedGroups({
                      ...assignedGroups,
                      [table.id]: assignedGroups[table.id].map(a => a === ag ? { ...a, x: relX, y: relY, rotation: previewRotation } : a)
                    })
                  }
                } else {
                  // Different table
                  const newFrom = assignedGroups[fromTable].filter((_, i) => i !== agIdx)
                  const current = assignedGroups[table.id] || []
                  const totalOccupied = current.reduce((sum, a) => sum + a.group.size, 0) + ag.group.size
                  if (totalOccupied <= table.capacity && isValidPosition(table, ag.group, previewRotation, relX, relY, assignedGroups)) {
                    setAssignedGroups({
                      ...assignedGroups,
                      [fromTable]: newFrom,
                      [table.id]: [...current, { ...ag, x: relX, y: relY, rotation: previewRotation }]
                    })
                  }
                }
              } else {
                // New group from list
                const group = { name: data.name, size: data.size }
                const current = assignedGroups[table.id] || []
                const totalOccupied = current.reduce((sum, a) => sum + a.group.size, 0) + group.size
                if (totalOccupied <= table.capacity && isValidPosition(table, group, previewRotation, relX, relY, assignedGroups)) {
                  setAssignedGroups({
                    ...assignedGroups,
                    [table.id]: [...current, { group, rotation: previewRotation, locked: false, x: relX, y: relY }]
                  })
                  setGroups(groups.filter((_, idx) => idx !== data.index))
                }
              }
              setDragOverPosition(null)
              setDraggingGroup(null)
              setPreviewRotation(0)
            }}
            onDragOver={e => {
              e.preventDefault()
            }}
            onDragLeave={() => {
              setDragOverPosition(null)
              setDraggingGroup(null)
              setPreviewRotation(0)
            }}
          >
            {room.tables.map(table => {
              const ags = assignedGroups[table.id] || []
              const occupied = ags.reduce((sum, ag) => sum + ag.group.size, 0)
              return (
                <div
                  key={table.id}
                  style={{
                    gridColumn: `${table.x + 1} / span ${table.width}`,
                    gridRow: `${table.y + 1} / span ${table.height}`,
                    background: 'lightblue',
                    border: '1px solid blue',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    backgroundImage: `
                      linear-gradient(to right, rgba(0,0,255,0.2) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0,0,255,0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: `${cellSize}px ${cellSize}px`
                  }}
                >
                  <div style={{ fontSize: '12px', position: 'absolute', top: '2px', left: '2px' }}>
                    Tisch {table.id.slice(1)} - {occupied}/{table.capacity}
                  </div>
                </div>
              )
            })}
            {/* Render all assigned groups directly on the grid */}
            {Object.entries(assignedGroups).map(([tableId, ags]) =>
              ags.map((ag, idx) => {
                const table = room.tables.find(t => t.id === tableId)
                if (!table) return null
                const positions = getPositionsForSize(ag.group.size, ag.rotation)
                return positions.map((pos, pidx) => (
                  <div
                    key={`${tableId}-${idx}-${pidx}`}
                    draggable={!ag.locked}
                    onDragStart={e => {
                      if (!ag.locked) {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ tableId, agIdx: idx, ...ag.group }))
                        setDraggingGroup({ group: ag.group, rotation: ag.rotation })
                      }
                    }}
                    onContextMenu={e => {
                      e.preventDefault()
                      setContextMenu({ x: e.clientX, y: e.clientY, tableId, agIdx: idx, isList: false })
                    }}
                    style={{
                      gridColumn: (table.x + ag.x + pos.x + 1),
                      gridRow: (table.y + ag.y + pos.y + 1),
                      background: groupColors[ag.group.name] || 'orange',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      cursor: ag.locked ? 'default' : 'move',
                      zIndex: 10
                    }}
                    onDoubleClick={() => {
                      setAssignedGroups({
                        ...assignedGroups,
                        [tableId]: ags.map(a => a === ag ? { ...a, locked: !a.locked } : a)
                      })
                    }}
                  >
                    {pidx === 0 ? (ag.locked ? '🔒' : '') + ag.group.name : ''}
                  </div>
                ))
              })
            )}
            {dragOverPosition && draggingGroup && (
              (() => {
                const table = room.tables.find(t => t.id === dragOverPosition.tableId)
                if (!table) return null
                const positions = getPositionsForSize(draggingGroup.group.size, previewRotation)
                return positions.map((pos, pidx) => (
                  <div
                    key={`preview-${pidx}`}
                    style={{
                      gridColumn: (table.x + dragOverPosition.x + pos.x + 1),
                      gridRow: (table.y + dragOverPosition.y + pos.y + 1),
                      background: 'rgba(0,255,0,0.5)',
                      border: '2px dashed green',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      pointerEvents: 'none',
                      zIndex: 5
                    }}
                  >
                    {pidx === 0 ? 'Vorschau' : ''}
                  </div>
                ))
              })()
            )}
          </div>
        </div>
      </div>
      {contextMenu && (
        <div
          className="context-menu"
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: 'white', border: '1px solid black', zIndex: 1000 }}
          onClick={() => setContextMenu(null)}
        >
          {contextMenu.isList ? (
            <>
              <div onClick={() => {
                const group = groups[contextMenu.listIdx!]
                setTableSelectModal({ group, index: contextMenu.listIdx! })
                setContextMenu(null)
              }}>Zuweisen</div>
              <div onClick={() => {
                setEditModal({ tableId: '', agIdx: -1, isList: true, listIdx: contextMenu.listIdx })
                setEditName(groups[contextMenu.listIdx!].name)
                setEditSize(groups[contextMenu.listIdx!].size.toString())
                setContextMenu(null)
              }}>Bearbeiten</div>
              <div onClick={() => {
                setGroups(groups.filter((_, i) => i !== contextMenu.listIdx))
                setContextMenu(null)
              }}>Löschen</div>
            </>
          ) : contextMenu.isAssignedList ? (
            <>
              <div onClick={() => {
                const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                setGroups([...groups, ag.group])
                setAssignedGroups({
                  ...assignedGroups,
                  [contextMenu.tableId]: assignedGroups[contextMenu.tableId].filter((_, i) => i !== contextMenu.agIdx)
                })
                setContextMenu(null)
              }}>Entfernen</div>
              <div onClick={() => {
                setEditModal({ tableId: contextMenu.tableId, agIdx: contextMenu.agIdx, isList: false })
                const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                setEditName(ag.group.name)
                setEditSize(ag.group.size.toString())
                setContextMenu(null)
              }}>Bearbeiten</div>
              <div onClick={() => {
                setAssignedGroups({
                  ...assignedGroups,
                  [contextMenu.tableId]: assignedGroups[contextMenu.tableId].filter((_, i) => i !== contextMenu.agIdx)
                })
                setContextMenu(null)
              }}>Löschen</div>
            </>
          ) : (
            <>
              <div onClick={() => {
                const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                setGroups([...groups, ag.group])
                setAssignedGroups({
                  ...assignedGroups,
                  [contextMenu.tableId]: assignedGroups[contextMenu.tableId].filter((_, i) => i !== contextMenu.agIdx)
                })
                setContextMenu(null)
              }}>Zuweisen / Entfernen</div>
              <div onClick={() => {
                const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                setAssignedGroups({
                  ...assignedGroups,
                  [contextMenu.tableId]: assignedGroups[contextMenu.tableId].map(a => a === ag ? { ...a, locked: !a.locked } : a)
                })
                setContextMenu(null)
              }}>Sperren / Entsperren</div>
              <div onClick={() => {
                const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                setAssignedGroups({
                  ...assignedGroups,
                  [contextMenu.tableId]: assignedGroups[contextMenu.tableId].map(a => a === ag ? { ...a, rotation: (a.rotation + 1) % 4 } : a)
                })
                setContextMenu(null)
              }}>Rotieren</div>
              <div onClick={() => {
                setEditModal({ tableId: contextMenu.tableId, agIdx: contextMenu.agIdx, isList: false })
                const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                setEditName(ag.group.name)
                setEditSize(ag.group.size.toString())
                setContextMenu(null)
              }}>Bearbeiten</div>
              <div onClick={() => {
                setAssignedGroups({
                  ...assignedGroups,
                  [contextMenu.tableId]: assignedGroups[contextMenu.tableId].filter((_, i) => i !== contextMenu.agIdx)
                })
                setContextMenu(null)
              }}>Löschen</div>
            </>
          )}
        </div>
      )}
      {tableSelectModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Tisch auswählen für {tableSelectModal.group.name}</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {room?.tables.map(table => (
                <div key={table.id} onClick={() => {
                  setAssignedGroups({
                    ...assignedGroups,
                    [table.id]: [...(assignedGroups[table.id] || []), { group: tableSelectModal.group, rotation: 0, locked: false, x: 0, y: 0 }]
                  })
                  setGroups(groups.filter((_, i) => i !== tableSelectModal.index))
                  setTableSelectModal(null)
                }} style={{ padding: '10px', border: '1px solid #ccc', margin: '5px', cursor: 'pointer' }}>
                  Tisch {table.id} (Kapazität: {table.capacity})
                </div>
              ))}
            </div>
            <button onClick={() => setTableSelectModal(null)}>Abbrechen</button>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Familie anlegen</h3>
            <input
              type="text"
              placeholder="Name (optional)"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Anzahl Personen"
              value={newGroupSize}
              onChange={e => setNewGroupSize(e.target.value)}
            />
            <button onClick={addGroup}>Hinzufügen</button>
            <button onClick={() => setShowModal(false)}>Abbrechen</button>
          </div>
        </div>
      )}
      {editModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Bearbeiten</h3>
            <input
              type="text"
              placeholder="Name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Anzahl Personen"
              value={editSize}
              onChange={e => setEditSize(e.target.value)}
            />
            <button onClick={() => {
              const size = parseInt(editSize) || 1
              if (editModal.isList) {
                setGroups(groups.map((g, i) => i === editModal.listIdx ? { name: editName || `Familie ${i + 1}`, size } : g))
              } else {
                setAssignedGroups({
                  ...assignedGroups,
                  [editModal.tableId]: assignedGroups[editModal.tableId].map((ag, i) => i === editModal.agIdx ? { ...ag, group: { ...ag.group, name: editName || ag.group.name, size } } : ag)
                })
              }
              setEditModal(null)
            }}>Speichern</button>
            <button onClick={() => setEditModal(null)}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  )
}