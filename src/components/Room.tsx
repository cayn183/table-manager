import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Importer, { Group } from './Importer'
import Papa from 'papaparse'
import { bestFitAssign } from '../utils/placement'

type Table = {
  id: string
  x: number
  y: number
  capacity: number
  width: number
  height: number
}

type ViewFrame = { x: number; y: number; width: number; height: number }

type Room = {
  tables: Table[]
  viewFrame?: ViewFrame
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
const TOGO_COLOR = '#FFE082'

// Fixed list height (no scrollbar)
const LIST_FIXED_HEIGHT = 240
const LIST_MAX_HEIGHT = LIST_FIXED_HEIGHT

function paletteColor(hex: string): string {
  return hex + '70'
}

function generatePossibleLayouts(size: number, maxWidth: number, maxHeight: number): { x: number; y: number }[][] {
  const layouts: { x: number; y: number }[][] = []
  
  for (let cols = 1; cols <= maxWidth; cols++) {
    for (let rows = 1; rows <= maxHeight; rows++) {
      const mainBlock = cols * rows
      if (mainBlock >= size) {
        const pos: { x: number; y: number }[] = []
        for (let i = 0; i < size; i++) {
          pos.push({ x: i % cols, y: Math.floor(i / cols) })
        }
        layouts.push(pos)
      } else if (mainBlock < size && rows < maxHeight) {
        const pos: { x: number; y: number }[] = []
        for (let i = 0; i < mainBlock; i++) {
          pos.push({ x: i % cols, y: Math.floor(i / cols) })
        }
        const remaining = size - mainBlock
        for (let i = 0; i < Math.min(remaining, cols); i++) {
          pos.push({ x: i, y: rows })
        }
        if (pos.length === size) {
          layouts.push(pos)
        }
      }
    }
  }
  
  return layouts.filter(layout => {
    const maxX = Math.max(...layout.map(p => p.x))
    const maxY = Math.max(...layout.map(p => p.y))
    return maxX < maxWidth && maxY < maxHeight
  })
}

function adaptiveLayout(size: number, maxWidth: number, maxHeight: number): { x: number; y: number }[] {
  const layouts = generatePossibleLayouts(size, maxWidth, maxHeight)
  
  if (layouts.length === 0) {
    const cols = Math.ceil(Math.sqrt(size))
    const positions: { x: number; y: number }[] = []
    for (let i = 0; i < size; i++) {
      positions.push({ x: i % cols, y: Math.floor(i / cols) })
    }
    return positions
  }
  
  const best = layouts.sort((a, b) => {
    const aArea = (Math.max(...a.map(p => p.x)) + 1) * (Math.max(...a.map(p => p.y)) + 1)
    const bArea = (Math.max(...b.map(p => p.x)) + 1) * (Math.max(...b.map(p => p.y)) + 1)
    return aArea - bArea
  })[0]
  
  return best
}

function getPositionsForSize(size: number, rotation: number, tableWidth?: number, tableHeight?: number): { x: number; y: number }[] {
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
    if (tableWidth && tableHeight) {
      positions = adaptiveLayout(size, tableWidth, tableHeight)
    } else {
      const cols = Math.ceil(Math.sqrt(size))
      for (let i = 0; i < size; i++) {
        positions.push({ x: i % cols, y: Math.floor(i / cols) })
      }
    }
  }

  // Spiegelung: rotation >= 4 bedeutet gespiegelt
  const mirrored = rotation >= 4
  const actualRotation = rotation % 4
  
  // Spiegeln entlang der Y-Achse (horizontal spiegeln)
  let transformed = mirrored ? positions.map(pos => ({ x: -pos.x, y: pos.y })) : positions
  
  // Dann rotieren
  const rotated = transformed.map(pos => {
    switch (actualRotation) {
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
  const positions = getPositionsForSize(group.size, rotation, table.width, table.height)
  for (const pos of positions) {
    const absX = table.x + x + pos.x
    const absY = table.y + y + pos.y
    if (absX < table.x || absX >= table.x + table.width || absY < table.y || absY >= table.y + table.height) {
      return false
    }
    for (const ag of assignedGroups[table.id] || []) {
      if (ag === skipAg) continue
      const agPositions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height)
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
  const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height)
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
    const otherPositions = getPositionsForSize(other.group.size, other.rotation, table.width, table.height)
    const otherAbsPositions = otherPositions.map(p => ({ x: other.x + p.x, y: other.y + p.y }))
    if (isAdjacent(agPositions, otherAbsPositions)) {
      bannedColors.add(other.color)
    }
  }

  const picked = PALETTE.find(c => !bannedColors.has(paletteColor(c))) || PALETTE[0]
  return paletteColor(picked)
}

function addPositionsToSet(set: Set<string>, positions: { x: number; y: number }[], offsetX: number, offsetY: number) {
  positions.forEach(p => set.add(`${offsetX + p.x},${offsetY + p.y}`))
}

function findPlacement(
  table: Table,
  group: Group,
  existing: AssignedGroup[],
  occupied: Set<string>
): { x: number; y: number; rotation: number } | null {
  for (let rot = 0; rot < 4; rot++) {
    const positions = getPositionsForSize(group.size, rot, table.width, table.height)
    const maxX = Math.max(...positions.map(p => p.x))
    const maxY = Math.max(...positions.map(p => p.y))

    for (let y = 0; y <= table.height - 1 - maxY; y++) {
      for (let x = 0; x <= table.width - 1 - maxX; x++) {
        let collision = false
        for (const pos of positions) {
          const key = `${x + pos.x},${y + pos.y}`
          if (occupied.has(key)) {
            collision = true
            break
          }
        }
        if (!collision) {
          return { x, y, rotation: rot }
        }
      }
    }
  }
  return null
}

function placeGroupsOnTable(table: Table, groups: Group[], seedPlaced: AssignedGroup[] = []): { placed: AssignedGroup[]; unplaced: Group[] } {
  const placed: AssignedGroup[] = [...seedPlaced]
  const unplaced: Group[] = []
  const occupied = new Set<string>()

  // Mark occupied cells from seed placements (e.g., locked items)
  for (const ag of seedPlaced) {
    const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height)
    addPositionsToSet(occupied, positions, ag.x, ag.y)
  }

  for (const g of groups) {
    const placement = findPlacement(table, g, placed, occupied)
    if (placement) {
      const positions = getPositionsForSize(g.size, placement.rotation, table.width, table.height)
      addPositionsToSet(occupied, positions, placement.x, placement.y)
      placed.push({ group: g, rotation: placement.rotation, locked: false, x: placement.x, y: placement.y, color: PALETTE[0] })
    } else {
      unplaced.push(g)
    }
  }

  return { placed, unplaced }
}

// Stable identity for a group across runs
function groupKey(g: Group) {
  return `${g.salutation || 'Fam'}|${g.name}|${g.time ?? ''}|${g.size}|${g.toGo ? '1' : '0'}`
}

// Build occupied cell-set for a table from given placements
function buildOccupied(table: Table, placements: AssignedGroup[]): Set<string> {
  const occ = new Set<string>()
  for (const ag of placements) {
    const cells = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height)
    for (const c of cells) occ.add(`${ag.x + c.x},${ag.y + c.y}`)
  }
  return occ
}

// Try to place a group on a table without overlapping occupied cells
function tryPlaceOnTable(
  table: Table,
  group: Group,
  occupied: Set<string>
): { x: number; y: number; rotation: number } | null {
  for (let rot = 0; rot < 4; rot++) {
    const cells = getPositionsForSize(group.size, rot, table.width, table.height)
    const w = Math.max(...cells.map(c => c.x)) + 1
    const h = Math.max(...cells.map(c => c.y)) + 1
    if (w > table.width || h > table.height) continue

    for (let y = 0; y <= table.height - h; y++) {
      for (let x = 0; x <= table.width - w; x++) {
        let ok = true
        for (const c of cells) {
          const key = `${x + c.x},${y + c.y}`
          if (occupied.has(key)) { ok = false; break }
        }
        if (ok) return { x, y, rotation: rot }
      }
    }
  }
  return null
}

// Greedy re-layout of all movable groups, preserving locked as seeds
function greedyReLayout(
  tables: Table[],
  lockedByTable: Record<string, AssignedGroup[]>,
  candidates: Group[]
): { nextByTable: Record<string, AssignedGroup[]>; placedKeys: Set<string>; notPlaced: Group[] } {
  const nextByTable: Record<string, AssignedGroup[]> = {}
  const occByTable: Record<string, Set<string>> = {}
  const placedKeys = new Set<string>()

  for (const t of tables) {
    nextByTable[t.id] = [...(lockedByTable[t.id] || [])]
    occByTable[t.id] = buildOccupied(t, nextByTable[t.id])
  }

  const sorted = [...candidates].sort((a, b) => b.size - a.size)
  const notPlaced: Group[] = []

  for (const g of sorted) {
    let best: { table: Table; pos: { x: number; y: number; rotation: number }; score: number } | null = null
    for (const t of tables) {
      const pos = tryPlaceOnTable(t, g, occByTable[t.id])
      if (!pos) continue
      const usedCellsNow = nextByTable[t.id].reduce((acc, ag) => acc + ag.group.size, 0)
      const score = (t.width * t.height) - (usedCellsNow + g.size)
      if (!best || score < best.score || (score === best.score && t.id < best.table.id)) {
        best = { table: t, pos, score }
      }
    }
    if (best) {
      const ag: AssignedGroup = { group: g, rotation: best.pos.rotation, locked: false, x: best.pos.x, y: best.pos.y, color: '' }
      nextByTable[best.table.id].push(ag)
      const cells = getPositionsForSize(g.size, ag.rotation, best.table.width, best.table.height)
      for (const c of cells) occByTable[best.table.id].add(`${ag.x + c.x},${ag.y + c.y}`)
      placedKeys.add(groupKey(g))
    } else {
      notPlaced.push(g)
    }
  }

  return { nextByTable, placedKeys, notPlaced }
}

