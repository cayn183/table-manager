import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Group } from './Importer'
import type { AssignedGroup, Room as RoomType, Table } from '../types/room'
import { CELL_SIZE, GRID_SIZE, getPositionsForSize, loadRoomFromStorage, paletteColor, PALETTE } from '../utils/roomUtils'

type EventPayload = {
  name?: string
  createdAt?: string
  lastModified?: string
  groups?: Group[]
  assignedGroups?: Record<string, AssignedGroup[]>
  room?: RoomType
}

function getResponsiveFontSize(text: string): number {
  if (text.length < 12) return 11
  if (text.length < 20) return 10
  return 9
}

function normalizeGroups(groups: Group[] | undefined): Group[] {
  if (!Array.isArray(groups)) return []
  return groups.map(g => ({ ...g, salutation: g.salutation || 'Fam' }))
}

function normalizeSeatColor(color?: string): string {
  if (!color) return '#93c5fd'
  if (color.length === 7) return paletteColor(color)
  return color
}

type PrintViewPageProps = {
  embedded?: boolean
  onClose?: () => void
}

export default function PrintViewPage({ embedded = false, onClose }: PrintViewPageProps) {
  const navigate = useNavigate()
  const [room, setRoom] = useState<RoomType | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [assignedGroups, setAssignedGroups] = useState<Record<string, AssignedGroup[]>>({})
  const [eventName, setEventName] = useState('Event')
  const [lastModified, setLastModified] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapScale, setMapScale] = useState(1)
  const [activePage, setActivePage] = useState<'map' | 'list'>('map')
  const [printLayout, setPrintLayout] = useState<'landscape' | 'portrait'>('landscape')
  const mapPageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('currentEvent')
    if (!raw) {
      setLoadError('Kein Event im Speicher gefunden. Bitte im Editor speichern und erneut öffnen.')
      return
    }

    try {
      const event = JSON.parse(raw) as EventPayload
      setEventName(event.name || 'Event')
      setLastModified(event.lastModified || null)
      const roomFromEvent = event.room || loadRoomFromStorage()
      if (!roomFromEvent) {
        setLoadError('Kein gespeicherter Raum gefunden. Bitte im Editor speichern und erneut öffnen.')
        return
      }
      setRoom(roomFromEvent)
      setGroups(normalizeGroups(event.groups))
      setAssignedGroups(event.assignedGroups && typeof event.assignedGroups === 'object' ? event.assignedGroups : {})
    } catch (err) {
      console.error('Event-Daten konnten nicht geladen werden', err)
      setLoadError('Event-Daten konnten nicht geladen werden.')
    }
  }, [])

  const gridBounds = useMemo(() => {
    if (!room) {
      return { minX: 0, minY: 0, maxX: GRID_SIZE, maxY: GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE }
    }

    if (room.viewFrame) {
      const vf = room.viewFrame
      const minX = Math.max(0, vf.x)
      const minY = Math.max(0, vf.y)
      const maxX = Math.min(GRID_SIZE, vf.x + vf.width)
      const maxY = Math.min(GRID_SIZE, vf.y + vf.height)
      const width = Math.max(1, maxX - minX)
      const height = Math.max(1, maxY - minY)
      return { minX, minY, maxX, maxY, width, height }
    }

    if (room.tables.length === 0) {
      return { minX: 0, minY: 0, maxX: GRID_SIZE, maxY: GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE }
    }

    const minX = Math.min(...room.tables.map(t => t.x))
    const minY = Math.min(...room.tables.map(t => t.y))
    const maxX = Math.max(...room.tables.map(t => t.x + t.width))
    const maxY = Math.max(...room.tables.map(t => t.y + t.height))

    const paddedMinX = Math.max(0, minX - 1)
    const paddedMinY = Math.max(0, minY - 1)
    const paddedMaxX = Math.min(GRID_SIZE, maxX + 1)
    const paddedMaxY = Math.min(GRID_SIZE, maxY + 1)

    return {
      minX: paddedMinX,
      minY: paddedMinY,
      maxX: paddedMaxX,
      maxY: paddedMaxY,
      width: paddedMaxX - paddedMinX,
      height: paddedMaxY - paddedMinY
    }
  }, [room])

  useEffect(() => {
    const contentWidth = gridBounds.width * CELL_SIZE
    const contentHeight = gridBounds.height * CELL_SIZE
    if (contentWidth === 0 || contentHeight === 0) return

    const recalc = () => {
      const el = mapPageRef.current
      if (!el) return
      const availableW = Math.max(100, el.clientWidth)
      const availableH = Math.max(100, el.clientHeight)
      const maxScale = 1.25
      const scale = Math.min(maxScale, availableW / contentWidth, availableH / contentHeight)
      setMapScale(Number.isFinite(scale) ? scale : 1)
    }

    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [gridBounds])

  const tableSections = useMemo(() => {
    if (!room) return [] as Array<{ table: Table; assigned: AssignedGroup[] }>
    return [...room.tables]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(table => ({ table, assigned: assignedGroups[table.id] || [] }))
  }, [room, assignedGroups])

  const assignedColors = useMemo(() => {
    const result: Record<string, string[]> = {}
    if (!room) return result

    const isAdjacent = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
      for (const pa of a) {
        for (const pb of b) {
          if (Math.abs(pa.x - pb.x) <= 1 && Math.abs(pa.y - pb.y) <= 1) return true
        }
      }
      return false
    }

    Object.entries(assignedGroups).forEach(([tableId, ags]) => {
      if (ags.length === 0) return
      const table = room.tables.find(t => t.id === tableId)
      if (!table) return
      const colors: string[] = new Array(ags.length)

      for (let i = 0; i < ags.length; i++) {
        const ag = ags[i]
        const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
        const agPositions = positions.map(p => ({ x: ag.x + p.x, y: ag.y + p.y }))

        const banned = new Set<string>()
        for (let j = 0; j < ags.length; j++) {
          if (i === j) continue
          const other = ags[j]
          const otherPositions = getPositionsForSize(other.group.size, other.rotation, table.width, table.height, table.rotation)
          const otherAbsPositions = otherPositions.map(p => ({ x: other.x + p.x, y: other.y + p.y }))
          if (isAdjacent(agPositions, otherAbsPositions) && colors[j]) {
            banned.add(colors[j])
          }
        }

        const picked = PALETTE.find(c => !banned.has(paletteColor(c))) || PALETTE[0]
        colors[i] = paletteColor(picked)
      }

      result[tableId] = colors
    })

    return result
  }, [assignedGroups, room])

  const unassignedGroups = useMemo(() => groups.filter(g => !g.toGo), [groups])
  const toGoGroups = useMemo(() => assignedGroups['TOGO'] || [], [assignedGroups])

  if (loadError) {
    return (
      <div className="print-view">
        <div className="print-toolbar no-print">
          <button onClick={() => navigate(-1)}>Zurück</button>
        </div>
        <div className="print-error">{loadError}</div>
      </div>
    )
  }

  if (!room) {
    return null
  }

  return (
    <div className={`print-view ${printLayout === 'portrait' ? 'is-portrait' : 'is-landscape'}`}>
      <div className="print-toolbar no-print">
        {embedded ? (
          <button onClick={onClose}>Schließen</button>
        ) : (
          <button onClick={() => navigate(-1)}>Zurück</button>
        )}
        <div className="print-toggle" role="group" aria-label="Ansicht auswählen">
          <button
            className={activePage === 'map' ? 'is-active' : ''}
            onClick={() => setActivePage('map')}
          >Sitzplan</button>
          <button
            className={activePage === 'list' ? 'is-active' : ''}
            onClick={() => setActivePage('list')}
          >Übersicht</button>
        </div>
        {activePage === 'list' && (
          <div className="print-toggle print-toggle--compact" role="group" aria-label="Layout auswählen">
            <button
              className={printLayout === 'portrait' ? 'is-active' : ''}
              onClick={() => setPrintLayout('portrait')}
            >Hochformat</button>
            <button
              className={printLayout === 'landscape' ? 'is-active' : ''}
              onClick={() => setPrintLayout('landscape')}
            >Querformat</button>
          </div>
        )}
        <button onClick={() => window.print()}>Drucken</button>
      </div>

      <div className="print-preview">
        {activePage === 'map' && (
          <div className="print-page print-page--map">
            <div className="print-header">{eventName} – Sitzplan</div>
            <div className="print-footer">Stand: {lastModified || new Date().toLocaleString()}</div>

            <div className="print-page-content" ref={mapPageRef}>
              <div
                style={{
                  transform: `scale(${mapScale})`,
                  transformOrigin: 'top left'
                }}
              >
                <div
                  className="print-map"
                  style={{
                    width: gridBounds.width * CELL_SIZE,
                    height: gridBounds.height * CELL_SIZE,
                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`
                  }}
                >
                  {room.tables.map(table => {
                    const left = (table.x - gridBounds.minX) * CELL_SIZE
                    const top = (table.y - gridBounds.minY) * CELL_SIZE
                    const assigned = assignedGroups[table.id] || []
                    const occupied = assigned.reduce((sum, ag) => sum + ag.group.size, 0)

                    return (
                      <div
                        key={table.id}
                        className="print-table"
                        style={{
                          left,
                          top,
                          width: table.width * CELL_SIZE,
                          height: table.height * CELL_SIZE
                        }}
                      >
                        <div className="print-table-label">
                          Tisch {table.id} • {occupied}/{table.capacity}
                        </div>
                      </div>
                    )
                  })}

                  {room.tables.map(table => {
                    const assigned = assignedGroups[table.id] || []
                    return assigned.flatMap((ag, agIndex) => {
                      const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
                      return positions.map((pos, posIndex) => {
                        const seatLeft = (table.x + ag.x + pos.x - gridBounds.minX) * CELL_SIZE
                        const seatTop = (table.y + ag.y + pos.y - gridBounds.minY) * CELL_SIZE
                        const label = `${ag.group.salutation ? ag.group.salutation + ' ' : ''}${ag.group.name}`
                        const showLabel = posIndex === 0
                        return (
                          <div
                            key={`${table.id}-${agIndex}-${posIndex}`}
                            className="print-seat"
                            style={{
                              left: seatLeft,
                              top: seatTop,
                              width: CELL_SIZE,
                              height: CELL_SIZE,
                              background: normalizeSeatColor(assignedColors[table.id]?.[agIndex] || ag.color)
                            }}
                          >
                            {showLabel && (
                              <div className="print-seat-label" style={{ fontSize: `${getResponsiveFontSize(label)}px` }}>
                                {label}
                                <span className="print-seat-size">{ag.group.size}</span>
                              </div>
                            )}
                          </div>
                        )
                      })
                    })
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activePage === 'list' && (
          <div className="print-page print-page--list">
            <div className="print-header">{eventName} – Übersicht</div>
            <div className="print-footer">Stand: {lastModified || new Date().toLocaleString()}</div>

            <div className="print-page-content print-page-content--list">
              <div className="print-summary">
                <div><strong>{tableSections.length}</strong> Tische</div>
                <div><strong>{tableSections.reduce((sum, t) => sum + t.assigned.length, 0)}</strong> Gruppen zugeordnet</div>
                <div><strong>{unassignedGroups.length}</strong> unzugeordnet</div>
                <div><strong>{toGoGroups.length}</strong> ToGo</div>
              </div>

              <div className="print-list">
                {tableSections.map(section => (
                  <div key={section.table.id} className="print-list-section">
                    <div className="print-list-title">Tisch {section.table.id}</div>
                    {section.assigned.length === 0 ? (
                      <div className="print-list-empty">Keine Gruppen</div>
                    ) : (
                      section.assigned.map((ag, idx) => (
                        <div key={`${section.table.id}-${idx}`} className="print-list-item">
                          <span className="print-list-name">{ag.group.name}</span>
                          <span className="print-list-meta">👥 {ag.group.size}{ag.group.time ? ` • ${ag.group.time}` : ''}</span>
                        </div>
                      ))
                    )}
                  </div>
                ))}

                {unassignedGroups.length > 0 && (
                  <div className="print-list-section">
                    <div className="print-list-title">Unzugeordnet</div>
                    {unassignedGroups.map((g, idx) => (
                      <div key={`unassigned-${idx}`} className="print-list-item">
                        <span className="print-list-name">{g.name}</span>
                        <span className="print-list-meta">👥 {g.size}{g.time ? ` • ${g.time}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}

                {toGoGroups.length > 0 && (
                  <div className="print-list-section">
                    <div className="print-list-title">ToGo</div>
                    {toGoGroups.map((ag, idx) => (
                      <div key={`togo-${idx}`} className="print-list-item">
                        <span className="print-list-name">{ag.group.name}</span>
                        <span className="print-list-meta">👥 {ag.group.size}{ag.group.time ? ` • ${ag.group.time}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
