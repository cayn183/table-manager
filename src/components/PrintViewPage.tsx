import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Group } from './Importer'
import type { AssignedGroup, Room as RoomType, Table } from '../types/room'
import { CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, getPositionsForSize, loadRoomFromStorage, paletteColor, PALETTE } from '../utils/roomUtils'

type EventPayload = {
  name?: string
  createdAt?: string
  lastModified?: string
  printHeaderTitle?: string
  printHeaderMapLabel?: string
  printHeaderListLabel?: string
  date?: string
  timeFrom?: string
  timeTo?: string
  showPrintDate?: boolean
  showPrintTimeRange?: boolean
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

function compareTimes(timeA: string, timeB: string): number {
  if (!timeA && !timeB) return 0
  if (!timeA) return 1
  if (!timeB) return -1
  return timeA.localeCompare(timeB)
}

type PrintViewPageProps = {
  embedded?: boolean
  onClose?: () => void
}

function formatDateDE(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  // Try to parse ISO or yyyy-mm-dd or dd.mm.yyyy
  let d: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    d = new Date(dateStr);
  } else if (/^\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
    const [day, month, year] = dateStr.split(".");
    d = new Date(`${year}-${month}-${day}`);
  } else {
    d = new Date(dateStr);
  }
  if (!d || isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export default function PrintViewPage({ embedded = false, onClose }: PrintViewPageProps) {
  const navigate = useNavigate()
  const [room, setRoom] = useState<RoomType | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [assignedGroups, setAssignedGroups] = useState<Record<string, AssignedGroup[]>>({})
  const [eventName, setEventName] = useState('Event')
  const [printHeaderTitle, setPrintHeaderTitle] = useState('Event')
  const [printHeaderMapLabel, setPrintHeaderMapLabel] = useState('Sitzplan')
  const [printHeaderListLabel, setPrintHeaderListLabel] = useState('Zeitplan')
  const [eventDate, setEventDate] = useState<string | null>(null)
  const [eventTimeFrom, setEventTimeFrom] = useState<string | null>(null)
  const [eventTimeTo, setEventTimeTo] = useState<string | null>(null)
  const [showDate, setShowDate] = useState(false)
  const [showTimeRange, setShowTimeRange] = useState(false)
  const [lastModified, setLastModified] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapScale, setMapScale] = useState(1)
  const [activePage, setActivePage] = useState<'map' | 'list'>('map')
  const mapPageRef = useRef<HTMLDivElement | null>(null)

  const persistEventFields = (patch: Partial<EventPayload>) => {
    const raw = localStorage.getItem('currentEvent')
    if (!raw) return
    try {
      const event = JSON.parse(raw) as EventPayload
      const next = { ...event, ...patch }
      localStorage.setItem('currentEvent', JSON.stringify(next))
    } catch (err) {
      console.error('Event-Daten konnten nicht aktualisiert werden', err)
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem('currentEvent')
    if (!raw) {
      setLoadError('Kein Event im Speicher gefunden. Bitte im Editor speichern und erneut öffnen.')
      return
    }

    try {
      const event = JSON.parse(raw) as EventPayload
      setEventName(event.name || 'Event')
      setPrintHeaderTitle(event.printHeaderTitle || event.name || 'Event')
      setPrintHeaderMapLabel(event.printHeaderMapLabel || 'Sitzplan')
      setPrintHeaderListLabel(event.printHeaderListLabel || 'Zeitplan')
      setEventDate((event as any).date || event.createdAt || null)
      setEventTimeFrom((event as any).timeFrom || null)
      setEventTimeTo((event as any).timeTo || null)
      setShowDate(!!(event as any).showPrintDate)
      setShowTimeRange(!!(event as any).showPrintTimeRange)
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
      return { minX: 0, minY: 0, maxX: GRID_WIDTH, maxY: GRID_HEIGHT, width: GRID_WIDTH, height: GRID_HEIGHT }
    }

    if (room.viewFrame) {
      const vf = room.viewFrame
      const minX = Math.max(0, vf.x)
      const minY = Math.max(0, vf.y)
      const maxX = Math.min(GRID_WIDTH, vf.x + vf.width)
      const maxY = Math.min(GRID_HEIGHT, vf.y + vf.height)
      const width = Math.max(1, maxX - minX)
      const height = Math.max(1, maxY - minY)
      return { minX, minY, maxX, maxY, width, height }
    }

    if (room.tables.length === 0) {
      return { minX: 0, minY: 0, maxX: GRID_WIDTH, maxY: GRID_HEIGHT, width: GRID_WIDTH, height: GRID_HEIGHT }
    }

    const minX = Math.min(...room.tables.map(t => t.x))
    const minY = Math.min(...room.tables.map(t => t.y))
    const maxX = Math.max(...room.tables.map(t => t.x + t.width))
    const maxY = Math.max(...room.tables.map(t => t.y + t.height))

    const paddedMinX = Math.max(0, minX - 1)
    const paddedMinY = Math.max(0, minY - 1)
    const paddedMaxX = Math.min(GRID_WIDTH, maxX + 1)
    const paddedMaxY = Math.min(GRID_HEIGHT, maxY + 1)

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
      const maxScale = 1.5 //1.25
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

  // Globales Label-Außenmaß (außer 1er), orientiert an der größten Breite
  const labelBoxMax = useMemo(() => {
    if (!room) return { width: 0, height: 0 }
    let maxWidth = 0
    let maxHeight = 0

    Object.entries(assignedGroups).forEach(([tableId, ags]) => {
      const table = room.tables.find(t => t.id === tableId)
      if (!table) return
      ags.forEach(ag => {
        if (ag.group.size === 1) return
        const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
        const columns = positions.map(pos => table.x + ag.x + pos.x)
        const rows = positions.map(pos => table.y + ag.y + pos.y)
        const minColumn = Math.min(...columns)
        const maxColumn = Math.max(...columns)
        const minRow = Math.min(...rows)
        const maxRow = Math.max(...rows)
        const bboxWidth = (maxColumn - minColumn + 1) * CELL_SIZE
        const bboxHeight = (maxRow - minRow + 1) * CELL_SIZE
        const candidateWidth = Math.max(18, bboxWidth - 6)
        const candidateHeight = Math.max(16, bboxHeight - 4)
        if (candidateWidth > maxWidth) maxWidth = candidateWidth
        if (candidateHeight > maxHeight) maxHeight = candidateHeight
      })
    })

    return { width: maxWidth, height: maxHeight }
  }, [assignedGroups, room])

  const unassignedGroups = useMemo(() => groups.filter(g => !g.toGo), [groups])
  const toGoGroups = useMemo(() => assignedGroups['TOGO'] || [], [assignedGroups])
  const timeSections = useMemo(() => {
    const items = Object.entries(assignedGroups)
      .filter(([tableId]) => tableId !== 'TOGO')
      .flatMap(([tableId, ags]) => ags.map(ag => ({ tableId, ag })))

    const grouped = new Map<string, Array<{ tableId: string; ag: AssignedGroup }>>()
    items.forEach(item => {
      const timeKey = (item.ag.group.time || '').trim()
      if (!grouped.has(timeKey)) grouped.set(timeKey, [])
      grouped.get(timeKey)?.push(item)
    })

    return Array.from(grouped.entries())
      .map(([time, list]) => ({
        time,
        items: list.sort((a, b) => a.ag.group.name.localeCompare(b.ag.group.name))
      }))
      .sort((a, b) => compareTimes(a.time, b.time))
  }, [assignedGroups])

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
    <div className="print-view is-landscape">
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
        <div className="print-header-editor" aria-label="Print-Optionen">
          <label>
            <input
              type="checkbox"
              checked={showDate}
              onChange={(e) => {
                setShowDate(e.target.checked)
                persistEventFields({ showPrintDate: e.target.checked })
              }}
            />
            Datum anzeigen
          </label>
          <label>
            <input
              type="checkbox"
              checked={showTimeRange}
              onChange={(e) => {
                setShowTimeRange(e.target.checked)
                persistEventFields({ showPrintTimeRange: e.target.checked })
              }}
            />
            Uhrzeit anzeigen
          </label>
        </div>
        <button className="print-btn" onClick={() => window.print()}>Drucken</button>
      </div>

      <div className="print-preview">
        {activePage === 'map' && (
          <div className="print-page print-page--map">
            <div className="print-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="print-header-title">{printHeaderTitle}</div>
                <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  {showDate && eventDate ? <span>{formatDateDE(eventDate)}</span> : null}
                  {showTimeRange && (eventTimeFrom || eventTimeTo) ? (
                    <span style={{ marginLeft: 8 }}>{`${eventTimeFrom || ''}${eventTimeFrom && eventTimeTo ? ' – ' : ''}${eventTimeTo || ''}`}</span>
                  ) : null}
                </div>
              </div>
              <div className="print-header-subtitle">{printHeaderMapLabel}</div>
            </div>
            <div className="print-footer no-print">Stand: {lastModified || new Date().toLocaleString()}</div>

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
                          Tisch {table.id.replace(/^T/, '')} • {occupied}/{table.capacity}
                        </div>
                      </div>
                    )
                  })}

                  {room.tables.map(table => {
                    const assigned = assignedGroups[table.id] || []
                    return assigned.flatMap((ag, agIndex) => {
                      const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
                      const gridCells = positions.map((pos, pidx) => {
                        const col0 = table.x + ag.x + pos.x
                        const row0 = table.y + ag.y + pos.y
                        return { col0, row0, pidx }
                      })
                      const columns = gridCells.map(c => c.col0)
                      const rows = gridCells.map(c => c.row0)
                      const minColumn = Math.min(...columns)
                      const maxColumn = Math.max(...columns)
                      const minRow = Math.min(...rows)
                      const maxRow = Math.max(...rows)
                      const bboxWidth = (maxColumn - minColumn + 1) * CELL_SIZE
                      const bboxHeight = (maxRow - minRow + 1) * CELL_SIZE
                      const uniqueColumns = new Set(columns)
                      const uniqueRows = new Set(rows)
                      const isVerticalTwo = ag.group.size === 2 && uniqueColumns.size === 1 && uniqueRows.size === 2

                      // ------------------------------------------------------------------
                      // LABEL POSITIONING
                      // - size 3: center over the two horizontal cells (same row)
                      // - others: use centroid of all occupied cells
                      // ------------------------------------------------------------------
                      const defaultCenterX = gridCells.reduce((sum, c) => sum + (c.col0 - gridBounds.minX + 0.5) * CELL_SIZE, 0) / gridCells.length
                      const defaultCenterY = gridCells.reduce((sum, c) => sum + (c.row0 - gridBounds.minY + 0.5) * CELL_SIZE, 0) / gridCells.length

                      let centerX = defaultCenterX
                      let centerY = defaultCenterY

                      if (ag.group.size === 3) {
                        const rowGroups = new Map<number, number[]>()
                        for (const cell of gridCells) {
                          const cols = rowGroups.get(cell.row0) ?? []
                          cols.push(cell.col0)
                          rowGroups.set(cell.row0, cols)
                        }

                        let bestRow: number | null = null
                        let bestCols: number[] = []

                        for (const [row, cols] of rowGroups.entries()) {
                          if (cols.length >= 2 && cols.length > bestCols.length) {
                            bestRow = row
                            bestCols = cols
                          }
                        }

                        if (bestRow !== null && bestCols.length >= 2) {
                          const minCol = Math.min(...bestCols)
                          const maxCol = Math.max(...bestCols)
                          centerX = ((minCol + maxCol + 1) / 2 - gridBounds.minX) * CELL_SIZE
                          centerY = (bestRow + 0.5 - gridBounds.minY) * CELL_SIZE
                        }
                      }

                      // ------------------------------------------------------------------
                      // LABEL SIZING & COLORS
                      // ------------------------------------------------------------------
                      const displayName = ag.group.name
                      const defaultLabelWidth = Math.max(18, bboxWidth - 6)
                      const defaultLabelHeight = Math.max(16, bboxHeight - 4)
                      const labelMaxWidth = ag.group.size === 1 || isVerticalTwo
                        ? defaultLabelWidth
                        : (labelBoxMax.width || defaultLabelWidth)
                      const labelMaxHeight = ag.group.size === 1
                        ? defaultLabelHeight
                        : (labelBoxMax.height || defaultLabelHeight)
                      const labelColor = normalizeSeatColor(assignedColors[table.id]?.[agIndex] || ag.color)

                      const baseNameSize = Math.round(getResponsiveFontSize(displayName) * 0.6)
                      const approxCharWidth = 0.6
                      const maxSizeByWidth = Math.floor((labelMaxWidth - 4) / Math.max(displayName.length, 1) / approxCharWidth)
                      const nameFontSize = Math.max(5, Math.min(9, baseNameSize, maxSizeByWidth))
                      const useCompactName = ag.group.size === 1 || isVerticalTwo
                      const metaFontSize = useCompactName ? 5 : 6

                      return [
                        ...gridCells.map(({ col0, row0, pidx }) => (
                          <div
                            key={`${table.id}-${agIndex}-${pidx}`}
                            className="print-seat"
                            style={{
                              left: (col0 - gridBounds.minX) * CELL_SIZE,
                              top: (row0 - gridBounds.minY) * CELL_SIZE,
                              width: CELL_SIZE,
                              height: CELL_SIZE,
                              background: labelColor
                            }}
                          />
                        )),
                        <div
                          key={`${table.id}-${agIndex}-label`}
                          style={{
                            position: 'absolute',
                            left: `${centerX}px`,
                            top: `${centerY}px`,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            pointerEvents: 'none'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            padding: ag.group.size <= 3 ? '1px 3px' : '2px 4px',
                            maxWidth: `${labelMaxWidth}px`,
                            maxHeight: `${labelMaxHeight}px`,
                            overflow: 'hidden',
                            borderRadius: '6px',
                            background: '#ffffff',
                            textAlign: 'center'
                          }}>
                            <div
                              style={{
                                fontSize: `${nameFontSize}px`,
                                fontWeight: '700',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: useCompactName ? 'normal' : 'normal',
                                display: useCompactName ? '-webkit-box' : 'block',
                                WebkitLineClamp: useCompactName ? 2 : 'unset',
                                WebkitBoxOrient: useCompactName ? 'vertical' : 'unset',
                                maxWidth: '100%',
                                letterSpacing: '0.2px',
                                wordBreak: 'break-word',
                                lineHeight: '1.1'
                              }}
                            >
                              {ag.locked ? '🔒 ' : ''}{displayName}
                            </div>
                            {ag.group.time && (
                              <div style={{ fontSize: `${metaFontSize}px`, lineHeight: '1' }}>
                                🕐 {ag.group.time.slice(0, 5)}
                              </div>
                            )}
                            {ag.group.size > 1 && (
                              <div style={{ fontSize: `${metaFontSize}px`, fontWeight: '600' }}>
                                👥 {ag.group.size}
                              </div>
                            )}
                          </div>
                        </div>
                      ]
                    })
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activePage === 'list' && (
          <div className="print-page print-page--list">
            <div className="print-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="print-header-title">{printHeaderTitle}</div>
                <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  {showDate && eventDate ? <span>{eventDate}</span> : null}
                  {showTimeRange && (eventTimeFrom || eventTimeTo) ? (
                    <span style={{ marginLeft: 8 }}>{`${eventTimeFrom || ''}${eventTimeFrom && eventTimeTo ? ' – ' : ''}${eventTimeTo || ''}`}</span>
                  ) : null}
                </div>
              </div>
              <div className="print-header-subtitle">{printHeaderListLabel}</div>
            </div>
            <div className="print-footer no-print">Stand: {lastModified || new Date().toLocaleString()}</div>
            <div className="print-page-content print-page-content--list">
              <div className="print-summary-box">
                <div className="print-summary">
                  <div><strong>{tableSections.length}</strong> Tische</div>
                  <div><strong>{tableSections.reduce((sum, t) => sum + t.assigned.length, 0)}</strong> Gruppen zugeordnet</div>
                  <div><strong>{unassignedGroups.length}</strong> unzugeordnet</div>
                  <div><strong>{toGoGroups.length}</strong> ToGo</div>
                </div>
              </div>

              <div className="print-list">
                {timeSections.map(section => (
                  <div key={`time-${section.time || 'none'}`} className="print-list-section">
                    <div className="print-list-title">{section.time || 'Ohne Zeit'}</div>
                    {section.items.length === 0 ? (
                      <div className="print-list-empty">Keine Gruppen</div>
                    ) : (
                      section.items.map((item, idx) => (
                        <div key={`${item.tableId}-${idx}`} className="print-list-item">
                          <span className="print-list-name">{item.ag.group.name}</span>
                          <span className="print-list-meta">Tisch {item.tableId.replace(/^T/, '')} • 👥 {item.ag.group.size}</span>
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
