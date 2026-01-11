import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  color: string
}

type DraggingMeta = { tableId?: string; agIdx?: number } | null

const GRID_SIZE = 20
const CELL_SIZE = 40
const STORAGE_KEY = 'currentRoom'
const PALETTE = ['#E91E63', '#FF9800', '#4CAF50', '#673AB7', '#FF5722']
const UNASSIGNED_COLOR = '#80808080'

function paletteColor(hex: string): string {
  return hex + '70'
}

function getPositionsForSize(size: number, rotation: number): { x: number; y: number }[] {
  let positions: { x: number; y: number }[] = []
  if (size === 1) {
    positions = [{ x: 0, y: 0 }]
  } else if (size === 2) {
    positions = [{ x: 0, y: 0 }, { x: 0, y: 1 }]
  } else if (size === 3) {
    positions = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
  } else if (size === 4) {
    positions = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]
  } else {
    const cols = Math.ceil(Math.sqrt(size))
    for (let i = 0; i < size; i++) {
      positions.push({ x: i % cols, y: Math.floor(i / cols) })
    }
  }

  const rotated = positions.map(pos => {
    switch (rotation % 4) {
      case 1: return { x: pos.y, y: -pos.x }
      case 2: return { x: -pos.x, y: -pos.y }
      case 3: return { x: -pos.y, y: pos.x }
      default: return pos
    }
  })

  const minX = Math.min(...rotated.map(p => p.x))
  const minY = Math.min(...rotated.map(p => p.y))
  return rotated.map(p => ({ x: p.x - minX, y: p.y - minY }))
}

function isValidPosition(table: Table, group: Group, rotation: number, x: number, y: number, assignedGroups: Record<string, AssignedGroup[]>, skipAg?: AssignedGroup): boolean {
  const positions = getPositionsForSize(group.size, rotation)
  for (const pos of positions) {
    const absX = table.x + x + pos.x
    const absY = table.y + y + pos.y
    if (absX < table.x || absX >= table.x + table.width || absY < table.y || absY >= table.y + table.height) {
      return false
    }
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

function loadRoomFromStorage(): Room | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) as Room : null
  } catch (err) {
    console.error('Raum konnte nicht geladen werden', err)
    return null
  }
}

function getColorForGroup(ag: AssignedGroup, tableAssignments: AssignedGroup[], table: Table): string {
  const positions = getPositionsForSize(ag.group.size, ag.rotation)
  const agPositions = positions.map(p => ({ x: ag.x + p.x, y: ag.y + p.y }))

  const isAdjacent = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
    for (const pa of a) {
      for (const pb of b) {
        if (Math.abs(pa.x - pb.x) <= 1 && Math.abs(pa.y - pb.y) <= 1) {
          return true
        }
      }
    }
    return false
  }

  const bannedColors = new Set<string>()
  for (const other of tableAssignments) {
    if (other === ag) continue
    const otherPositions = getPositionsForSize(other.group.size, other.rotation)
    const otherAbsPositions = otherPositions.map(p => ({ x: other.x + p.x, y: other.y + p.y }))
    if (isAdjacent(agPositions, otherAbsPositions)) {
      bannedColors.add(other.color)
    }
  }

  const picked = PALETTE.find(c => !bannedColors.has(paletteColor(c))) || PALETTE[0]
  return paletteColor(picked)
}