// Keep all current placements; only fill free cells with new groups
function fillOnly(
  tables: Table[],
  currentByTable: Record<string, AssignedGroup[]>,
  newGroups: Group[]
): { nextByTable: Record<string, AssignedGroup[]>; notPlaced: Group[] } {
  const nextByTable: Record<string, AssignedGroup[]> = {}
  const occByTable: Record<string, Set<string>> = {}

  for (const t of tables) {
    const keep = [...(currentByTable[t.id] || [])]
    nextByTable[t.id] = keep
    occByTable[t.id] = buildOccupied(t, keep)
  }

  const remaining: Group[] = []
  const sorted = [...newGroups].sort((a, b) => b.size - a.size)

  for (const g of sorted) {
    let placed = false
    for (const t of tables) {
      const pos = tryPlaceOnTable(t, g, occByTable[t.id])
      if (!pos) continue
      const ag: AssignedGroup = { group: g, rotation: pos.rotation, locked: false, x: pos.x, y: pos.y, color: '' }
      nextByTable[t.id].push(ag)
      const cells = getPositionsForSize(g.size, ag.rotation, t.width, t.height)
      for (const c of cells) occByTable[t.id].add(`${ag.x + c.x},${ag.y + c.y}`)
      placed = true
      break
    }
    if (!placed) remaining.push(g)
  }

  return { nextByTable, notPlaced: remaining }
}

