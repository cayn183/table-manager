// ============================================================================
// Print Utilities - Generiert ein echtes mehrseitiges Druckdokument
// ============================================================================
import type { Group } from '../components/Importer'
import type { AssignedGroup, Room as RoomType } from '../types/room'
import { CELL_SIZE, getPositionsForSize, paletteColor, PALETTE, GRID_WIDTH, GRID_HEIGHT } from './roomUtils'

// ============================================================================
// TYPES
// ============================================================================
export type PrintData = {
  eventName: string
  printHeaderTitle: string
  printHeaderMapLabel: string
  printHeaderListLabel: string
  eventDate: string | null
  eventTimeFrom: string | null
  eventTimeTo: string | null
  showDate: boolean
  showTimeRange: boolean
  lastModified: string | null
  room: RoomType
  groups: Group[]
  assignedGroups: Record<string, AssignedGroup[]>
  timeInterval?: number
}

// ============================================================================
// CONSTANTS FOR COLUMN LAYOUT
// ============================================================================
const PRINT_MAX_HEIGHT = 390 // px available height for list content (reduced to avoid overflow)
const HEADER_HEIGHT = 32
const SUMMARY_HEIGHT = 20
const ITEM_HEIGHT = 30
const ITEM_WITH_NOTE_HEIGHT = 46

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function formatDateDE(dateStr?: string | null): string | null {
  if (!dateStr) return null
  let d: Date | null = null
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    d = new Date(dateStr)
  } else if (/^\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
    const [day, month, year] = dateStr.split('.')
    d = new Date(`${year}-${month}-${day}`)
  } else {
    d = new Date(dateStr)
  }
  if (!d || isNaN(d.getTime())) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function compareTimes(timeA: string, timeB: string): number {
  if (!timeA && !timeB) return 0
  if (!timeA) return 1
  if (!timeB) return -1
  return timeA.localeCompare(timeB)
}

function normalizeSeatColor(color?: string): string {
  if (!color) return '#93c5fd'
  if (color.length === 7) return paletteColor(color)
  return color
}