export default function Room() {
  // State: source data
  const [room, setRoom] = useState<Room | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [assignedGroups, setAssignedGroups] = useState<Record<string, AssignedGroup[]>>({})

  // State: UI and interaction
  const [showModal, setShowModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupSize, setNewGroupSize] = useState('4')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId: string; agIdx: number; isList: boolean; listIdx?: number; isAssignedList?: boolean } | null>(null)
  const [editModal, setEditModal] = useState<{ tableId: string; agIdx: number; isList: boolean; listIdx?: number } | null>(null)
  const [resizeModal, setResizeModal] = useState<{ tableId: string; agIdx: number; maxSize: number } | null>(null)
  const [resizeValue, setResizeValue] = useState('1')
  const [tableSelectModal, setTableSelectModal] = useState<{ group: Group; index: number } | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<{ tableId: string; x: number; y: number } | null>(null)
  const [draggingGroup, setDraggingGroup] = useState<{ group: Group; rotation: number } | null>(null)
  const [draggingMeta, setDraggingMeta] = useState<DraggingMeta>(null)
  const [previewRotation, setPreviewRotation] = useState<number>(0)
  const [editName, setEditName] = useState('')
  const [editSize, setEditSize] = useState('')

  // Get colors by recalculating on each render based on current positions
  const assignedColors = useMemo(() => {
    const result: Record<string, string[]> = {}

    const isAdjacent = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
      for (const pa of a) {
        for (const pb of b) {
          if (Math.abs(pa.x - pb.x) <= 1 && Math.abs(pa.y - pb.y) <= 1) {
            return true
          }
        }
      }
      return false
    }

    Object.entries(assignedGroups).forEach(([tableId, ags]) => {
      const colors: string[] = new Array(ags.length)

      // Sortiere nach Index für konsistente Reihenfolge
      for (let i = 0; i < ags.length; i++) {
        const ag = ags[i]
        const positions = getPositionsForSize(ag.group.size, ag.rotation)
        const agPositions = positions.map(p => ({ x: ag.x + p.x, y: ag.y + p.y }))

        const banned = new Set<string>()
        for (let j = 0; j < ags.length; j++) {
          if (i === j) continue
          const other = ags[j]
          const otherPositions = getPositionsForSize(other.group.size, other.rotation)
          const otherAbsPositions = otherPositions.map(p => ({ x: other.x + p.x, y: other.y + p.y }))
          if (isAdjacent(agPositions, otherAbsPositions)) {
            if (colors[j]) banned.add(colors[j])
          }
        }

        const picked = PALETTE.find(c => !banned.has(paletteColor(c))) || PALETTE[0]
        colors[i] = paletteColor(picked)
      }

      result[tableId] = colors
    })

    return result
  }, [assignedGroups])

  // Initial load: room definition from localStorage
  useEffect(() => {
    const stored = loadRoomFromStorage()
    if (stored) {
      setRoom(stored)
    } else {
      setLoadError('Kein gespeicherter Raum gefunden. Bitte im Editor speichern und erneut öffnen.')
    }
  }, [])

  function updatePreviewPosition(coords: { clientX: number; clientY: number }) {
    if (!draggingGroup || !room) return
    const gridElement = document.querySelector('.grid') as HTMLElement
    if (!gridElement) return

    const rect = gridElement.getBoundingClientRect()
    const x = Math.floor((coords.clientX - rect.left) / CELL_SIZE)
    const y = Math.floor((coords.clientY - rect.top) / CELL_SIZE)
    const table = room.tables.find(t => x >= t.x && x < t.x + t.width && y >= t.y && y < t.y + t.height)
    if (!table) {
      setDragOverPosition(null)
      return
    }

    let relX = x - table.x
    let relY = y - table.y
    const skipAg = draggingMeta?.tableId ? assignedGroups[draggingMeta.tableId]?.[draggingMeta.agIdx ?? -1] : undefined

    // Versuche beste Rotation
    let bestRotation = draggingGroup.rotation
    if (!isValidPosition(table, draggingGroup.group, bestRotation, relX, relY, assignedGroups, skipAg)) {
      for (let rot = 1; rot < 4; rot++) {
        const candidate = (draggingGroup.rotation + rot) % 4
        if (isValidPosition(table, draggingGroup.group, candidate, relX, relY, assignedGroups, skipAg)) {
          bestRotation = candidate
          break
        }
      }
    }

    // Wenn immer noch nicht gültig, versuche Position zu cleuppen
    if (!isValidPosition(table, draggingGroup.group, bestRotation, relX, relY, assignedGroups, skipAg)) {
      const positions = getPositionsForSize(draggingGroup.group.size, bestRotation)
      const maxX = Math.max(...positions.map(p => p.x))
      const maxY = Math.max(...positions.map(p => p.y))
      
      relX = Math.min(relX, table.width - 1 - maxX)
      relY = Math.min(relY, table.height - 1 - maxY)
      relX = Math.max(relX, 0)
      relY = Math.max(relY, 0)
    }

    setPreviewRotation(bestRotation)
    setDragOverPosition({ tableId: table.id, x: relX, y: relY })
  }

  // Drag tracking for preview; skip collision against the item being moved.
  useEffect(() => {
    if (!draggingGroup) return

    const handleMouseMove = (e: MouseEvent) => {
      updatePreviewPosition({ clientX: e.clientX, clientY: e.clientY })
    }

    const handleGlobalDragOver = (e: DragEvent) => {
      updatePreviewPosition({ clientX: e.clientX, clientY: e.clientY })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('dragover', handleGlobalDragOver)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [draggingGroup, draggingMeta, room, assignedGroups])

  // Data actions
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
      newAssigned[table.id] = (result[table.id] || []).map(g => ({ group: g, rotation: 0, locked: false, x: 0, y: 0, color: PALETTE[0] }))
    }
    setAssignedGroups(newAssigned)
    setGroups([])
  }

  const preview = useMemo(() => {
    if (!room || !draggingGroup || !dragOverPosition) return null
    const table = room.tables.find(t => t.id === dragOverPosition.tableId)
    if (!table) return null
    const skipAg = draggingMeta?.tableId ? assignedGroups[draggingMeta.tableId]?.[draggingMeta.agIdx ?? -1] : undefined
    const positions = getPositionsForSize(draggingGroup.group.size, previewRotation)
    const valid = isValidPosition(table, draggingGroup.group, previewRotation, dragOverPosition.x, dragOverPosition.y, assignedGroups, skipAg)
    return { table, positions, valid }
  }, [room, draggingGroup, dragOverPosition, previewRotation, draggingMeta, assignedGroups])

  if (!room) {
    return (
      <div className="container">
        <h1>Raum - Plätze belegen</h1>
        <p>{loadError ?? 'Lade Raum...'}</p>
        <Link to="/new-room">
          <button>Zum Editor</button>
        </Link>
      </div>
    )
  }

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
                style={{ background: UNASSIGNED_COLOR, color: '#000' }}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ index: i, ...g }))
                  setDraggingGroup({ group: g, rotation: 0 })
                  setDraggingMeta(null)
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
                  style={{
                    background: assignedColors[tableId]?.[idx],
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    cursor: 'pointer'
                  }}
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
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              border: '1px solid #ccc',
              width: GRID_SIZE * CELL_SIZE + 'px',
              height: GRID_SIZE * CELL_SIZE + 'px',
              position: 'relative',
              backgroundImage: `
                linear-gradient(to right, #ddd 1px, transparent 1px),
                linear-gradient(to bottom, #ddd 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`
            }}
            onDrop={e => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const x = Math.floor((e.clientX - rect.left) / CELL_SIZE)
              const y = Math.floor((e.clientY - rect.top) / CELL_SIZE)
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
                    [table.id]: [...current, { group, rotation: previewRotation, locked: false, x: relX, y: relY, color: PALETTE[0] }]
                  })
                  setGroups(groups.filter((_, idx) => idx !== data.index))
                }
              }
              setDragOverPosition(null)
              setDraggingGroup(null)
              setDraggingMeta(null)
              setPreviewRotation(0)
            }}
            onDragOver={e => {
              e.preventDefault()
              updatePreviewPosition({ clientX: e.clientX, clientY: e.clientY })
            }}
            onDragLeave={() => {
              setDragOverPosition(null)
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
                    background: '#f5f5f565',
                    border: '2px solid #999',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    backgroundImage: `
                      linear-gradient(to right, rgba(80,80,80,0.2) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(80,80,80,0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                    justifyContent: 'flex-start',
                    alignItems: 'center'
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    background: 'rgba(80, 80, 80, 0.55)',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '6px 6px 0 0',
                    fontWeight: 'bold',
                    position: 'absolute',
                    top: '-31px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '65px',
                    maxHeight: '40px',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    overflow: 'hidden'
                  }}>
                    Tisch {table.id.slice(1)}<br />{occupied}/{table.capacity}
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
                        setDraggingMeta({ tableId, agIdx: idx })
                      }
                    }}
                    onContextMenu={e => {
                      e.preventDefault()
                      setContextMenu({ x: e.clientX, y: e.clientY, tableId, agIdx: idx, isList: false })
                    }}
                    style={{
                      gridColumn: (table.x + ag.x + pos.x + 1),
                      gridRow: (table.y + ag.y + pos.y + 1),
                      background: assignedColors[tableId]?.[idx] || paletteColor(PALETTE[0]),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      cursor: ag.locked ? 'default' : 'move',
                      zIndex: 10,
                      border: '1px solid rgba(0,0,0,0.2)'
                    }}
                    onDoubleClick={() => {
                      setAssignedGroups({
                        ...assignedGroups,
                        [tableId]: ags.map(a => a === ag ? { ...a, locked: !a.locked } : a)
                      })
                    }}
                  >
                    {pidx === 0 ? (ag.locked ? '🔒 ' : '') + ag.group.name + ' (' + ag.group.size + ')' : ''}
                  </div>
                ))
              })
            )}
            {preview && preview.positions.map((pos, pidx) => (
              <div
                key={`preview-${pidx}`}
                style={{
                  gridColumn: (preview.table.x + dragOverPosition!.x + pos.x + 1),
                  gridRow: (preview.table.y + dragOverPosition!.y + pos.y + 1),
                  background: preview.valid ? 'rgba(0,255,0,0.4)' : 'rgba(255,0,0,0.25)',
                  border: preview.valid ? '2px dashed green' : '2px dashed red',
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
            ))}
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
                const table = room.tables.find(t => t.id === contextMenu.tableId)
                if (!table) return
                const occupied = assignedGroups[contextMenu.tableId].reduce((sum, a, i) => i === contextMenu.agIdx ? sum : sum + a.group.size, 0)
                const available = table.capacity - occupied
                setResizeModal({ tableId: contextMenu.tableId, agIdx: contextMenu.agIdx, maxSize: available })
                setResizeValue(available.toString())
                setContextMenu(null)
              }}>Größe anpassen</div>
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
                  const current = assignedGroups[table.id] || []
                  setAssignedGroups({
                    ...assignedGroups,
                    [table.id]: [...current, { group: tableSelectModal.group, rotation: 0, locked: false, x: 0, y: 0, color: PALETTE[0] }]
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
      {resizeModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Familiengr\u00f6\u00dfe anpassen</h3>
            <p>Verf\u00fcgbare Pl\u00e4tze am Tisch: {resizeModal.maxSize}</p>
            <input
              type="number"
              placeholder="Neue Gr\u00f6\u00dfe"
              value={resizeValue}
              onChange={e => setResizeValue(e.target.value)}
              min="1"
              max={resizeModal.maxSize}
            />
            <button onClick={() => {
              const size = Math.min(Math.max(parseInt(resizeValue) || 1, 1), resizeModal.maxSize)
              setAssignedGroups({
                ...assignedGroups,
                [resizeModal.tableId]: assignedGroups[resizeModal.tableId].map((ag, i) => 
                  i === resizeModal.agIdx ? { ...ag, group: { ...ag.group, size } } : ag
                )
              })
              setResizeModal(null)
            }}>Anpassen</button>
            <button onClick={() => setResizeModal(null)}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  )
}