export default function Room() {
  const navigate = useNavigate()
  // State: source data
  const [room, setRoom] = useState<Room | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [assignedGroups, setAssignedGroups] = useState<Record<string, AssignedGroup[]>>({})
  const [showEventSaveModal, setShowEventSaveModal] = useState(false)
  const [eventSaveName, setEventSaveName] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null)
  const [lastSaveType, setLastSaveType] = useState<'auto' | 'manual' | null>(null)
  const [timeInterval, setTimeInterval] = useState(15) // 5, 10, 15 Min
  const [viewMode, setViewMode] = useState<'map' | 'timeline'>('map')
  const [sortAvailable, setSortAvailable] = useState<'name' | 'time' | 'size'>('name')
  const [sortAssigned, setSortAssigned] = useState<'name' | 'time' | 'table'>('table')

  // State: UI and interaction
  const [showModal, setShowModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupSalutation, setNewGroupSalutation] = useState<'Fam' | 'Frau' | 'Herr'>('Fam')
  const [newGroupSize, setNewGroupSize] = useState('4')
  const [newGroupTime, setNewGroupTime] = useState('')
  const [newGroupToGo, setNewGroupToGo] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId: string; agIdx: number; isList: boolean; listIdx?: number; isAssignedList?: boolean } | null>(null)
  const [editModal, setEditModal] = useState<{ tableId: string; agIdx: number; isList: boolean; listIdx?: number } | null>(null)
  const [resizeModal, setResizeModal] = useState<{ tableId: string; agIdx: number; maxSize: number } | null>(null)
  const [resizeValue, setResizeValue] = useState('1')
  const [tableSelectModal, setTableSelectModal] = useState<{ group: Group; index: number } | null>(null)
  const [showCsvImportModal, setShowCsvImportModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<Group[]>([])
  const [dragOverPosition, setDragOverPosition] = useState<{ tableId: string; x: number; y: number } | null>(null)
  const [draggingGroup, setDraggingGroup] = useState<{ group: Group; rotation: number } | null>(null)
  const [draggingMeta, setDraggingMeta] = useState<DraggingMeta>(null)
  const [previewRotation, setPreviewRotation] = useState<number>(0)
  const [editName, setEditName] = useState('')
  const [editSalutation, setEditSalutation] = useState<'Fam' | 'Frau' | 'Herr'>('Fam')
  const [editSize, setEditSize] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editToGo, setEditToGo] = useState(false)
  const [hasAutoAssigned, setHasAutoAssigned] = useState(false)
  const [assignedPage, setAssignedPage] = useState(0)
  const [availablePage, setAvailablePage] = useState(0)
  const [mapScale, setMapScale] = useState(1)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [uiScale, setUiScale] = useState(1)
  const draggingGroupRef = useRef<{ group: Group; rotation: number } | null>(null)


  // Calculate bounding box for tables or explicit view frame
  const gridBounds = useMemo(() => {
    if (!room) {
      return { minX: 0, minY: 0, maxX: GRID_SIZE, maxY: GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE }
    }

    // If a custom view frame exists, honor it directly (clamped to grid)
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
    
    const width = maxX - minX
    const height = maxY - minY
    
    // Add padding (1 cell on each side)
    const paddedMinX = Math.max(0, minX - 1)
    const paddedMinY = Math.max(0, minY - 1)
    const paddedMaxX = Math.min(GRID_SIZE, maxX + 1)
    const paddedMaxY = Math.min(GRID_SIZE, maxY + 1)
    const paddedWidth = paddedMaxX - paddedMinX
    const paddedHeight = paddedMaxY - paddedMinY

    return { 
      minX: paddedMinX, 
      minY: paddedMinY, 
      maxX: paddedMaxX, 
      maxY: paddedMaxY,
      width: paddedWidth, 
      height: paddedHeight
    }
  }, [room])

  // Auto-zoom: fit the content bounds (viewFrame or padded bbox) inside the viewport
  useEffect(() => {
    function recalcScale() {
      const el = mapContainerRef.current
      if (!el) return

      // Responsive Padding basierend auf Screen-Breite
      const screenWidth = window.innerWidth
      const paddingPx = screenWidth < 768 ? 8 : screenWidth < 1024 ? 20 : room?.viewFrame ? 16 : 40
      const availableW = Math.max(200, el.clientWidth - paddingPx)
      const availableH = Math.max(200, el.clientHeight - paddingPx)

      const contentW = gridBounds.width * CELL_SIZE
      const contentH = gridBounds.height * CELL_SIZE

      if (contentW === 0 || contentH === 0) return

      const scaleX = availableW / contentW
      const scaleY = availableH / contentH
      
      // Kleinere Max-Scale auf Mobile
      const maxScale = screenWidth < 768 ? 1.2 : room?.viewFrame ? 4 : 1.6
      const scale = Math.min(maxScale, Math.max(0.3, Math.min(scaleX, scaleY)))

      setMapScale(scale)
    }

    recalcScale()
    window.addEventListener('resize', recalcScale)
    return () => window.removeEventListener('resize', recalcScale)
  }, [gridBounds, room])

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // DPI-basierte intelligente Skalierung
  useEffect(() => {
    const checkEffectiveSize = () => {
      const dpr = window.devicePixelRatio || 1
      const effectiveWidth = window.innerWidth * dpr
      const effectiveHeight = window.innerHeight * dpr
      
      // Erkenne physikalische Gerätegröße, nicht logische Pixel
      let scale = 1
      
      // iPad an Monitor: großer Bildschirm, aber hoher DPI
      // Desktop: großer Bildschirm, niedriger DPI
      if (effectiveWidth > 2560 || effectiveHeight > 1600) {
        // 4K oder Ultra-Wide: vergrößern
        scale = 1.15
      } else if (effectiveWidth > 1920 && effectiveHeight > 1080) {
        // Full HD und größer: normal
        scale = 1
      } else if (effectiveWidth < 800) {
        // Echtes Smartphone: klein
        scale = 1
      } else {
        // Tablet oder iPad: normal
        scale = 1
      }
      
      setUiScale(scale)
    }
    
    checkEffectiveSize()
    window.addEventListener('resize', checkEffectiveSize)
    window.addEventListener('orientationchange', checkEffectiveSize)
    return () => {
      window.removeEventListener('resize', checkEffectiveSize)
      window.removeEventListener('orientationchange', checkEffectiveSize)
    }
  }, [])

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
      const table = room?.tables.find(t => t.id === tableId)
      if (!table) return
      const colors: string[] = new Array(ags.length)

      for (let i = 0; i < ags.length; i++) {
        const ag = ags[i]
        const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height)
        const agPositions = positions.map(p => ({ x: ag.x + p.x, y: ag.y + p.y }))

        const banned = new Set<string>()
        for (let j = 0; j < ags.length; j++) {
          if (i === j) continue
          const other = ags[j]
          const otherPositions = getPositionsForSize(other.group.size, other.rotation, table.width, table.height)
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
  }, [assignedGroups, room])

  // Track dirty state: when groups or assignedGroups change, mark as dirty and clamp pagination
  useEffect(() => {
    setIsDirty(true)
    const totalPages = Math.max(1, Math.ceil(Object.values(assignedGroups).flat().length / 20))
    setAssignedPage(prev => Math.min(prev, totalPages - 1))
  }, [groups, assignedGroups])

  function updatePreviewPosition(coords: { clientX: number; clientY: number }) {
    if (!draggingGroup || !room) return
    const gridElement = document.querySelector('.grid') as HTMLElement
    if (!gridElement) return

    const rect = gridElement.getBoundingClientRect()
    const x = Math.floor((coords.clientX - rect.left) / (CELL_SIZE * mapScale))
    const y = Math.floor((coords.clientY - rect.top) / (CELL_SIZE * mapScale))
    const table = room.tables.find(t => x >= t.x && x < t.x + t.width && y >= t.y && y < t.y + t.height)
    if (!table) { setDragOverPosition(null); return }

    let relX = x - table.x
    let relY = y - table.y
    const skipAg = draggingMeta?.tableId ? assignedGroups[draggingMeta.tableId]?.[draggingMeta.agIdx ?? -1] : undefined

    // Start from current previewRotation so R-key changes are respected
    let bestRotation = previewRotation
    if (!isValidPosition(table, draggingGroup.group, bestRotation, relX, relY, assignedGroups, skipAg)) {
      // Try all 8 orientations starting from current previewRotation
      for (let rot = 1; rot < 8; rot++) {
        const candidate = (previewRotation + rot) % 8
        if (isValidPosition(table, draggingGroup.group, candidate, relX, relY, assignedGroups, skipAg)) { bestRotation = candidate; break }
      }
    }

    if (!isValidPosition(table, draggingGroup.group, bestRotation, relX, relY, assignedGroups, skipAg)) {
      const positions = getPositionsForSize(draggingGroup.group.size, bestRotation, table.width, table.height)
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

  // Touch event handlers
  function handleTouchStart(e: React.TouchEvent, group: Group, index: number) {
    if (group.toGo) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    setDraggingGroup({ group, rotation: 0 })
    setDraggingMeta(null)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!draggingGroup) return
    e.preventDefault()
    const touch = e.touches[0]
    updatePreviewPosition({ clientX: touch.clientX, clientY: touch.clientY })
  }

  function handleTouchEnd(e: React.TouchEvent, groupIndex: number) {
    if (!draggingGroup || !dragOverPosition || !room) {
      setDraggingGroup(null)
      setDragOverPosition(null)
      touchStartRef.current = null
      return
    }

    const table = room.tables.find(t => t.id === dragOverPosition.tableId)
    if (!table) {
      setDraggingGroup(null)
      setDragOverPosition(null)
      touchStartRef.current = null
      return
    }

    const current = assignedGroups[table.id] || []
    const relX = dragOverPosition.x
    const relY = dragOverPosition.y

    if (draggingMeta?.tableId) {
      const sourceTable = room.tables.find(t => t.id === draggingMeta.tableId)!
      const sourceAg = assignedGroups[draggingMeta.tableId]?.[draggingMeta.agIdx ?? -1]
      if (sourceAg && isValidPosition(table, draggingGroup.group, previewRotation, relX, relY, assignedGroups, sourceAg)) {
        const newSourceList = [...(assignedGroups[draggingMeta.tableId] || [])]
        newSourceList.splice(draggingMeta.agIdx ?? -1, 1)
        setAssignedGroups({
          ...assignedGroups,
          [draggingMeta.tableId]: newSourceList,
          [table.id]: [...current, { ...sourceAg, rotation: previewRotation, x: relX, y: relY }]
        })
      }
    } else {
      const group = draggingGroup.group
      const totalOccupied = current.reduce((sum, a) => sum + a.group.size, 0) + group.size
      if (totalOccupied <= table.capacity && isValidPosition(table, group, previewRotation, relX, relY, assignedGroups)) {
        setAssignedGroups({
          ...assignedGroups,
          [table.id]: [...current, { group, rotation: previewRotation, locked: false, x: relX, y: relY, color: PALETTE[0] }]
        })
        setGroups(groups.filter((_, idx) => idx !== groupIndex))
      }
    }

    setDragOverPosition(null)
    setDraggingGroup(null)
    setDraggingMeta(null)
    setPreviewRotation(0)
    touchStartRef.current = null
  }

  function handleAssignedTouchStart(e: React.TouchEvent, tableId: string, agIdx: number) {
    const ag = assignedGroups[tableId]?.[agIdx]
    if (!ag) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    setDraggingGroup({ group: ag.group, rotation: ag.rotation })
    setDraggingMeta({ tableId, agIdx })
  }

  function handleAssignedTouchEnd(e: React.TouchEvent, tableId: string, agIdx: number) {
    if (!draggingGroup || !draggingMeta || !draggingMeta.tableId) {
      setDraggingGroup(null)
      setDragOverPosition(null)
      setDraggingMeta(null)
      touchStartRef.current = null
      return
    }

    if (dragOverPosition && room) {
      const targetTable = room.tables.find(t => t.id === dragOverPosition.tableId)
      if (targetTable) {
        const sourceAg = assignedGroups[draggingMeta.tableId]?.[draggingMeta.agIdx ?? -1]
        if (sourceAg) {
          const current = assignedGroups[targetTable.id] || []
          if (isValidPosition(targetTable, draggingGroup.group, previewRotation, dragOverPosition.x, dragOverPosition.y, assignedGroups, sourceAg)) {
            const newSourceList = [...(assignedGroups[draggingMeta.tableId] || [])]
            newSourceList.splice(draggingMeta.agIdx ?? -1, 1)
            setAssignedGroups({
              ...assignedGroups,
              [draggingMeta.tableId]: newSourceList,
              [targetTable.id]: [...current, { ...sourceAg, rotation: previewRotation, x: dragOverPosition.x, y: dragOverPosition.y }]
            })
          }
        }
      }
    }

    setDragOverPosition(null)
    setDraggingGroup(null)
    setDraggingMeta(null)
    setPreviewRotation(0)
    touchStartRef.current = null
  }

  // Load room definition from localStorage on mount
  useEffect(() => {
    const stored = loadRoomFromStorage()
    if (stored) {
      setRoom(stored)
      
      // Try to load event data (groups and assigned groups)
      try {
        const currentEvent = localStorage.getItem('currentEvent')
        if (currentEvent) {
          const event = JSON.parse(currentEvent)
          if (event.groups && Array.isArray(event.groups)) {
            const normalizedGroups = event.groups.map((g: Group) => ({ ...g, salutation: g.salutation || 'Fam' }))
            setGroups(normalizedGroups)
          }
          if (event.assignedGroups && typeof event.assignedGroups === 'object') {
            const normalizedAssigned: Record<string, AssignedGroup[]> = {}
            Object.entries(event.assignedGroups).forEach(([tid, ags]) => {
              normalizedAssigned[tid] = (ags as AssignedGroup[]).map(ag => ({ ...ag, group: { ...ag.group, salutation: ag.group.salutation || 'Fam' } }))
            })
            setAssignedGroups(normalizedAssigned)
          }
          if (event.lastModified) {
            setLastSaveTime(event.lastModified)
          }
        }
      } catch (err) {
        console.error('Event-Daten konnten nicht geladen werden', err)
      }
    } else {
      setLoadError('Kein gespeicherter Raum gefunden. Bitte im Editor speichern und erneut öffnen.')
    }
  }, [])

  // Drag tracking for preview; skip collision against the item being moved.
  useEffect(() => {
    if (!draggingGroup) return

    const handleMouseMove = (e: MouseEvent) => {
      updatePreviewPosition({ clientX: e.clientX, clientY: e.clientY })
    }

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault()
      updatePreviewPosition({ clientX: e.clientX, clientY: e.clientY })
    }

    const handleContextMenu = (e: MouseEvent) => {
      // Verhindere Kontextmenü während Drag
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDragEnd = (e: DragEvent) => {
      // Globaler Drop-Handler: Wenn losgelassen wird und Position gültig ist (grün), dann platzieren
      if (!dragOverPosition || !room) {
        setDraggingGroup(null)
        setDragOverPosition(null)
        setDraggingMeta(null)
        setPreviewRotation(0)
        return
      }

      const table = room.tables.find(t => t.id === dragOverPosition.tableId)
      if (!table) {
        setDraggingGroup(null)
        setDragOverPosition(null)
        setDraggingMeta(null)
        setPreviewRotation(0)
        return
      }

      const relX = dragOverPosition.x
      const relY = dragOverPosition.y

      if (draggingMeta?.tableId) {
        // Bewegung von existierender Gruppe
        const sourceAg = assignedGroups[draggingMeta.tableId]?.[draggingMeta.agIdx ?? -1]
        if (sourceAg && isValidPosition(table, draggingGroup.group, previewRotation, relX, relY, assignedGroups, sourceAg)) {
          if (draggingMeta.tableId === table.id) {
            // Gleicher Tisch, nur Position ändern
            setAssignedGroups({
              ...assignedGroups,
              [table.id]: assignedGroups[table.id].map((a, i) => i === draggingMeta.agIdx ? { ...a, x: relX, y: relY, rotation: previewRotation } : a)
            })
          } else {
            // Anderer Tisch
            const newSourceList = [...(assignedGroups[draggingMeta.tableId] || [])]
            newSourceList.splice(draggingMeta.agIdx ?? -1, 1)
            const current = assignedGroups[table.id] || []
            setAssignedGroups({
              ...assignedGroups,
              [draggingMeta.tableId]: newSourceList,
              [table.id]: [...current, { ...sourceAg, rotation: previewRotation, x: relX, y: relY }]
            })
          }
        }
      } else {
        // Neue Gruppe von der Liste
        const group = draggingGroup.group
        if (group.toGo) {
          setDraggingGroup(null)
          setDragOverPosition(null)
          setDraggingMeta(null)
          setPreviewRotation(0)
          return
        }
        const current = assignedGroups[table.id] || []
        const totalOccupied = current.reduce((sum, a) => sum + a.group.size, 0) + group.size
        if (totalOccupied <= table.capacity && isValidPosition(table, group, previewRotation, relX, relY, assignedGroups)) {
          setAssignedGroups({
            ...assignedGroups,
            [table.id]: [...current, { group, rotation: previewRotation, locked: false, x: relX, y: relY, color: PALETTE[0] }]
          })
          // Entferne Gruppe aus der verfügbaren Liste
          const groupIndex = groups.findIndex(g => g.name === group.name && g.size === group.size)
          if (groupIndex !== -1) {
            setGroups(groups.filter((_, idx) => idx !== groupIndex))
          }
        }
      }

      setDragOverPosition(null)
      setDraggingGroup(null)
      setDraggingMeta(null)
      setPreviewRotation(0)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('dragover', handleGlobalDragOver)
    document.addEventListener('contextmenu', handleContextMenu, true)
    document.addEventListener('dragend', handleDragEnd)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('dragover', handleGlobalDragOver)
      document.removeEventListener('contextmenu', handleContextMenu, true)
      document.removeEventListener('dragend', handleDragEnd)
    }
  }, [draggingGroup, draggingMeta, room, assignedGroups, dragOverPosition, previewRotation, groups])

  useEffect(() => {
    draggingGroupRef.current = draggingGroup
  }, [draggingGroup])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!draggingGroupRef.current) return
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setPreviewRotation(prev => (prev + 1) % 8)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  // Data actions
  function handleImport(parsed: Group[]) {
    const enriched = parsed.map(g => ({ ...g, salutation: g.salutation || 'Fam' }))
    const toGo = enriched.filter(g => g.toGo)
    const rest = enriched.filter(g => !g.toGo)
    const updatedAssigned = ensureToGoBucket({ ...assignedGroups })
    updatedAssigned['TOGO'] = [
      ...(updatedAssigned['TOGO'] || []),
      ...toGo.map(g => ({ group: g, rotation: 0, locked: false, x: 0, y: 0, color: TOGO_COLOR }))
    ]
    setAssignedGroups(updatedAssigned)
    setGroups([...groups, ...rest])
  }

  function addGroup() {
    const name = newGroupName.trim()
    const size = parseInt(newGroupSize) || 0
    if (!name) {
      alert('Name ist erforderlich')
      return
    }
    if (size <= 0) {
      alert('Personenzahl muss größer als 0 sein')
      return
    }
    const group = { name, size, time: newGroupTime || undefined, toGo: newGroupToGo, salutation: newGroupSalutation }
    if (group.toGo) {
      const updatedAssigned = ensureToGoBucket({ ...assignedGroups })
      updatedAssigned['TOGO'] = [...(updatedAssigned['TOGO'] || []), { group, rotation: 0, locked: false, x: 0, y: 0, color: TOGO_COLOR }]
      setAssignedGroups(updatedAssigned)
    } else {
      setGroups([...groups, group])
    }
    setNewGroupName('')
    setNewGroupSalutation('Fam')
    setNewGroupSize('4')
    setNewGroupTime('')
    setNewGroupToGo(false)
    setShowModal(false)
  }

  function handleSaveEvent() {
    setEventSaveName(localStorage.getItem('currentEvent') ? JSON.parse(localStorage.getItem('currentEvent') || '{}').name : 'Event')
    setShowEventSaveModal(true)
  }

  function saveEventSilently() {
    const current = JSON.parse(localStorage.getItem('currentEvent') || '{}')
    const name = current.name || `Event ${new Date().toLocaleDateString()}`
    const event = { ...current }
    event.name = name
    if (!event.createdAt) event.createdAt = new Date().toLocaleDateString()
    const now = new Date()
    event.lastModified = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    event.assignedGroups = assignedGroups
    event.groups = groups
    const list = JSON.parse(localStorage.getItem('events') || '[]')
    const updated = list.map((e: any) => e.id === event.id ? event : e)
    if (!updated.find((e: any) => e.id === event.id)) updated.push(event)
    localStorage.setItem('events', JSON.stringify(updated))
    localStorage.setItem('currentEvent', JSON.stringify(event))
    setLastSaveTime(event.lastModified)
    setLastSaveType('auto')
    setIsDirty(false)
  }

  function handleCsvImportClick() {
    // Erst Event still speichern, dann Import öffnen
    if (isDirty) {
      saveEventSilently()
    }
    setCsvPreview([])
    setCsvFile(null)
    setShowCsvImportModal(true)
  }

  function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0])
      setCsvPreview([])
    }
  }

  function parseCsvPreview() {
    if (!csvFile) {
      alert('Bitte wähle eine CSV-Datei aus')
      return
    }

    Papa.parse(csvFile, {
      skipEmptyLines: true,
      complete: (results: any) => {
        const rows = results.data
        const parsed: Group[] = []
        const startIndex = rows[0] && (rows[0][0] === 'Name' || rows[0][0] === 'name') ? 1 : 0

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length < 3) continue

          const name = String(row[0] || '').trim()
          const time = String(row[1] || '').trim()
          const size = parseInt(row[2])

          if (name && size > 0) {
            parsed.push({
              name,
              size,
              time: time || undefined,
              toGo: false,
              salutation: 'Fam'
            })
          }
        }

        if (parsed.length === 0) {
          alert('Keine gültigen Familien in der CSV-Datei gefunden')
          setCsvPreview([])
          return
        }

        setCsvPreview(parsed)
      },
      error: (error: any) => {
        alert(`Fehler beim Lesen der CSV-Datei: ${error.message}`)
      }
    })
  }

  function updateCsvPreview(idx: number, patch: Partial<Group>) {
    setCsvPreview(prev => prev.map((g, i) => i === idx ? { ...g, ...patch, salutation: patch.salutation || g.salutation || 'Fam' } : g))
  }

  function removeCsvPreviewRow(idx: number) {
    setCsvPreview(prev => prev.filter((_, i) => i !== idx))
  }

  function applyCsvPreview() {
    if (csvPreview.length === 0) {
      alert('Bitte zuerst "Einlesen" ausführen und Daten prüfen')
      return
    }

    const enriched = csvPreview.map(g => ({ ...g, salutation: g.salutation || 'Fam' }))
    const toGo = enriched.filter(g => g.toGo)
    const rest = enriched.filter(g => !g.toGo)
    const updatedAssigned = ensureToGoBucket({ ...assignedGroups })

    if (toGo.length) {
      updatedAssigned['TOGO'] = [
        ...(updatedAssigned['TOGO'] || []),
        ...toGo.map(g => ({ group: g, rotation: 0, locked: false, x: 0, y: 0, color: TOGO_COLOR }))
      ]
    }

    if (rest.length) {
      setGroups([...groups, ...rest])
    }

    setAssignedGroups(updatedAssigned)
    setIsDirty(true)
    setShowCsvImportModal(false)
    setCsvFile(null)
    setCsvPreview([])
  }

  function confirmSaveEvent(name: string) {
    const event = JSON.parse(localStorage.getItem('currentEvent') || '{}')
    event.name = name || event.name || `Event ${new Date().toLocaleDateString()}`
    if (!event.createdAt) event.createdAt = new Date().toLocaleDateString()
    const now = new Date()
    event.lastModified = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    event.assignedGroups = assignedGroups
    event.groups = groups
    const list = JSON.parse(localStorage.getItem('events') || '[]')
    const updated = list.map((e: any) => e.id === event.id ? event : e)
    if (!updated.find((e: any) => e.id === event.id)) updated.push(event)
    localStorage.setItem('events', JSON.stringify(updated))
    localStorage.setItem('currentEvent', JSON.stringify(event))
    setShowEventSaveModal(false)
    const timeStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    setLastSaveTime(timeStr)
    setLastSaveType('manual')
    setIsDirty(false)
    alert('Event gespeichert!')
  }

  // Autosave countdown + save after 10 minutes of unsaved changes
  const [autosaveRemaining, setAutosaveRemaining] = useState<number | null>(null)
  useEffect(() => {
    if (!isDirty) {
      setAutosaveRemaining(null)
      return
    }
    // Reset countdown to 10 minutes on any change while dirty
    setAutosaveRemaining(10 * 60)
    const interval = setInterval(() => {
      setAutosaveRemaining(prev => (prev === null ? null : Math.max(0, prev - 1)))
    }, 1000)
    const timeout = setTimeout(() => {
      saveEventSilently()
      setAutosaveRemaining(null)
    }, 10 * 60 * 1000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [isDirty, assignedGroups, groups])

  function autoAssign() {
    if (!room) return
    const tables = room.tables

    const availableMovable = groups.filter(g => !g.toGo)
    const toGoAvail = groups.filter(g => g.toGo)

    const existingToGo = assignedGroups['TOGO'] || []

    const lockedByTable: Record<string, AssignedGroup[]> = {}
    const previouslyPlaced: AssignedGroup[] = []
    for (const t of tables) {
      const ags = assignedGroups[t.id] || []
      lockedByTable[t.id] = ags.filter(a => a.locked)
      previouslyPlaced.push(...ags.filter(a => !a.locked && !a.group.toGo))
    }

    const prevKeys = new Set(previouslyPlaced.map(ag => groupKey(ag.group)))
    const movable = [...availableMovable, ...previouslyPlaced.map(ag => ag.group)]
    const { nextByTable: proposal, placedKeys, notPlaced } = greedyReLayout(tables, lockedByTable, movable)
    const lostSomePrev = [...prevKeys].some(k => !placedKeys.has(k))

    let finalAssigned: Record<string, AssignedGroup[]>
    let finalAvailable: Group[]

    if (!lostSomePrev) {
      finalAssigned = proposal
      finalAvailable = notPlaced
    } else {
      const keepByTable: Record<string, AssignedGroup[]> = {}
      for (const t of tables) keepByTable[t.id] = [...(assignedGroups[t.id] || [])]
      const { nextByTable, notPlaced: remaining } = fillOnly(tables, keepByTable, availableMovable)
      finalAssigned = nextByTable
      finalAvailable = remaining
    }

    const togoEntries: AssignedGroup[] = []
    const seen = new Set<string>()
    function pushToGo(g: Group) {
      const k = groupKey(g)
      if (seen.has(k)) return
      seen.add(k)
      togoEntries.push({ group: { ...g, salutation: g.salutation || 'Fam' }, rotation: 0, locked: false, x: 0, y: 0, color: TOGO_COLOR })
    }
    for (const ag of existingToGo) pushToGo(ag.group)
    for (const g of toGoAvail) pushToGo(g)
    for (const t of tables) {
      for (const ag of (assignedGroups[t.id] || [])) if (ag.group.toGo) pushToGo(ag.group)
    }

    const nextAssigned: Record<string, AssignedGroup[]> = {}
    for (const t of tables) nextAssigned[t.id] = finalAssigned[t.id] || []
    nextAssigned['TOGO'] = togoEntries

    setAssignedGroups(nextAssigned)
    setGroups(finalAvailable.filter(g => !g.toGo))
    setHasAutoAssigned(true)
  }

  const preview = useMemo(() => {
    if (!room || !draggingGroup || !dragOverPosition) return null
    const table = room.tables.find(t => t.id === dragOverPosition.tableId)
    if (!table) return null
    const skipAg = draggingMeta?.tableId ? assignedGroups[draggingMeta.tableId]?.[draggingMeta.agIdx ?? -1] : undefined
    const positions = getPositionsForSize(draggingGroup.group.size, previewRotation, table.width, table.height)
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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      width: '100%', 
      background: '#f8fafc',
      transformOrigin: 'top left',
      transform: `scale(${uiScale})`,
      ...(uiScale !== 1 && { width: `${100 / uiScale}%`, height: `${100 / uiScale}%` })
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '16px 24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isMobile && (
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '20px',
                fontWeight: '600',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px',
                minHeight: '44px'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              aria-label="Toggle Sidebar"
            >☰</button>
          )}
          <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', transition: 'opacity 0.2s' }}>
            <span style={{ fontSize: '20px', cursor: 'pointer' }} title="Zurück zur Hauptseite">←</span>
          </Link>
          <h1 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', color: 'white', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Raum - Plätze belegen</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            onClick={() => navigate('/new-room')}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >Raum bearbeiten</button>
          <button 
            onClick={() => handleSaveEvent()} 
            disabled={!isDirty || !Object.keys(assignedGroups).some(tid => tid !== 'TOGO' && (assignedGroups[tid]?.length || 0) > 0)}
            style={{ 
              padding: '8px 16px',
              background: isDirty && Object.keys(assignedGroups).some(tid => tid !== 'TOGO' && (assignedGroups[tid]?.length || 0) > 0) ? '#10b981' : 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              cursor: isDirty && Object.keys(assignedGroups).some(tid => tid !== 'TOGO' && (assignedGroups[tid]?.length || 0) > 0) ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              opacity: isDirty && Object.keys(assignedGroups).some(tid => tid !== 'TOGO' && (assignedGroups[tid]?.length || 0) > 0) ? 1 : 0.5
            }}
          >
            💾 Event speichern
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {typeof autosaveRemaining === 'number' && (
              <span style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.95)', background: 'rgba(0,0,0,0.25)', padding: '4px 10px', borderRadius: '10px' }}>
                Auto in {String(Math.floor(autosaveRemaining / 60)).padStart(2, '0')}:{String(autosaveRemaining % 60).padStart(2, '0')}
              </span>
            )}
            {lastSaveTime && (
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.2)', padding: '4px 12px', borderRadius: '12px' }}>
                {lastSaveType === 'auto' ? 'Auto gespeichert: ' : 'Zuletzt: '}{lastSaveTime}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="room-content" style={{ flex: 1, display: 'flex', overflowX: 'hidden', overflowY: 'auto' }}>
        {/* Sidebar - conditionally visible on mobile */}
        {(sidebarOpen || !isMobile) && (
        <div className="sidebar" style={{ 
          flex: '0 0 580px', 
          minWidth: '500px', 
          maxWidth: '680px', 
          background: 'white',
          boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minHeight: 0,
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto',
          ...(isMobile && {
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 1000,
            maxHeight: '100vh',
            minWidth: '85vw',
            maxWidth: '85vw'
          })
        }}>
          {isMobile && (
            <button 
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '8px 12px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close Sidebar"
            >✕</button>
          )}          <button 
            onClick={() => setShowModal(true)}
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(102,126,234,0.3)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >+ Familie anlegen</button>
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button 
              onClick={autoAssign}
              style={{
                flex: 1,
                height: '35px',
                padding: '0 16px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#667eea'; e.currentTarget.style.color = 'white'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#667eea'; }}
            >
              {hasAutoAssigned ? '🔄 Neu zuweisen' : '✨ Automatisch zuweisen'}
            </button>
            <button
              onClick={handleCsvImportClick}
              style={{
                flex: 1,
                height: '35px',
                padding: '0 16px',
                background: 'white',
                color: '#10b981',
                border: '2px solid #10b981',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = 'white'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#10b981'; }}
            >
              📥 Import (CSV)
            </button>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#e0e7ff', padding: '4px 12px', borderRadius: '12px', fontSize: '14px' }}>{groups.length}</span>
                Verfügbare Familien
              </h3>
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>
                <button
                  onClick={() => setSortAvailable('name')}
                  style={{
                    padding: '4px 8px',
                    background: sortAvailable === 'name' ? '#667eea' : 'transparent',
                    color: sortAvailable === 'name' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  title="Nach Name sortieren"
                >A-Z</button>
                <button
                  onClick={() => setSortAvailable('time')}
                  style={{
                    padding: '4px 8px',
                    background: sortAvailable === 'time' ? '#667eea' : 'transparent',
                    color: sortAvailable === 'time' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  title="Nach Uhrzeit sortieren"
                >🕐</button>
                <button
                  onClick={() => setSortAvailable('size')}
                  style={{
                    padding: '4px 8px',
                    background: sortAvailable === 'size' ? '#667eea' : 'transparent',
                    color: sortAvailable === 'size' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  title="Nach Personenzahl sortieren"
                >#</button>
              </div>
            </div>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <div className="groups-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {(() => {
              const sortedGroups = [...groups].sort((a, b) => {
                if (sortAvailable === 'name') {
                  return a.name.localeCompare(b.name)
                } else if (sortAvailable === 'time') {
                  if (!a.time && !b.time) return 0
                  if (!a.time) return 1
                  if (!b.time) return -1
                  return a.time.localeCompare(b.time)
                } else {
                  return b.size - a.size
                }
              })

              const PAGE_SIZE = 10
              const totalPages = Math.max(1, Math.ceil(sortedGroups.length / PAGE_SIZE))
              const currentPage = Math.min(availablePage, totalPages - 1)
              const pageItems = sortedGroups.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

              return pageItems.map((g, i) => {
              const salutation = g.salutation || 'Fam'
              const displaySalutation = salutation === 'Fam' ? 'Fam.' : salutation
              const displayName = `${displaySalutation} ${g.name}`
              return (
                <div
                  key={`${currentPage}-${i}`}
                  className="group-item"
                  style={{ 
                    color: '#1e293b', 
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid ' + (g.toGo ? '#fbbf24' : '#e2e8f0'),
                    cursor: g.toGo ? 'default' : 'move',
                    transition: 'all 0.2s',
                    fontSize: '13px'
                  }}
                  onMouseOver={e => !g.toGo && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                  onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                  draggable={!g.toGo}
                  onDragStart={e => {
                    if (g.toGo) return
                    e.dataTransfer.setData('text/plain', JSON.stringify({ index: i, ...g }))
                    setDraggingGroup({ group: g, rotation: 0 })
                    setDraggingMeta(null)
                    setPreviewRotation(0)
                  }}
                  onTouchStart={e => handleTouchStart(e, g, i)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={e => handleTouchEnd(e, i)}
                  onContextMenu={e => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, tableId: '', agIdx: -1, isList: true, listIdx: i })
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px', alignItems: 'center', fontSize: '13px', color: '#475569' }}>
                    <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2', fontWeight: '700', fontSize: '14px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                    </div>
                    <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center' }}>
                      <span aria-hidden style={{ fontSize: '13px' }}>🕐</span>
                      <span>{g.time ? `Uhrzeit: ${g.time}` : 'Uhrzeit: offen'}</span>
                    </div>
                    <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span aria-hidden style={{ fontSize: '13px' }}>👥</span>
                      <span>Personen: {g.size}</span>
                    </div>
                    <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                      <span aria-hidden style={{ fontSize: '13px' }}>{g.toGo ? '🥘' : '🪑'}</span>
                      <span>{g.toGo ? 'ToGo' : 'Tisch: offen'}</span>
                    </div>
                  </div>
                </div>
              )
              })
            })()}
          </div>
          </div>
          {(() => {
            const sortedGroups = [...groups].sort((a, b) => {
              if (sortAvailable === 'name') {
                return a.name.localeCompare(b.name)
              } else if (sortAvailable === 'time') {
                if (!a.time && !b.time) return 0
                if (!a.time) return 1
                if (!b.time) return -1
                return a.time.localeCompare(b.time)
              } else {
                return b.size - a.size
              }
            })
            const PAGE_SIZE = 10
            const totalPages = Math.max(1, Math.ceil(sortedGroups.length / PAGE_SIZE))
            const currentPage = Math.min(availablePage, totalPages - 1)
            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => setAvailablePage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    background: currentPage === 0 ? '#f8fafc' : 'white',
                    color: currentPage === 0 ? '#cbd5e1' : '#0f172a',
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    minWidth: '60px'
                  }}
                >Zurück</button>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setAvailablePage(i)}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        border: '1px solid #cbd5e1',
                        background: i === currentPage ? '#667eea' : 'white',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      aria-label={`Seite ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setAvailablePage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    background: currentPage >= totalPages - 1 ? '#f8fafc' : 'white',
                    color: currentPage >= totalPages - 1 ? '#cbd5e1' : '#0f172a',
                    cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    minWidth: '60px'
                  }}
                >Weiter</button>
              </div>
            )
          })()}
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#dbeafe', padding: '4px 12px', borderRadius: '12px', fontSize: '14px' }}>{Object.values(assignedGroups).flat().length}</span>
                Zugewiesene Familien
              </h3>
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>
                <button
                  onClick={() => setSortAssigned('name')}
                  style={{
                    padding: '4px 8px',
                    background: sortAssigned === 'name' ? '#667eea' : 'transparent',
                    color: sortAssigned === 'name' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  title="Nach Name sortieren"
                >A-Z</button>
                <button
                  onClick={() => setSortAssigned('time')}
                  style={{
                    padding: '4px 8px',
                    background: sortAssigned === 'time' ? '#667eea' : 'transparent',
                    color: sortAssigned === 'time' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  title="Nach Uhrzeit sortieren"
                >🕐</button>
                <button
                  onClick={() => setSortAssigned('table')}
                  style={{
                    padding: '4px 8px',
                    background: sortAssigned === 'table' ? '#667eea' : 'transparent',
                    color: sortAssigned === 'table' ? 'white' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  title="Nach Tischnummer sortieren"
                >🪑</button>
              </div>
            </div>
          <div style={{ maxHeight: '400px', overflow: 'hidden' }}>
            <div className="assigned-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {(() => {
              const assignedItems = Object.entries(assignedGroups)
                .flatMap(([tableId, ags]) => ags.map((ag, idx) => ({ tableId, ag, idx })))
                .sort((a, b) => {
                  if (sortAssigned === 'name') {
                    return a.ag.group.name.localeCompare(b.ag.group.name)
                  } else if (sortAssigned === 'time') {
                    const timeA = a.ag.group.time || ''
                    const timeB = b.ag.group.time || ''
                    if (!timeA && !timeB) return 0
                    if (!timeA) return 1
                    if (!timeB) return -1
                    return timeA.localeCompare(timeB)
                  } else {
                    if (a.tableId === 'TOGO' && b.tableId !== 'TOGO') return 1
                    if (a.tableId !== 'TOGO' && b.tableId === 'TOGO') return -1
                    if (a.tableId === 'TOGO' && b.tableId === 'TOGO') return 0
                    const numA = parseInt(a.tableId.slice(1))
                    const numB = parseInt(b.tableId.slice(1))
                    return numA - numB
                  }
                })

              const PAGE_SIZE = 10
              const totalPages = Math.max(1, Math.ceil(assignedItems.length / PAGE_SIZE))
              const currentPage = Math.min(assignedPage, totalPages - 1)
              const pageItems = assignedItems.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

              return pageItems.map(({ tableId, ag, idx }) => {
                const salutation = ag.group.salutation || 'Fam'
                const displaySalutation = salutation === 'Fam' ? 'Fam.' : salutation
                const displayName = `${displaySalutation} ${ag.group.name}`
                const isToGo = tableId === 'TOGO'
                return (
                  <div
                    key={`${tableId}-${idx}`}
                    className="assigned-item"
                    style={{
                      background: isToGo ? '#fef3c7' : (assignedColors[tableId]?.[idx] || '#e0e7ff'),
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid ' + (isToGo ? '#fbbf24' : '#c7d2fe'),
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '13px'
                    }}
                    onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                    onTouchStart={e => handleAssignedTouchStart(e, tableId, idx)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={e => handleAssignedTouchEnd(e, tableId, idx)}
                    onContextMenu={e => {
                      e.preventDefault()
                      setContextMenu({ x: e.clientX, y: e.clientY, tableId, agIdx: idx, isList: false, isAssignedList: true })
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px', alignItems: 'center', fontSize: '13px', color: '#475569' }}>
                      <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2', fontWeight: '700', fontSize: '14px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                      </div>
                      <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center' }}>
                        <span aria-hidden style={{ fontSize: '13px' }}>🕐</span>
                        <span>{ag.group.time ? `Uhrzeit: ${ag.group.time}` : 'Uhrzeit: offen'}</span>
                      </div>
                      <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span aria-hidden style={{ fontSize: '13px' }}>👥</span>
                        <span>Personen: {ag.group.size}</span>
                      </div>
                      <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                        <span aria-hidden style={{ fontSize: '13px' }}>{isToGo ? '🥘' : '🪑'}</span>
                        <span>{isToGo ? 'ToGo' : `Tisch: ${tableId.slice(1)}`}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
            </div>
          </div>
          </div>
          {(() => {
            const totalItems = Object.values(assignedGroups).flat().length
            const PAGE_SIZE = 10
            const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
            const currentPage = Math.min(assignedPage, totalPages - 1)
            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => setAssignedPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    background: currentPage === 0 ? '#f8fafc' : 'white',
                    color: currentPage === 0 ? '#cbd5e1' : '#0f172a',
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    minWidth: '60px'
                  }}
                >Zurück</button>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setAssignedPage(i)}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        border: '1px solid #cbd5e1',
                        background: i === currentPage ? '#667eea' : 'white',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      aria-label={`Seite ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setAssignedPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    background: currentPage >= totalPages - 1 ? '#f8fafc' : 'white',
                    color: currentPage >= totalPages - 1 ? '#cbd5e1' : '#0f172a',
                    cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    minWidth: '60px'
                  }}
                >Weiter</button>
              </div>
            )
          })()}
          </div>
        </div>
        )}
        {/* Backdrop für Mobile Sidebar */}
        {isMobile && sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999
            }}
          />
        )}

        {/* Sub-Header: View Toggle Bar - Sticky unter dem Header mit radialem Design */}
        <div className="no-print" style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 19,
          background: 'linear-gradient(180deg, #667eea 0%, #5a67d8 100%)',
          padding: '10px 24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* View Toggle Buttons - Segmented Control */}
          <div style={{ 
            display: 'inline-flex', 
            gap: '2px', 
            background: 'rgba(255,255,255,0.15)', 
            padding: '4px', 
            borderRadius: '8px',
            backdropFilter: 'blur(8px)'
          }}>
            <button
              onClick={() => setViewMode('map')}
              style={{
                padding: '8px 20px',
                background: viewMode === 'map' ? 'rgba(255,255,255,0.95)' : 'transparent',
                color: viewMode === 'map' ? '#667eea' : 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'map' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
              }}
              title="Kartenansicht"
            >
              📍 Karte
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '8px 20px',
                background: viewMode === 'timeline' ? 'rgba(255,255,255,0.95)' : 'transparent',
                color: viewMode === 'timeline' ? '#667eea' : 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'timeline' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
              }}
              title="Zeitplanansicht"
            >
              📋 Plan
            </button>
          </div>

          {/* Zeitintervall Dropdown - nur in Zeitplan-Ansicht */}
          {viewMode === 'timeline' && (
            <select 
              value={timeInterval} 
              onChange={e => setTimeInterval(parseInt(e.target.value))}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.3)', 
                fontSize: '14px',
                fontWeight: '600',
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s',
                backdropFilter: 'blur(8px)'
              }}
            >
              <option value={5} style={{ background: '#667eea', color: 'white' }}>⏱️ 5 Min</option>
              <option value={10} style={{ background: '#667eea', color: 'white' }}>⏱️ 10 Min</option>
              <option value={15} style={{ background: '#667eea', color: 'white' }}>⏱️ 15 Min</option>
            </select>
          )}

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s',
              backdropFilter: 'blur(8px)'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            title="Drucken oder als PDF speichern"
          >
            🖨️ PDF
          </button>
        </div>

        {/* Main area - switches between map and timeline */}
        <div className="room-layout" style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '12px', position: 'relative', minWidth: 0, minHeight: 0 }}>

          {/* Content area with top padding to avoid toggle overlap */}
          <div
            ref={mapContainerRef}
            style={{
              paddingTop: '60px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '40px 12px 12px',
              width: '100%',
              overflow: 'hidden',
              maxHeight: 'calc(100vh - 180px)'
            }}
          >
            {viewMode === 'map' ? (
              <div style={{ 
                transform: `scale(${mapScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.3s ease'
              }}>
                {/* Viewport crops to the content bounds (frame or bbox) */}
                <div style={{ width: gridBounds.width * CELL_SIZE, height: gridBounds.height * CELL_SIZE, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -gridBounds.minX * CELL_SIZE, top: -gridBounds.minY * CELL_SIZE }}>
                    <div
                      className="grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                      gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                      border: '2px solid #cbd5e1',
                      width: GRID_SIZE * CELL_SIZE + 'px',
                      height: GRID_SIZE * CELL_SIZE + 'px',
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      background: 'white',
                      backgroundImage: `
                        linear-gradient(to right, #e2e8f0 1px, transparent 1px),
                        linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
                      `,
                      backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                      backgroundOrigin: 'content-box'
                    }}
                    onDrop={e => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const x = Math.floor((e.clientX - rect.left) / (CELL_SIZE * mapScale))
              const y = Math.floor((e.clientY - rect.top) / (CELL_SIZE * mapScale))
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
                if (data.toGo) {
                  setDragOverPosition(null)
                  setDraggingGroup(null)
                  setDraggingMeta(null)
                  setPreviewRotation(0)
                  return
                }
                const group = { name: data.name, size: data.size, time: data.time, toGo: data.toGo, salutation: data.salutation || 'Fam' }
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
            onTouchMove={e => {
              if (!draggingGroup) return
              e.preventDefault()
              const touch = e.touches[0]
              updatePreviewPosition({ clientX: touch.clientX, clientY: touch.clientY })
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
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '2px solid #94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    borderRadius: '8px',
                    backgroundImage: `
                      linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)
                    `,
                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                    backgroundOrigin: 'content-box',
                    backgroundPosition: `${-table.x * CELL_SIZE - 2}px ${-table.y * CELL_SIZE - 2}px`,
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: '700',
                    position: 'absolute',
                    top: '-28px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(102,126,234,0.3)',
                    letterSpacing: '0.3px',
                    zIndex: 5
                  }}>
                    🪑 Tisch {table.id.slice(1)} • {occupied}/{table.capacity}
                  </div>
                </div>
              )
            })}
            {/* Render all assigned groups directly on the grid */}
            {Object.entries(assignedGroups).map(([tableId, ags]) =>
              ags.map((ag, idx) => {
                const table = room.tables.find(t => t.id === tableId)
                if (!table) return null
                const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height)
                return positions.map((pos, pidx) => (
                  <div
                    key={`${tableId}-${idx}-${pidx}`}
                    draggable={!ag.locked}
                    onDragStart={e => {
                      if (!ag.locked) {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ tableId, agIdx: idx, ...ag.group }))
                        setDraggingGroup({ group: ag.group, rotation: ag.rotation })
                        setDraggingMeta({ tableId, agIdx: idx })
                        setPreviewRotation(ag.rotation)
                      }
                    }}
                    onTouchStart={e => !ag.locked && handleAssignedTouchStart(e, tableId, idx)}
                    onTouchEnd={e => !ag.locked && handleAssignedTouchEnd(e, tableId, idx)}
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
                      fontSize: '9px',
                      cursor: ag.locked ? 'default' : 'move',
                      zIndex: 10,
                      border: '1px solid rgba(0,0,0,0.15)',
                      borderRadius: '6px',
                      padding: '4px',
                      textAlign: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                    }}
                    onDoubleClick={() => {
                      setAssignedGroups({
                        ...assignedGroups,
                        [tableId]: ags.map(a => a === ag ? { ...a, locked: !a.locked } : a)
                      })
                    }}
                  >
                    {pidx === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', width: '100%', height: '100%', textAlign: 'center', overflow: 'hidden' }}>
                        <div style={{ fontSize: '7px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', maxWidth: '100%', letterSpacing: '0.2px', wordBreak: 'break-word', lineHeight: '1.1' }}>{ag.locked ? '🔒 ' : ''}{ag.group.name}</div>
                        {ag.group.time && <div style={{ fontSize: '6px', opacity: 0.9, lineHeight: '1' }}>🕐 {ag.group.time.slice(0, 5)}</div>}
                        <div style={{ fontSize: '7px', fontWeight: '600' }}>👥 {ag.group.size}</div>
                      </div>
                    ) : ''
}

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
          </div>
          ) : (
            <TimelineView groups={groups} assignedGroups={assignedGroups} timeInterval={timeInterval} />
          )}
          </div>
        </div>
      </div>
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 9999,
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
          }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {contextMenu.isList ? (
            <>
              <button
                onClick={() => {
                  const group = groups[contextMenu.listIdx!]
                  setTableSelectModal({ group, index: contextMenu.listIdx! })
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#1e293b',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid #f1f5f9'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                📌 Zuweisen
              </button>
              <button
                onClick={() => {
                  setEditModal({ tableId: '', agIdx: -1, isList: true, listIdx: contextMenu.listIdx })
                  setEditName(groups[contextMenu.listIdx!].name)
                  setEditSalutation((groups[contextMenu.listIdx!].salutation as 'Fam' | 'Frau' | 'Herr') || 'Fam')
                  setEditSize(groups[contextMenu.listIdx!].size.toString())
                  setEditTime(groups[contextMenu.listIdx!].time || '')
                  setEditToGo(Boolean(groups[contextMenu.listIdx!].toGo))
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#1e293b',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid #f1f5f9'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                ✏️ Bearbeiten
              </button>
              <button
                onClick={() => {
                  setGroups(groups.filter((_, i) => i !== contextMenu.listIdx))
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#ef4444',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                🗑️ Löschen
              </button>
            </>
          ) : contextMenu.isAssignedList ? (
            <>
              <button
                onClick={() => {
                  const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                  setGroups([...groups, ag.group])
                  setAssignedGroups({
                    ...assignedGroups,
                    [contextMenu.tableId]: assignedGroups[contextMenu.tableId].filter((_, i) => i !== contextMenu.agIdx)
                  })
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#1e293b',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid #f1f5f9'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                ↩️ Entfernen
              </button>
              <button
                onClick={() => {
                  setEditModal({ tableId: contextMenu.tableId, agIdx: contextMenu.agIdx, isList: false })
                  const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                  setEditName(ag.group.name)
                  setEditSalutation((ag.group.salutation as 'Fam' | 'Frau' | 'Herr') || 'Fam')
                  setEditSize(ag.group.size.toString())
                  setEditTime(ag.group.time || '')
                  setEditToGo(Boolean(ag.group.toGo))
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#1e293b',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid #f1f5f9'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                ✏️ Bearbeiten
              </button>
              <button
                onClick={() => {
                  setAssignedGroups({
                    ...assignedGroups,
                    [contextMenu.tableId]: assignedGroups[contextMenu.tableId].filter((_, i) => i !== contextMenu.agIdx)
                  })
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#ef4444',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                🗑️ Löschen
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                  setGroups([...groups, ag.group])
                  setAssignedGroups({
                    ...assignedGroups,
                    [contextMenu.tableId]: assignedGroups[contextMenu.tableId].filter((_, i) => i !== contextMenu.agIdx)
                  })
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#1e293b',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid #f1f5f9'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                ↩️ Entfernen
              </button>
              <button
                onClick={() => {
                  const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                  setAssignedGroups({
                    ...assignedGroups,
                    [contextMenu.tableId]: assignedGroups[contextMenu.tableId].map(a => a === ag ? { ...a, locked: !a.locked } : a)
                  })
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#1e293b',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid #f1f5f9'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                {assignedGroups[contextMenu.tableId][contextMenu.agIdx].locked ? '🔓' : '🔒'} Sperren
              </button>
              <button
                onClick={() => {
                  const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                  setAssignedGroups({
                    ...assignedGroups,
                    [contextMenu.tableId]: assignedGroups[contextMenu.tableId].map(a => a === ag ? { ...a, rotation: (a.rotation + 1) % 4 } : a)
                  })
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#1e293b',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid #f1f5f9'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                🔄 Rotieren
              </button>
              <button
                onClick={() => {
                  setEditModal({ tableId: contextMenu.tableId, agIdx: contextMenu.agIdx, isList: false })
                  const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
                  setEditName(ag.group.name)
                  setEditSalutation((ag.group.salutation as 'Fam' | 'Frau' | 'Herr') || 'Fam')
                  setEditSize(ag.group.size.toString())
                  setEditTime(ag.group.time || '')
                  setEditToGo(Boolean(ag.group.toGo))
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#1e293b',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid #f1f5f9'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                ✏️ Bearbeiten
              </button>
              <button
                onClick={() => {
                  setAssignedGroups({
                    ...assignedGroups,
                    [contextMenu.tableId]: assignedGroups[contextMenu.tableId].filter((_, i) => i !== contextMenu.agIdx)
                  })
                  setContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#ef4444',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                🗑️ Löschen
              </button>
            </>
          )}
        </div>
      )}
      {tableSelectModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 400 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>Tisch auswählen</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>Wähle einen Tisch für <strong>{tableSelectModal.group.name}</strong> ({tableSelectModal.group.size} Personen)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
              {room?.tables.map(table => {
                const current = assignedGroups[table.id] || []
                const occupied = current.reduce((sum, a) => sum + a.group.size, 0)
                const available = table.capacity - occupied
                const canFit = available >= tableSelectModal.group.size
                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      if (tableSelectModal.group.toGo || !canFit) return
                      setAssignedGroups({
                        ...assignedGroups,
                        [table.id]: [...current, { group: tableSelectModal.group, rotation: 0, locked: false, x: 0, y: 0, color: PALETTE[0] }]
                      })
                      setGroups(groups.filter((_, i) => i !== tableSelectModal.index))
                      setTableSelectModal(null)
                    }}
                    style={{
                      padding: '12px',
                      background: canFit ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e2e8f0',
                      color: canFit ? 'white' : '#94a3b8',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: canFit ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseOver={e => {
                      if (canFit) e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    Tisch {table.id.slice(1)}
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>{occupied}/{table.capacity} Plätze</span>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setTableSelectModal(null)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseOut={e => e.currentTarget.style.background = 'white'}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 400 }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>Familie anlegen</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Name *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={newGroupSalutation}
                    onChange={e => setNewGroupSalutation(e.target.value as 'Fam' | 'Frau' | 'Herr')}
                    style={{
                      minWidth: '90px',
                      padding: '10px 8px',
                      fontSize: '13px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      background: 'white',
                      fontWeight: '600',
                      color: '#475569'
                    }}
                  >
                    <option value="Fam">Fam.</option>
                    <option value="Frau">Frau</option>
                    <option value="Herr">Herr</option>
                  </select>
                  <input
                    type="text"
                    placeholder="z.B. Müller"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addGroup()}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: `2px solid ${newGroupName.trim() ? '#667eea' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Personenzahl *</label>
                <input
                  type="number"
                  placeholder="z.B. 4"
                  value={newGroupSize}
                  onChange={e => setNewGroupSize(e.target.value)}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Uhrzeit (optional)</label>
                <input
                  type="time"
                  value={newGroupTime}
                  onChange={e => setNewGroupTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input
                  type="checkbox"
                  checked={newGroupToGo}
                  onChange={e => setNewGroupToGo(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#475569' }}>ToGo (kein Tisch)</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={addGroup}
                  disabled={!newGroupName.trim() || parseInt(newGroupSize) <= 0}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: newGroupName.trim() && parseInt(newGroupSize) > 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: newGroupName.trim() && parseInt(newGroupSize) > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    if (newGroupName.trim() && parseInt(newGroupSize) > 0) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)'
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  ✓ Hinzufügen
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'white',
                    color: '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#f1f5f9'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'white'
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 400 }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>Bearbeiten</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Name</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={editSalutation}
                    onChange={e => setEditSalutation(e.target.value as 'Fam' | 'Frau' | 'Herr')}
                    style={{
                      minWidth: '90px',
                      padding: '10px 8px',
                      fontSize: '13px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      background: 'white',
                      fontWeight: '600',
                      color: '#475569'
                    }}
                  >
                    <option value="Fam">Fam.</option>
                    <option value="Frau">Frau</option>
                    <option value="Herr">Herr</option>
                  </select>
                  <input
                    type="text"
                    placeholder="z.B. Müller"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Personenzahl</label>
                <input
                  type="number"
                  placeholder="z.B. 4"
                  value={editSize}
                  onChange={e => setEditSize(e.target.value)}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Uhrzeit (optional)</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editToGo}
                  onChange={e => setEditToGo(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#475569' }}>ToGo (kein Tisch)</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => {
                    const size = parseInt(editSize) || 1
                    if (editModal.isList) {
                      setGroups(groups.map((g, i) => i === editModal.listIdx ? { name: editName || `Familie ${i + 1}`, size, time: editTime || undefined, toGo: editToGo, salutation: editSalutation || 'Fam' } : g))
                    } else {
                      setAssignedGroups({
                        ...assignedGroups,
                        [editModal.tableId]: assignedGroups[editModal.tableId].map((ag, i) => i === editModal.agIdx ? { ...ag, group: { ...ag.group, name: editName || ag.group.name, size, time: editTime || undefined, toGo: editToGo, salutation: editSalutation || 'Fam' } } : ag)
                      })
                    }
                    setEditModal(null)
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  ✓ Speichern
                </button>
                <button
                  onClick={() => setEditModal(null)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'white',
                    color: '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {resizeModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 400 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>Familiengröße anpassen</h3>
            <div style={{ background: '#e0e7ff', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px' }}>
              <p style={{ margin: '0', fontSize: '14px', color: '#4f46e5', fontWeight: '500' }}>Verfügbare Plätze am Tisch: <strong>{resizeModal.maxSize}</strong></p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Neue Größe</label>
                <input
                  type="number"
                  placeholder="z.B. 4"
                  value={resizeValue}
                  onChange={e => setResizeValue(e.target.value)}
                  min="1"
                  max={resizeModal.maxSize}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const size = Math.min(Math.max(parseInt(resizeValue) || 1, 1), resizeModal.maxSize)
                    setAssignedGroups({
                      ...assignedGroups,
                      [resizeModal.tableId]: assignedGroups[resizeModal.tableId].map((ag, i) => 
                        i === resizeModal.agIdx ? { ...ag, group: { ...ag.group, size } } : ag
                      )
                    })
                    setResizeModal(null)
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  ✓ Anpassen
                </button>
                <button
                  onClick={() => setResizeModal(null)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'white',
                    color: '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCsvImportModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 520, maxWidth: 720 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>Familien aus CSV importieren</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569' }}>Format: Name, Uhrzeit (optional), Personenanzahl. Header-Zeile wird ignoriert. Nach dem Einlesen kannst du die Einträge prüfen und anpassen.</p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
              <input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} style={{ flex: 1 }} />
              <button
                onClick={parseCsvPreview}
                style={{
                  padding: '10px 14px',
                  background: '#0ea5e9',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
              >Einlesen</button>
            </div>
            {csvFile && (
              <div style={{ padding: '8px 12px', background: '#e0f2fe', borderRadius: '6px', marginBottom: '12px', color: '#0ea5e9', fontWeight: 600 }}>
                Gewählt: {csvFile.name}
              </div>
            )}
            {csvPreview.length > 0 ? (
              <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', marginBottom: '12px', background: '#f8fafc' }}>
                {csvPreview.map((row, idx) => (
                  <div key={`csv-row-${idx}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 0.8fr auto', gap: '8px', alignItems: 'center', padding: '6px', borderBottom: '1px solid #e2e8f0' }}>
                    <input
                      value={row.name}
                      onChange={e => updateCsvPreview(idx, { name: e.target.value })}
                      placeholder="Name"
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                    <input
                      type="time"
                      value={row.time || ''}
                      onChange={e => updateCsvPreview(idx, { time: e.target.value })}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                    <input
                      type="number"
                      min={1}
                      value={row.size}
                      onChange={e => updateCsvPreview(idx, { size: Math.max(1, parseInt(e.target.value) || 1) })}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0f172a', paddingLeft: '6px' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(row.toGo)}
                        onChange={e => updateCsvPreview(idx, { toGo: e.target.checked })}
                      />
                      ToGo
                    </label>
                    <button
                      onClick={() => removeCsvPreviewRow(idx)}
                      style={{
                        padding: '8px 10px',
                        background: 'white',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px', color: '#475569', marginBottom: '12px' }}>
                Noch keine Vorschau. Datei wählen und "Einlesen" klicken, dann erscheinen die Zeilen hier.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#475569' }}>{csvPreview.length} Zeilen bereit</span>
              <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowCsvImportModal(false); setCsvFile(null); setCsvPreview([]) }}
                  style={{
                    padding: '10px 14px',
                    background: 'white',
                    color: '#0ea5e9',
                    border: '2px solid #0ea5e9',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >Abbrechen</button>
                <button
                  onClick={applyCsvPreview}
                  disabled={csvPreview.length === 0}
                  style={{
                    padding: '10px 16px',
                    background: csvPreview.length === 0 ? '#cbd5e1' : '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: csvPreview.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    minWidth: '160px'
                  }}
                >In Liste übernehmen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEventSaveModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 400 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>Event speichern</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Event-Name</label>
                <input
                  type="text"
                  value={eventSaveName}
                  onChange={e => setEventSaveName(e.target.value)}
                  placeholder="z.B. Sommerfest 2026"
                  onKeyPress={e => e.key === 'Enter' && confirmSaveEvent(eventSaveName)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: `2px solid ${eventSaveName.trim() ? '#667eea' : '#e2e8f0'}`,
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => confirmSaveEvent(eventSaveName)}
                  disabled={!eventSaveName.trim()}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: eventSaveName.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: eventSaveName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    if (eventSaveName.trim()) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)'
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  💾 Speichern
                </button>
                <button
                  onClick={() => setShowEventSaveModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'white',
                    color: '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ensureToGoBucket(map: Record<string, AssignedGroup[]>): Record<string, AssignedGroup[]> {
  if (!map['TOGO']) map['TOGO'] = []
  return map
}

function TimelineView({ 
  groups, 
  assignedGroups, 
  timeInterval 
}: { 
  groups: Group[]
  assignedGroups: Record<string, AssignedGroup[]>
  timeInterval: number
}) {
  const allGroupsWithTime = groups.map(g => ({ group: g, tableId: null as string | null }))
  const assignedGroupsList: Array<{ group: Group; tableId: string }> = []
  
  Object.entries(assignedGroups).forEach(([tableId, ags]) => {
    ags.forEach(ag => {
      assignedGroupsList.push({ group: ag.group, tableId })
    })
  })

  const unassignedNoTime = allGroupsWithTime.filter(g => !g.group.time)
  const unassignedWithTime = allGroupsWithTime.filter(g => g.group.time)
  const assignedNoTime = assignedGroupsList.filter(g => !g.group.time)
  const assignedWithTime = assignedGroupsList.filter(g => g.group.time)

  const allWithTime = [...unassignedWithTime.map(g => ({ ...g, isAssigned: false })), ...assignedWithTime.map(g => ({ ...g, isAssigned: true }))]
  const sorted = allWithTime.sort((a, b) => (a.group.time || '').localeCompare(b.group.time || ''))
  
  const timeSlots = new Map<string, Array<{ group: Group; tableId: string | null; isAssigned: boolean }>>()
  
  sorted.forEach(item => {
    if (!item.group.time) return
    
    const [hours, minutes] = item.group.time.split(':').map(Number)
    const slotMinutes = Math.floor(minutes / timeInterval) * timeInterval
    const slotTime = `${String(hours).padStart(2, '0')}:${String(slotMinutes).padStart(2, '0')}`
    const endMinutes = (slotMinutes + timeInterval) % 60
    const endHours = hours + (slotMinutes + timeInterval >= 60 ? 1 : 0)
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
    const slotKey = `${slotTime} - ${endTime}`
    
    if (!timeSlots.has(slotKey)) {
      timeSlots.set(slotKey, [])
    }
    timeSlots.get(slotKey)!.push(item)
  })

  const slotEntries = Array.from(timeSlots.entries())

  const columns: Array<Array<[string, typeof slotEntries[0][1]]>> = [[], [], []]
  let currentColumn = 0
  let currentColumnFamilies = 0

  slotEntries.forEach(([slotKey, items]) => {
    const familyCount = items.length
    if (currentColumnFamilies + familyCount > 15 && currentColumn < 2) {
      currentColumn++
      currentColumnFamilies = 0
    }
    columns[currentColumn].push([slotKey, items])
    currentColumnFamilies += familyCount
  })

  const filledColumns = columns.filter(col => col.length > 0)
  const columnCount = Math.min(filledColumns.length, 4)
  const columnGap = '12px'

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {[...unassignedNoTime, ...assignedNoTime].length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '12px', margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Unzugeordnete Familien</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {unassignedNoTime.map((item, i) => (
              <div key={`unassigned-${i}`} style={{ padding: '10px 12px', background: '#f1f5f9', borderLeft: '3px solid #94a3b8', borderRadius: '6px', fontSize: '14px' }}>
                {item.group.name} ({item.group.size} {item.group.toGo ? '| ToGo' : ''})
              </div>
            ))}
            {assignedNoTime.map((item, i) => (
              <div key={`assigned-notime-${i}`} style={{ padding: '10px 12px', background: '#f1f5f9', borderLeft: '3px solid #94a3b8', borderRadius: '6px', fontSize: '14px' }}>
                {item.group.name} ({item.group.size}) - {item.tableId === 'TOGO' ? 'ToGo' : `Tisch ${item.tableId?.slice(1)}`}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columnCount}, 1fr)`, gap: columnGap, alignItems: 'start', width: '100%', overflow: 'hidden' }}>
        {columns.map((columnSlots, colIdx) => (
          <div key={`column-${colIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {columnSlots.map(([slotKey, items]) => {
              const totalPeople = items.reduce((sum, item) => sum + item.group.size, 0)
              const familyCount = items.length
              return (
                <div key={slotKey} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 14px', fontSize: '14px', fontWeight: '700' }}>
                    🕐 {slotKey}
                  </div>
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                      {familyCount} Familien • {totalPeople} Personen
                    </div>
                    {items.map((item, i) => (
                      <div key={`${slotKey}-${i}`} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', fontWeight: '500', color: '#1e293b', borderLeft: '4px solid #2196F3', lineHeight: '1.4' }}>
                        <div>{item.group.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          👥 {item.group.size} {item.isAssigned && item.tableId !== 'TOGO' ? `| Tisch ${item.tableId?.slice(1)}` : item.isAssigned && item.tableId === 'TOGO' ? '| ToGo' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}