function getResponsiveFontSize(text: string): number {
  if (text.length < 12) return 11
  if (text.length < 20) return 10
  return 9
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ============================================================================
// CALCULATE GRID BOUNDS
// ============================================================================
function calculateGridBounds(room: RoomType) {
  if (room.viewFrame) {
    const vf = room.viewFrame
    const minX = Math.max(0, vf.x)
    const minY = Math.max(0, vf.y)
    const maxX = Math.min(GRID_WIDTH, vf.x + vf.width)
    const maxY = Math.min(GRID_HEIGHT, vf.y + vf.height)
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
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
}

// ============================================================================
// CALCULATE ASSIGNED COLORS
// ============================================================================
function calculateAssignedColors(room: RoomType, assignedGroups: Record<string, AssignedGroup[]>): Record<string, string[]> {
  const result: Record<string, string[]> = {}

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
}

// ============================================================================
// GENERATE MAP PAGE HTML
// ============================================================================
function generateMapPageHTML(data: PrintData, gridBounds: ReturnType<typeof calculateGridBounds>, assignedColors: Record<string, string[]>): string {
  const { room, assignedGroups, printHeaderTitle, printHeaderMapLabel, eventDate, eventTimeFrom, eventTimeTo, showDate, showTimeRange, lastModified } = data

  // Calculate scale to fill available space (A4 landscape minus header/footer)
  const contentWidth = gridBounds.width * CELL_SIZE
  const contentHeight = gridBounds.height * CELL_SIZE
  // Available space: tuned to better fill page while avoiding page-breaks
  // Increase slightly to allow the map to be larger (user requested bigger)
  const availableW = 1250 // slightly wider allowance (px)
  const availableH = 635 // slightly taller allowance (px)
  const scaleX = availableW / contentWidth
  const scaleY = availableH / contentHeight
  const MAX_SCALE = 3.0 // allow larger scaling for small maps
  const scale = Math.min(MAX_SCALE, scaleX, scaleY)
  const scaledWidth = Math.round(contentWidth * scale)
  const scaledHeight = Math.round(contentHeight * scale)

  // Event info line
  const eventInfoParts: string[] = []
  if (showDate && eventDate) eventInfoParts.push(formatDateDE(eventDate) || '')
  if (showTimeRange && (eventTimeFrom || eventTimeTo)) {
    eventInfoParts.push(`${eventTimeFrom || ''}${eventTimeFrom && eventTimeTo ? ' – ' : ''}${eventTimeTo || ''}`)
  }
  const eventInfoLine = eventInfoParts.filter(Boolean).join(' • ')

  // Generate tables HTML
  let tablesHTML = ''
  for (const table of room.tables) {
    const left = (table.x - gridBounds.minX) * CELL_SIZE
    const top = (table.y - gridBounds.minY) * CELL_SIZE
    const assigned = assignedGroups[table.id] || []
    const occupied = assigned.reduce((sum, ag) => sum + ag.group.size, 0)

    tablesHTML += `
      <div style="position:absolute;left:${left}px;top:${top}px;width:${table.width * CELL_SIZE}px;height:${table.height * CELL_SIZE}px;border:2px solid #94a3b8;border-radius:8px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.08);z-index:1;">
        <div style="position:absolute;top:-30px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:1px;text-align:center;color:#1e293b;background:rgba(255,255,255,0.95);padding:2px 6px;border-radius:6px;border:1px solid rgba(148,163,184,0.6);z-index:2;white-space:nowrap;">
          <div style="font-size:10px;font-weight:650;line-height:1;">Tisch ${table.id.replace(/^T/, '')}</div>
          <div style="font-size:9px;font-weight:600;line-height:1;">${occupied}/${table.capacity}</div>
        </div>
      </div>
    `
  }

  // Generate seats HTML
  let seatsHTML = ''
  for (const table of room.tables) {
    const assigned = assignedGroups[table.id] || []
    assigned.forEach((ag, agIndex) => {
      const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
      const gridCells = positions.map(pos => ({
        col0: table.x + ag.x + pos.x,
        row0: table.y + ag.y + pos.y
      }))

      const labelColor = normalizeSeatColor(assignedColors[table.id]?.[agIndex] || ag.color)

      // Draw cells
      for (const { col0, row0 } of gridCells) {
        seatsHTML += `
          <div style="position:absolute;left:${(col0 - gridBounds.minX) * CELL_SIZE}px;top:${(row0 - gridBounds.minY) * CELL_SIZE}px;width:${CELL_SIZE}px;height:${CELL_SIZE}px;background:${labelColor};border:1px solid rgba(15,23,42,0.15);border-radius:6px;z-index:2;"></div>
        `
      }

      // Calculate label position
      const centerX = gridCells.reduce((sum, c) => sum + (c.col0 - gridBounds.minX + 0.5) * CELL_SIZE, 0) / gridCells.length
      const centerY = gridCells.reduce((sum, c) => sum + (c.row0 - gridBounds.minY + 0.5) * CELL_SIZE, 0) / gridCells.length

      const displayName = escapeHtml(ag.group.name)
      const nameFontSize = Math.max(5, Math.min(9, Math.round(getResponsiveFontSize(ag.group.name) * 0.6)))
      const metaFontSize = ag.group.size === 1 ? 5 : 6

      let labelContent = `<div style="font-size:${nameFontSize}px;font-weight:700;overflow:hidden;text-overflow:ellipsis;max-width:100%;letter-spacing:0.2px;word-break:break-word;line-height:1.1;">${ag.locked ? '🔒 ' : ''}${displayName}</div>`
      
      if (ag.group.time) {
        labelContent += `<div style="font-size:${metaFontSize}px;line-height:1;">🕐 ${ag.group.time.slice(0, 5)}</div>`
      }
      
      if (ag.group.size > 1) {
        let metaContent = ''
        if (ag.group.accessible) metaContent += `<span style="font-size:${metaFontSize}px;line-height:1;">♿</span>`
        if (ag.group.note) metaContent += `<span style="font-size:${metaFontSize}px;line-height:1;margin-left:6px;color:#f59e0b;">⚠️</span>`
        labelContent += `<div style="font-size:${metaFontSize}px;font-weight:600;display:flex;align-items:center;gap:6px;"><div style="display:flex;align-items:center;gap:4px;">${metaContent}</div><div>👥 ${ag.group.size}</div></div>`
      }

      seatsHTML += `
        <div style="position:absolute;left:${centerX}px;top:${centerY}px;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;z-index:10;pointer-events:none;">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:${ag.group.size <= 3 ? '1px 3px' : '2px 4px'};overflow:hidden;border-radius:6px;background:#ffffff;border:1px solid ${ag.group.accessible ? '#60a5fa' : '#c7d2fe'};text-align:center;">
            ${labelContent}
          </div>
        </div>
      `
    })
  }

  return `
    <div class="print-page">
      <div class="print-header">
        <div class="print-header-main">
          <h1 class="print-title">${escapeHtml(printHeaderTitle)}</h1>
          ${eventInfoLine ? `<span class="print-info">${eventInfoLine}</span>` : ''}
        </div>
        <div class="print-subtitle">${escapeHtml(printHeaderMapLabel)}</div>
      </div>

      <div class="print-map-container" style="height:calc(100% - 70px);">
        <div style="width:${scaledWidth}px;height:${scaledHeight}px;">
          <div class="print-map" style="width:${contentWidth}px;height:${contentHeight}px;background-size:${CELL_SIZE}px ${CELL_SIZE}px;transform:scale(${scale.toFixed(3)});transform-origin:top left;">
            ${tablesHTML}
            ${seatsHTML}
          </div>
        </div>
      </div>

      <div class="print-footer print-footer--below">Stand: ${lastModified || new Date().toLocaleString()}</div>
    </div>
  `
}

// ============================================================================
// GENERATE LIST PAGE HTML WITH COLUMN BREAK LOGIC
// ============================================================================
function generateListPageHTML(data: PrintData): string {
  const { room, groups, assignedGroups, printHeaderTitle, printHeaderListLabel, eventDate, eventTimeFrom, eventTimeTo, showDate, showTimeRange, lastModified, timeInterval = 15 } = data

  // Event info line
  const eventInfoParts: string[] = []
  if (showDate && eventDate) eventInfoParts.push(formatDateDE(eventDate) || '')
  if (showTimeRange && (eventTimeFrom || eventTimeTo)) {
    eventInfoParts.push(`${eventTimeFrom || ''}${eventTimeFrom && eventTimeTo ? ' – ' : ''}${eventTimeTo || ''}`)
  }
  const eventInfoLine = eventInfoParts.filter(Boolean).join(' • ')

  // Calculate statistics
  const tableSections = [...room.tables].sort((a, b) => a.id.localeCompare(b.id)).map(table => ({
    table,
    assigned: assignedGroups[table.id] || []
  }))
  const totalTables = tableSections.length
  const totalAssigned = tableSections.reduce((sum, t) => sum + t.assigned.length, 0)
  const unassignedGroups = groups.filter(g => !g.toGo)
  const toGoGroups = assignedGroups['TOGO'] || []

  // Build time slots like Room.tsx
  const assignedGroupsList: Array<{ group: Group; tableId: string }> = []
  Object.entries(assignedGroups).forEach(([tableId, ags]) => {
    ags.forEach(ag => {
      assignedGroupsList.push({ group: ag.group, tableId })
    })
  })

  const allWithTime = assignedGroupsList.filter(g => g.group.time).sort((a, b) => (a.group.time || '').localeCompare(b.group.time || ''))
  
  const timeSlots = new Map<string, Array<{ group: Group; tableId: string }>>()
  allWithTime.forEach(item => {
    if (!item.group.time) return
    const [hours, minutes] = item.group.time.split(':').map(Number)
    const slotMinutes = Math.floor(minutes / timeInterval) * timeInterval
    const slotTime = `${String(hours).padStart(2, '0')}:${String(slotMinutes).padStart(2, '0')}`
    const endMinutes = (slotMinutes + timeInterval) % 60
    const endHours = hours + (slotMinutes + timeInterval >= 60 ? 1 : 0)
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
    const slotKey = `${slotTime} - ${endTime}`
    
    if (!timeSlots.has(slotKey)) timeSlots.set(slotKey, [])
    timeSlots.get(slotKey)!.push(item)
  })

  // Build column layout with "Fortsetzung" logic
  const columns: string[][] = []
  let currentColumn: string[] = []
  let remainingHeight = PRINT_MAX_HEIGHT

  const startNewColumn = () => {
    if (currentColumn.length > 0) columns.push(currentColumn)
    currentColumn = []
    remainingHeight = PRINT_MAX_HEIGHT
  }

  const estimateItemHeight = (hasNote: boolean) => hasNote ? ITEM_WITH_NOTE_HEIGHT : ITEM_HEIGHT

  const addSlotWithContinuation = (
    slotKey: string, 
    items: Array<{ group: Group; tableId: string }>,
    summaryText: string
  ) => {
    let index = 0
    let segmentIndex = 0

    while (index < items.length) {
      const isFirstSegment = segmentIndex === 0
      const headerText = isFirstSegment ? `🕐 ${slotKey}` : `Fortsetzung (${slotKey})`
      const baseHeight = HEADER_HEIGHT + SUMMARY_HEIGHT

      // Check if we need to start a new column
      const firstItemHeight = estimateItemHeight(!!items[index]?.group.note)
      if (baseHeight + firstItemHeight > remainingHeight && currentColumn.length > 0) {
        startNewColumn()
      }

      // Collect items that fit in this segment
      const segmentItems: Array<{ group: Group; tableId: string }> = []
      let segmentHeight = baseHeight

      while (index < items.length) {
        const itemHeight = estimateItemHeight(!!items[index].group.note)
        if (segmentItems.length > 0 && segmentHeight + itemHeight > remainingHeight) break
        segmentHeight += itemHeight
        segmentItems.push(items[index])
        index++
      }

      // Generate HTML for this segment
      let itemsHTML = ''
      for (const item of segmentItems) {
        const noteIcon = item.group.note ? '<span class="timeline-note-icon">⚠️</span>' : ''
        const tableLabel = item.tableId === 'TOGO' ? 'ToGo' : `Tisch ${item.tableId.replace(/^T/, '')}`
        const noteHTML = item.group.note ? `<div class="timeline-note">${escapeHtml(item.group.note)}</div>` : ''
        itemsHTML += `
          <div class="timeline-slot-item timeline-slot-item--timed">
            <div class="timeline-item-title">${noteIcon}${escapeHtml(item.group.name)}</div>
            <div class="timeline-item-meta">👥 ${item.group.size} • ${tableLabel}${item.group.accessible ? ' • ♿' : ''}</div>
            ${noteHTML}
          </div>
        `
      }

      const sectionHTML = `
        <div class="timeline-slot">
          <div class="timeline-slot-header">${headerText}</div>
          <div class="timeline-slot-summary">${summaryText}</div>
          ${itemsHTML}
        </div>
      `

      currentColumn.push(sectionHTML)
      remainingHeight -= segmentHeight
      segmentIndex++
    }
  }

  // Add groups without time first
  const noTimeGroups = assignedGroupsList.filter(g => !g.group.time)
  if (noTimeGroups.length > 0) {
    addSlotWithContinuation('Ohne Zeitangabe', noTimeGroups, `${noTimeGroups.length} Einträge`)
  }

  // Add time slots
  const slotEntries = Array.from(timeSlots.entries())
  for (const [slotKey, items] of slotEntries) {
    const totalPeople = items.reduce((sum, item) => sum + item.group.size, 0)
    addSlotWithContinuation(slotKey, items, `${items.length} Familien • ${totalPeople} Personen`)
  }

  // Add unassigned groups
  if (unassignedGroups.length > 0) {
    const unassignedItems = unassignedGroups.map(g => ({ group: g, tableId: 'unassigned' }))
    let index = 0
    let segmentIndex = 0

    while (index < unassignedItems.length) {
      const isFirstSegment = segmentIndex === 0
      const headerText = isFirstSegment ? 'Unzugeordnet' : 'Fortsetzung (Unzugeordnet)'
      const baseHeight = HEADER_HEIGHT + SUMMARY_HEIGHT

      const firstItemHeight = estimateItemHeight(!!unassignedItems[index]?.group.note)
      if (baseHeight + firstItemHeight > remainingHeight && currentColumn.length > 0) {
        startNewColumn()
      }

      const segmentItems: Group[] = []
      let segmentHeight = baseHeight

      while (index < unassignedItems.length) {
        const itemHeight = estimateItemHeight(!!unassignedItems[index].group.note)
        if (segmentItems.length > 0 && segmentHeight + itemHeight > remainingHeight) break
        segmentHeight += itemHeight
        segmentItems.push(unassignedItems[index].group)
        index++
      }

      let itemsHTML = ''
      for (const g of segmentItems) {
        const noteIcon = g.note ? '<span class="timeline-note-icon">⚠️</span>' : ''
        const noteHTML = g.note ? `<div class="timeline-note">${escapeHtml(g.note)}</div>` : ''
        itemsHTML += `
          <div class="timeline-slot-item timeline-slot-item--unassigned">
            <div class="timeline-item-title">${noteIcon}${escapeHtml(g.name)} (${g.size}${g.toGo ? ' | ToGo' : ''})</div>
            <div class="timeline-item-meta">${g.time ? `🕐 ${g.time}` : 'Zeit: offen'}${g.accessible ? ' • ♿' : ''}</div>
            ${noteHTML}
          </div>
        `
      }

      currentColumn.push(`
        <div class="timeline-slot timeline-slot--unassigned">
          <div class="timeline-slot-header">${headerText}</div>
          <div class="timeline-slot-summary">${unassignedGroups.length} Einträge</div>
          ${itemsHTML}
        </div>
      `)
      remainingHeight -= segmentHeight
      segmentIndex++
    }
  }

  // Add ToGo groups
  if (toGoGroups.length > 0) {
    let index = 0
    let segmentIndex = 0

    while (index < toGoGroups.length) {
      const isFirstSegment = segmentIndex === 0
      const headerText = isFirstSegment ? 'ToGo' : 'Fortsetzung (ToGo)'
      const baseHeight = HEADER_HEIGHT + SUMMARY_HEIGHT

      const firstItemHeight = estimateItemHeight(!!toGoGroups[index]?.group.note)
      if (baseHeight + firstItemHeight > remainingHeight && currentColumn.length > 0) {
        startNewColumn()
      }

      const segmentItems: AssignedGroup[] = []
      let segmentHeight = baseHeight

      while (index < toGoGroups.length) {
        const itemHeight = estimateItemHeight(!!toGoGroups[index].group.note)
        if (segmentItems.length > 0 && segmentHeight + itemHeight > remainingHeight) break
        segmentHeight += itemHeight
        segmentItems.push(toGoGroups[index])
        index++
      }

      let itemsHTML = ''
      for (const ag of segmentItems) {
        const noteIcon = ag.group.note ? '<span class="timeline-note-icon">⚠️</span>' : ''
        const noteHTML = ag.group.note ? `<div class="timeline-note">${escapeHtml(ag.group.note)}</div>` : ''
        itemsHTML += `
          <div class="timeline-slot-item timeline-slot-item--togo">
            <div class="timeline-item-title">${noteIcon}${escapeHtml(ag.group.name)}</div>
            <div class="timeline-item-meta">👥 ${ag.group.size}${ag.group.time ? ` • ${ag.group.time}` : ''}${ag.group.accessible ? ' • ♿' : ''}</div>
            ${noteHTML}
          </div>
        `
      }

      currentColumn.push(`
        <div class="timeline-slot timeline-slot--togo">
          <div class="timeline-slot-header">${headerText}</div>
          <div class="timeline-slot-summary">${toGoGroups.length} Einträge</div>
          ${itemsHTML}
        </div>
      `)
      remainingHeight -= segmentHeight
      segmentIndex++
    }
  }

  // Push final column
  if (currentColumn.length > 0) columns.push(currentColumn)

  // Split columns into pages of max 5 columns each
  const COLUMNS_PER_PAGE = 5
  const pages: string[][][] = []
  for (let i = 0; i < columns.length; i += COLUMNS_PER_PAGE) {
    pages.push(columns.slice(i, i + COLUMNS_PER_PAGE))
  }

  // Generate a page for each chunk of columns
  let pagesHTML = ''
  pages.forEach((pageColumns, pageIndex) => {
    let columnsHTML = ''
    for (let i = 0; i < pageColumns.length; i++) {
      columnsHTML += `<div class="timeline-column print-timeline-column">${pageColumns[i].join('')}</div>`
    }

    pagesHTML += `
      <div class="print-page">
        <div class="print-header">
          <div class="print-header-main">
            <h1 class="print-title">${escapeHtml(printHeaderTitle)}</h1>
            ${eventInfoLine ? `<span class="print-info">${eventInfoLine}</span>` : ''}
          </div>
          <div class="print-subtitle">${escapeHtml(printHeaderListLabel)}${pageIndex > 0 ? ` (Seite ${pageIndex + 1})` : ''}</div>
        </div>

        <div class="print-summary">
          <div><strong>${totalTables}</strong> Tische</div>
          <div><strong>${totalAssigned}</strong> Gruppen zugeordnet</div>
          <div><strong>${unassignedGroups.length}</strong> unzugeordnet</div>
          <div><strong>${toGoGroups.length}</strong> ToGo</div>
        </div>

        <div class="timeline-list print-timeline-list">
          ${columnsHTML}
        </div>

        <div class="print-footer print-footer--below">Stand: ${lastModified || new Date().toLocaleString()}</div>
      </div>
    `
  })

  return pagesHTML
}

// ============================================================================
// MAIN PRINT FUNCTION - Opens a new window with proper print document
// ============================================================================
export function openPrintDocument(data: PrintData): void {
  const gridBounds = calculateGridBounds(data.room)
  const assignedColors = calculateAssignedColors(data.room, data.assignedGroups)

  const mapPageHTML = generateMapPageHTML(data, gridBounds, assignedColors)
  const listPageHTML = generateListPageHTML(data)

  const printHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.printHeaderTitle)} - Druckansicht</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
      background: white;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-page {
      position: relative;
      width: 279mm;
      height: 192mm;
      padding: 6mm 8mm;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .print-header {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 8px;
      padding: 8px 12px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      flex-shrink: 0;
    }

    .print-header-main {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .print-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    .print-info {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }

    .print-subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }

    .print-footer {
      position: absolute;
      bottom: 4mm;
      right: 8mm;
      font-size: 9px;
      color: #94a3b8;
    }
    .print-footer--below {
      position: static;
      margin-top: 12px;
      text-align: right;
      font-size: 9px;
      color: #94a3b8;
    }

    .print-map-container {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      overflow: hidden;
    }

    .print-map {
      position: relative;
      border: 2px solid #94a3b8;
      border-radius: 10px;
      background: white;
      background-image:
        linear-gradient(to right, #e2e8f0 1px, transparent 1px),
        linear-gradient(to bottom, #e2e8f0 1px, transparent 1px);
    }

    .print-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 8px 12px;
      margin-bottom: 8px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
      flex-shrink: 0;
    }

    .print-list {
      display: flex;
      gap: 10px;
      flex: 1;
      overflow: hidden;
    }

    .print-timeline-list {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }

    .print-timeline-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 195px;
      width: 195px;
    }

    .timeline-slot {
      margin-bottom: 10px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(15,23,42,0.06);
      overflow: visible;
      display: block;
      width: auto;
      padding: 0;
    }

    .timeline-slot--unassigned .timeline-slot-header {
      background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
    }

    .timeline-slot--togo .timeline-slot-header {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    }

    .timeline-slot-header {
      padding: 8px 10px;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 11px;
      font-weight: 700;
    }

    .timeline-slot-summary {
      padding: 6px 10px 0 10px;
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .timeline-slot-item {
      margin: 0 6px 6px;
      width: calc(100% - 16px);
      background: rgba(217,227,237,0.7);
      border-radius: 8px;
      padding: 6px 8px;
      font-size: 11px;
      color: #1e293b;
      line-height: 1.4;
      border-left: 4px solid #2196f3;
    }

    .timeline-slot-item--unassigned {
      border-left-color: #94a3b8;
    }

    .timeline-slot-item--togo {
      border-left-color: #22c55e;
    }

    .timeline-item-title {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .timeline-item-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 1px;
    }

    .timeline-note {
      font-size: 10px;
      color: #475569;
      margin-top: 4px;
    }

    .timeline-note-icon {
      font-size: 11px;
      line-height: 1;
      color: #f59e0b;
    }

    .print-column {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .list-section {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 8px;
      flex-shrink: 0;
    }

    .list-section--unassigned {
      border-color: #fbbf24;
    }

    .list-section--togo {
      border-color: #22c55e;
    }

    .list-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid #f1f5f9;
    }

    .list-summary {
      font-size: 9px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .list-item {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 4px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10px;
    }

    .list-item:last-child {
      border-bottom: none;
    }

    .list-name {
      font-weight: 600;
      color: #1e293b;
    }

    .list-meta {
      font-size: 9px;
      color: #64748b;
    }

    .list-note {
      font-size: 9px;
      color: #374151;
      margin-top: 2px;
      font-weight: 500;
    }

    .list-note-icon {
      font-size: 9px;
      line-height: 1;
      margin-right: 3px;
      color: #f59e0b;
    }

    .list-empty {
      font-size: 10px;
      color: #94a3b8;
      padding: 4px 0;
    }

    @media print {
      body {
        background: white;
      }

      .print-page {
        width: 100%;
        height: 100%;
        padding: 0 2mm;
      }
    }
  </style>
</head>
<body>
  ${mapPageHTML}
  ${listPageHTML}
  <script>
    // Auto-print after load
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
`

  // Open in new window
  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (printWindow) {
    printWindow.document.write(printHTML)
    printWindow.document.close()
  }
}
