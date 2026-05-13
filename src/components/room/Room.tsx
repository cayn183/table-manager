// ============================================================================
// IMPORTS
// ============================================================================
import React, { useEffect, useLayoutEffect, useMemo, useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import userStorage from '../../utils/userStorage'
import { syncUserData } from '../../utils/sync'
import Importer, { Group } from './Importer'
import Papa from 'papaparse'
import { bestFitAssign } from '../../utils/placement'
import type { Table, ViewFrame, Room as RoomType, AssignedGroup, DraggingMeta } from '../../types/room'
import { generateOptimalSeating, getPerpendicularOrientation } from '../../utils/layoutUtils'
import {
  PALETTE,
  TOGO_COLOR,
  GRID_HEIGHT,
  GRID_WIDTH,
  CELL_SIZE,
  paletteColor,
  STORAGE_KEY,
  getPositionsForSize,
  isValidPosition,
  positionsAreConnected,
  loadRoomFromStorage,
  ensureToGoBucket,
  greedyReLayout,
  fillOnly,
  groupKey,
  buildOccupied,
  tryPlaceOnTable,
  generateUUID
} from '../../utils/roomUtils'
import { openPrintDocument } from '../../utils/printUtils'
import logger from '../../utils/logger'
import { usePageHeader } from '../layout/PageHeaderContext'
import ReservationConfigPanel from '../reservation/ReservationConfigPanel'
import { useDeviceType } from '../../utils/useDeviceType'
import RoomMobile from './RoomMobile'

// ============================================================================
// MAIN COMPONENT: Room
// ============================================================================

// Helper function to calculate optimal font size for text based on length
function getResponsiveFontSize(text: string): number {
  // Einfache Berechnung basierend auf Textlänge
  // Kurze Namen (< 15 Zeichen): 14px
  // Mittlere Namen (15-25 Zeichen): 12px  
  // Lange Namen (> 25 Zeichen): 10px
  if (text.length < 15) return 14
  if (text.length < 25) return 12
  return 10
}

// Optional props for embedding Room inside a club event (seating tab)
export interface ClubEventSeatingProps {
  tables: Table[]
  viewFrame: ViewFrame | null
  initialGroups: Group[]
  initialAssignedGroups: Record<string, AssignedGroup[]>
  onSave: (groups: Group[], assignedGroups: Record<string, AssignedGroup[]>) => Promise<void>
  readOnly?: boolean
  onOpenRoomEditor?: () => void
}

export default function Room({ clubEventProps }: { clubEventProps?: ClubEventSeatingProps } = {}) {
  const navigate = useNavigate()
  const auth = useAuth()
  const device = useDeviceType()
  const isClubEventMode = !!clubEventProps
  const userId = auth.user ? auth.user.id : null
  const gridHeightVar = clubEventProps?.gridHeight ?? GRID_HEIGHT
  const gridWidthVar = clubEventProps?.gridWidth ?? GRID_WIDTH
  
  // --------------------------------------------------------------------------
  // STATE: Core Data
  // --------------------------------------------------------------------------
  const [room, setRoom] = useState<RoomType | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [assignedGroups, setAssignedGroups] = useState<Record<string, AssignedGroup[]>>({})
  const [currentEventId, setCurrentEventId] = useState<string | null>(null)
  
  // --------------------------------------------------------------------------
  // STATE: Modals & UI Controls
  // --------------------------------------------------------------------------
  const [showEventSaveModal, setShowEventSaveModal] = useState(false)
  const [showReservationPanel, setShowReservationPanel] = useState(false)
  const [eventSaveName, setEventSaveName] = useState('')
  const [isSavingEvent, setIsSavingEvent] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null)
  const [lastSaveType, setLastSaveType] = useState<'auto' | 'manual' | null>(null)
  const [saveToast, setSaveToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [timeInterval, setTimeInterval] = useState(15)
  const [viewMode, setViewMode] = useState<'map' | 'timeline'>('map')
  const [sortAvailable, setSortAvailable] = useState<'name' | 'time' | 'size'>('name')
  const [sortAssigned, setSortAssigned] = useState<'name' | 'time' | 'table'>('table')
  const [listView, setListView] = useState<'available' | 'assigned'>('available')
  const [multiSelectAvailable, setMultiSelectAvailable] = useState(false)
  const [selectedAvailableKeys, setSelectedAvailableKeys] = useState<Set<string>>(new Set())
  const [multiSelectAssigned, setMultiSelectAssigned] = useState(false)
  const [selectedAssignedKeys, setSelectedAssignedKeys] = useState<Set<string>>(new Set())
  const [batchTableSelectModal, setBatchTableSelectModal] = useState<Group[] | null>(null)
  const [batchMoveTableModal, setBatchMoveTableModal] = useState<{ count: number } | null>(null)
  const [batchRemoveAssignmentModal, setBatchRemoveAssignmentModal] = useState<{ count: number } | null>(null)
  const [batchDeleteConfirmModal, setBatchDeleteConfirmModal] = useState<{ count: number } | null>(null)

  // State: UI and interaction
  const [showModal, setShowModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupSalutation, setNewGroupSalutation] = useState<'Fam' | 'Frau' | 'Herr'>('Fam')
  const [newGroupSize, setNewGroupSize] = useState('4')
  const [newGroupTime, setNewGroupTime] = useState('')
  const [newGroupToGo, setNewGroupToGo] = useState(false)
  const [newGroupAccessible, setNewGroupAccessible] = useState(false)
  const [newGroupNote, setNewGroupNote] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId: string; agIdx: number; isList: boolean; listIdx?: number; isAssignedList?: boolean } | null>(null)
  const [tableContextMenu, setTableContextMenu] = useState<{ x: number; y: number; tableId: string } | null>(null)
  const [editModal, setEditModal] = useState<{ tableId: string; agIdx: number; isList: boolean; listIdx?: number } | null>(null)
  const [resizeModal, setResizeModal] = useState<{ tableId: string; agIdx: number; maxSize: number } | null>(null)
  const [resizeValue, setResizeValue] = useState('1')
  const [tableSelectModal, setTableSelectModal] = useState<{ group: Group; index: number } | null>(null)
  const [showCsvImportModal, setShowCsvImportModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvFileEncoding, setCsvFileEncoding] = useState<string | null>(null)
  const [csvPreview, setCsvPreview] = useState<Group[]>([])
  const [dragOverPosition, setDragOverPosition] = useState<{ tableId: string; x: number; y: number } | null>(null)
  const [draggingGroup, setDraggingGroup] = useState<{ group: Group; rotation: number } | null>(null)
  const [draggingMeta, setDraggingMeta] = useState<DraggingMeta>(null)
  const [previewRotation, setPreviewRotation] = useState<number>(0)
  const [rotationOverride, setRotationOverride] = useState<number | null>(null)
  const [heldCursor, setHeldCursor] = useState<{ x: number; y: number } | null>(null)
  const [editName, setEditName] = useState('')
  const [editSalutation, setEditSalutation] = useState<'Fam' | 'Frau' | 'Herr'>('Fam')
  const [editSize, setEditSize] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editToGo, setEditToGo] = useState(false)
  const [editAccessible, setEditAccessible] = useState(false)
  const [hasAutoAssigned, setHasAutoAssigned] = useState(false)
  const [assignedPage, setAssignedPage] = useState(0)
  const [availablePage, setAvailablePage] = useState(0)
  const [mapScale, setMapScale] = useState(1)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [uiScale, setUiScale] = useState(1)
  const draggingGroupRef = useRef<{ group: Group; rotation: number } | null>(null)

  // Undo/Redo-Stack (max 5 Schritte) + Refs für stabile Keyboard-Handler
  const undoStackRef = useRef<Array<{ assignedGroups: Record<string, AssignedGroup[]>; groups: Group[] }>>([]);
  const redoStackRef = useRef<Array<{ assignedGroups: Record<string, AssignedGroup[]>; groups: Group[] }>>([]);
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)
  const assignedGroupsRef = useRef<Record<string, AssignedGroup[]>>({})
  const groupsRef = useRef<Group[]>([])

  // --------------------------------------------------------------------------
  // HELPER: Find best rotation for optimal gap-filling placement
  // --------------------------------------------------------------------------
  const findBestRotation = useCallback((
    table: Table,
    group: Group,
    targetX: number,
    targetY: number,
    currentAssigned: Record<string, AssignedGroup[]>,
    skipAg?: AssignedGroup
  ): number => {
    const debug = typeof window !== 'undefined' && localStorage.getItem('debugPlacement') === '1'
    const isVertical = getPerpendicularOrientation(table.rotation ?? 0) === 'VERTICAL'
    const countIsolatedGaps = (occ: Set<string>) => {
      let gaps = 0
      for (let ty = 0; ty < table.height; ty++) {
        for (let tx = 0; tx < table.width; tx++) {
          const key = `${tx},${ty}`
          if (!occ.has(key)) {
            const emptyNeighbors = [
              `${tx - 1},${ty}`,
              `${tx + 1},${ty}`,
              `${tx},${ty - 1}`,
              `${tx},${ty + 1}`
            ].filter(nk => {
              const [nx, ny] = nk.split(',').map(Number)
              return nx >= 0 && nx < table.width && ny >= 0 && ny < table.height && !occ.has(nk)
            }).length

            if (emptyNeighbors === 0) {
              gaps += 3
            } else if (emptyNeighbors === 1) {
              gaps += 2
            } else if (emptyNeighbors === 2) {
              gaps += 1
            }
          }
        }
      }
      return gaps
    }
    // Build occupied set for scoring
    const occupied = new Set<string>()
    for (const ag of (currentAssigned[table.id] || [])) {
      if (ag === skipAg) continue
      const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
      for (const pos of positions) {
        occupied.add(`${ag.x + pos.x},${ag.y + pos.y}`)
      }
    }
    const isolatedGapsBefore = countIsolatedGaps(occupied)

    let bestRotation = 0
    let bestScore = -Infinity
    const validRotations: Array<{ rot: number; score: number }> = []

    // Test all 8 rotations
    for (let rot = 0; rot < 8; rot++) {
      const positions = getPositionsForSize(group.size, rot, table.width, table.height, table.rotation)
      
      // Skip layouts that are internally disconnected (would split the family)
      if (!positionsAreConnected(positions)) continue

      // Check if valid at target position
      if (!isValidPosition(table, group, rot, targetX, targetY, currentAssigned, skipAg)) {
        continue
      }

      // Score based on neighbors and gap filling
      let score = 0
      
      // 1. Adjacency score: Strong bonus for placing next to existing groups
      for (const pos of positions) {
        const absX = targetX + pos.x
        const absY = targetY + pos.y
        
        // Check all 4 neighbors
        const neighbors = [
          `${absX - 1},${absY}`,
          `${absX + 1},${absY}`,
          `${absX},${absY - 1}`,
          `${absX},${absY + 1}`
        ]
        
        for (const neighbor of neighbors) {
          if (occupied.has(neighbor)) {
            score += 25 // Very strong preference for adjacent placement
          }
        }
        
        // Check diagonal neighbors too (weaker bonus)
        const diagonals = [
          `${absX - 1},${absY - 1}`,
          `${absX + 1},${absY - 1}`,
          `${absX - 1},${absY + 1}`,
          `${absX + 1},${absY + 1}`
        ]
        
        for (const diagonal of diagonals) {
          if (occupied.has(diagonal)) {
            score += 8 // Bonus for diagonal adjacency
          }
        }
      }

      // 2. Simulate placement and evaluate resulting gaps
      const tempOccupied = new Set(occupied)
      for (const pos of positions) {
        tempOccupied.add(`${targetX + pos.x},${targetY + pos.y}`)
      }

      const isolatedGapsAfter = countIsolatedGaps(tempOccupied)
      score -= isolatedGapsAfter * 10 // Strong penalty for fragmentation

      // 3. Compactness bonus: prefer arrangements that cluster people together
      // Count how many positions touch each other within the group
      let internalAdjacency = 0
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const p1 = positions[i]
          const p2 = positions[j]
          const dx = Math.abs(p1.x - p2.x)
          const dy = Math.abs(p1.y - p2.y)
          if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            internalAdjacency++
          }
        }
      }
      score += internalAdjacency * 4

      // 2-person preference: opposite first, adjacent only if it fills gaps
      if (positions.length === 2) {
        const [a, b] = positions
        const gapReduction = isolatedGapsBefore - isolatedGapsAfter
        if (isVertical) {
          const isOpposite = a.y === b.y && a.x !== b.x
          const isAdjacent = a.x === b.x && Math.abs(a.y - b.y) === 1
          const isDiagonal = a.x !== b.x && a.y !== b.y
          if (isOpposite) score += 30
          if (isAdjacent) score += gapReduction > 0 ? 4 : -18
          if (isDiagonal) score -= 8
        } else {
          const isOpposite = a.x === b.x && a.y !== b.y
          const isAdjacent = a.y === b.y && Math.abs(a.x - b.x) === 1
          const isDiagonal = a.x !== b.x && a.y !== b.y
          if (isOpposite) score += 30
          if (isAdjacent) score += gapReduction > 0 ? 4 : -18
          if (isDiagonal) score -= 8
        }
      }

      validRotations.push({ rot, score })
      if (debug) {
        logger.debug('rotation', { phase: 'findBestRotation', table: table.id, group: group.size, rot, targetX, targetY, score })
      }

      if (score > bestScore) {
        bestScore = score
        bestRotation = rot
      }
    }

    // Fallback: if no valid rotation found, try first valid one
    if (validRotations.length === 0) {
      // Try to find ANY valid rotation
      for (let rot = 0; rot < 8; rot++) {
        if (isValidPosition(table, group, rot, targetX, targetY, currentAssigned, skipAg)) {
          return rot
        }
      }
      return 0 // Last resort
    }

    return bestRotation
  }, [])

  useEffect(() => {
    if (!multiSelectAvailable || listView !== 'available') {
      setSelectedAvailableKeys(new Set())
    }
  }, [multiSelectAvailable, listView])

  useEffect(() => {
    if (!multiSelectAssigned || listView !== 'assigned') {
      setSelectedAssignedKeys(new Set())
    }
  }, [multiSelectAssigned, listView])

  // Auto-hide save toast after 3 seconds
  useEffect(() => {
    if (!saveToast) return
    const timer = setTimeout(() => setSaveToast(null), 3000)
    return () => clearTimeout(timer)
  }, [saveToast])

  const assignedKey = (tableId: string, idx: number) => `${tableId}|${idx}`


  // Calculate bounding box for tables or explicit view frame
  const gridBounds = useMemo(() => {
    if (!room) {
      return { minX: 0, minY: 0, maxX: gridWidthVar, maxY: gridHeightVar, width: gridWidthVar, height: gridHeightVar }
    }

    // If a custom view frame exists, honor it directly (clamped to grid)
    if (room.viewFrame) {
      const vf = room.viewFrame
      const minX = Math.max(0, vf.x)
      const minY = Math.max(0, vf.y)
      const maxX = Math.min(gridWidthVar, vf.x + vf.width)
      const maxY = Math.min(gridHeightVar, vf.y + vf.height)
      const width = Math.max(1, maxX - minX)
      const height = Math.max(1, maxY - minY)
      return { minX, minY, maxX, maxY, width, height }
    }

    if (room.tables.length === 0) {
      return { minX: 0, minY: 0, maxX: gridWidthVar, maxY: gridHeightVar, width: gridWidthVar, height: gridHeightVar }
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
    const paddedMaxX = Math.min(gridWidthVar, maxX + 1)
    const paddedMaxY = Math.min(gridHeightVar, maxY + 1)
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

      const paddingPx = room?.viewFrame ? 16 : 40
      const availableW = Math.max(200, el.clientWidth - paddingPx)
      const availableH = Math.max(200, el.clientHeight - paddingPx)

      const contentW = gridBounds.width * CELL_SIZE
      const contentH = gridBounds.height * CELL_SIZE

      if (contentW === 0 || contentH === 0) return

      const scaleX = availableW / contentW
      const scaleY = availableH / contentH

      // Höhere Max-Scale für große Monitore (4K)
      const screenWidth = window.innerWidth
      const maxScale = room?.viewFrame ? 6 : (screenWidth >= 2560 ? 2.5 : 1.8)

      // Wenn das Grid höher als Standard ist, priorisiere die Breite (vermeide zu starke Verkleinerung der Schrift)
      let scale: number
      if (gridBounds.height > GRID_HEIGHT) {
        scale = scaleX
      } else {
        scale = Math.min(scaleX, scaleY)
      }
      scale = Math.min(maxScale, Math.max(0.3, scale))

      setMapScale(scale)
    }

    recalcScale()
    window.addEventListener('resize', recalcScale)
    return () => window.removeEventListener('resize', recalcScale)
  }, [gridBounds, room])

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
  // Optimiert: nur Tische, die in assignedGroups existieren
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

    // Nur nicht-leere Tische verarbeiten
    Object.entries(assignedGroups).forEach(([tableId, ags]) => {
      if (ags.length === 0) return
      const table = room?.tables.find(t => t.id === tableId)
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

  // Track dirty state: when groups or assignedGroups change, mark as dirty and clamp pagination
  useEffect(() => {
    setIsDirty(true)
    const totalPages = Math.max(1, Math.ceil(Object.values(assignedGroups).flat().length / 20))
    setAssignedPage(prev => Math.min(prev, totalPages - 1))
  }, [groups, assignedGroups])

  // ----- Statistiken für Header (Tische, Plätze, Familien, ToGo) -----
  const headerStats = useMemo(() => {
    const tableCount = room?.tables.length ?? 0
    const totalSeats = room?.tables.reduce((s, t) => s + (t.capacity ?? 0), 0) ?? 0

    let assignedCount = 0
    let toGoPersons = 0

    // Build occupancy per table (exclude TOGO bucket)
    const occupancyByTable: Record<string, number> = {}
    Object.entries(assignedGroups).forEach(([key, arr]) => {
      if (key === 'TOGO') {
        for (const ag of arr) {
          assignedCount++
          toGoPersons += ag.group.size
        }
      } else {
        let sum = occupancyByTable[key] || 0
        for (const ag of arr) {
          assignedCount++
          if (ag.group.toGo) {
            toGoPersons += ag.group.size
          } else {
            sum += ag.group.size
          }
        }
        occupancyByTable[key] = sum
      }
    })

    // Free seats are per-unlocked-table: capacity - occupied
    let freeSeats = 0
    for (const t of room?.tables || []) {
      if (t.locked) continue
      const occ = occupancyByTable[t.id] || 0
      freeSeats += Math.max(0, (t.capacity ?? 0) - occ)
    }

    const familyCount = (groups?.length ?? 0) + assignedCount

    // occupied (for display) = totalSeats - lockedSeats - freeSeats
    const lockedSeats = (room?.tables || []).filter(t => t.locked).reduce((s, t) => s + (t.capacity ?? 0), 0)
    const occupied = Math.max(0, totalSeats - lockedSeats - freeSeats)

    return { tableCount, totalSeats, occupied, freeSeats, familyCount, toGoPersons }
  }, [room, assignedGroups, groups])

  // ----- Inject page-specific controls into the unified AppLayout header -----
  const { setPageTitle, setHeaderContent } = usePageHeader()

  useEffect(() => {
    if (isClubEventMode) return
    setPageTitle('Gäste platzieren')
    return () => { setPageTitle(null); setHeaderContent(null) }
  }, [isClubEventMode, setPageTitle, setHeaderContent])

  useEffect(() => {
    if (isClubEventMode) return
    setHeaderContent(
      <div style={{ width: '100%', minHeight: '70px', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: '0 1 185px', minWidth: 0, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {currentEventId && (
            <button
              onClick={() => setShowReservationPanel(true)}
              title="Reservierungsseite verwalten"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px 14px', borderRadius: '999px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08))',
                border: '1px solid rgba(255,255,255,0.6)', color: 'white',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)', whiteSpace: 'nowrap'
              }}
            >🎟️ Reservierung</button>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', minHeight: '70px', flexWrap: 'wrap', paddingLeft: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 12px 20px rgba(0,0,0,0.25)' }}>
            <button
              onClick={() => setViewMode('map')}
              style={{
                padding: '8px 18px',
                background: viewMode === 'map' ? 'rgba(255,255,255,0.35)' : 'transparent',
                color: 'white',
                border: viewMode === 'map' ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === 'map' ? '0 6px 16px rgba(0,0,0,0.25)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >📍 Kartenansicht</button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '8px 18px',
                background: viewMode === 'timeline' ? 'rgba(255,255,255,0.35)' : 'transparent',
                color: 'white',
                border: viewMode === 'timeline' ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === 'timeline' ? '0 6px 16px rgba(0,0,0,0.25)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >📋 Zeitplanansicht</button>
          </div>

          {viewMode === 'timeline' && (
            <select
              value={timeInterval}
              onChange={e => setTimeInterval(parseInt(e.target.value))}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                minWidth: '130px'
              }}
            >
              <option value={5} style={{ background: '#667eea' }}>⏱️ 5 Min</option>
              <option value={10} style={{ background: '#667eea' }}>⏱️ 10 Min</option>
              <option value={15} style={{ background: '#667eea' }}>⏱️ 15 Min</option>
            </select>
          )}

          <div style={{ display: 'inline-flex', gap: '12px', alignItems: 'center', padding: '8px 16px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px', fontSize: '13px', color: 'white', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', gap: '14px', fontWeight: 600 }}>
                <span>🪑 {headerStats.tableCount} Tische</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{headerStats.freeSeats} von {headerStats.totalSeats} Plätzen frei</span>
              </div>
              <div style={{ display: 'flex', gap: '14px', fontWeight: 600 }}>
                <span>👪 {headerStats.familyCount} Familien</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>🥡 {headerStats.toGoPersons} ToGo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }, [isClubEventMode, viewMode, timeInterval, headerStats, setHeaderContent, setViewMode, setTimeInterval, currentEventId, showReservationPanel])

  const computePlacementFromClient = useCallback((coords: { clientX: number; clientY: number }) => {
    if (!draggingGroup || !room) return null
    const gridElement = document.querySelector('.grid') as HTMLElement
    if (!gridElement) return null

    const rect = gridElement.getBoundingClientRect()
    const x = Math.floor((coords.clientX - rect.left) / (CELL_SIZE * mapScale))
    const y = Math.floor((coords.clientY - rect.top) / (CELL_SIZE * mapScale))
    const table = room.tables.find(t => x >= t.x && x < t.x + t.width && y >= t.y && y < t.y + t.height)
    if (!table) return null
    if (table.locked) return null

    let relX = x - table.x
    let relY = y - table.y
    const skipAg = draggingMeta?.tableId ? assignedGroups[draggingMeta.tableId]?.[draggingMeta.agIdx ?? -1] : undefined

    // Use smart rotation finding for best gap-filling placement unless user overrides rotation
    let rotation = rotationOverride ?? findBestRotation(table, draggingGroup.group, relX, relY, assignedGroups, skipAg)

    if (!isValidPosition(table, draggingGroup.group, rotation, relX, relY, assignedGroups, skipAg)) {
      const positions = getPositionsForSize(draggingGroup.group.size, rotation, table.width, table.height, table.rotation)
      const maxX = Math.max(...positions.map(p => p.x))
      const maxY = Math.max(...positions.map(p => p.y))
      relX = Math.min(relX, table.width - 1 - maxX)
      relY = Math.min(relY, table.height - 1 - maxY)
      relX = Math.max(relX, 0)
      relY = Math.max(relY, 0)

      // Re-calculate best rotation for adjusted position when not overridden
      if (rotationOverride === null) {
        rotation = findBestRotation(table, draggingGroup.group, relX, relY, assignedGroups, skipAg)
      }
    }

    return { table, relX, relY, rotation, skipAg }
  }, [draggingGroup, room, mapScale, draggingMeta, assignedGroups, rotationOverride, findBestRotation])

  const updatePreviewPosition = useCallback((coords: { clientX: number; clientY: number }) => {
    const placement = computePlacementFromClient(coords)
    if (!placement) {
      setDragOverPosition(null)
      return
    }
    setPreviewRotation(placement.rotation)
    setDragOverPosition({ tableId: placement.table.id, x: placement.relX, y: placement.relY })
  }, [computePlacementFromClient])

  const startPickGroup = useCallback((group: Group, meta: DraggingMeta, rotation: number) => {
    if (group.toGo) return
    setDraggingGroup({ group, rotation })
    setDraggingMeta(meta)
    setPreviewRotation(rotation)
    setRotationOverride(null)
  }, [])

  const cancelDragging = useCallback(() => {
    setDragOverPosition(null)
    setDraggingGroup(null)
    setDraggingMeta(null)
    setPreviewRotation(0)
    setRotationOverride(null)
    setHeldCursor(null)
  }, [])

  // Undo: aktuellen Zustand vor einer Aktion sichern
  const pushUndo = useCallback(() => {
    const entry = { assignedGroups: assignedGroupsRef.current, groups: groupsRef.current }
    undoStackRef.current = [...undoStackRef.current, entry].slice(-5)
    setUndoCount(undoStackRef.current.length)
    // Neue Aktion löscht Redo-Stack
    redoStackRef.current = []
    setRedoCount(0)
  }, [])

  const performUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    // Aktuellen Zustand in Redo sichern
    const current = { assignedGroups: assignedGroupsRef.current, groups: groupsRef.current }
    redoStackRef.current = [...redoStackRef.current, current].slice(-5)
    setRedoCount(redoStackRef.current.length)
    const stack = [...undoStackRef.current]
    const prev = stack.pop()!
    undoStackRef.current = stack
    setUndoCount(stack.length)
    setAssignedGroups(prev.assignedGroups)
    setGroups(prev.groups)
    setIsDirty(true)
  }, [])

  const performRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    // Aktuellen Zustand in Undo sichern
    const current = { assignedGroups: assignedGroupsRef.current, groups: groupsRef.current }
    undoStackRef.current = [...undoStackRef.current, current].slice(-5)
    setUndoCount(undoStackRef.current.length)
    const stack = [...redoStackRef.current]
    const next = stack.pop()!
    redoStackRef.current = stack
    setRedoCount(stack.length)
    setAssignedGroups(next.assignedGroups)
    setGroups(next.groups)
    setIsDirty(true)
  }, [])

  const rotateGroup = useCallback(() => {
    if (!draggingGroupRef.current) return
    setPreviewRotation(prev => {
      const next = (prev + 1) % 8
      setRotationOverride(next)
      return next
    })
  }, [])

  const mirrorGroup = useCallback(() => {
    if (!draggingGroupRef.current) return
    setPreviewRotation(prev => {
      const next = prev >= 4 ? prev - 4 : prev + 4
      setRotationOverride(next)
      return next
    })
  }, [])

  const cancelDraggingRef = useRef(cancelDragging)
  const performUndoRef = useRef(performUndo)
  const performRedoRef = useRef(performRedo)

  const toggleTableLock = useCallback((tableId: string) => {
    if (!room) return
    const target = room.tables.find(t => t.id === tableId)
    const nextLocked = !target?.locked
    const nextRoom: RoomType = {
      ...room,
      tables: room.tables.map(t => t.id === tableId ? { ...t, locked: !t.locked } : t)
    }
    setRoom(nextRoom)
    if (nextLocked) {
      setSelectedAssignedKeys(prev => {
        const next = new Set<string>()
        prev.forEach(k => {
          if (!k.startsWith(`${tableId}|`)) next.add(k)
        })
        return next
      })
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRoom))
    } catch (err) {
      logger.error('Room', { action: 'lockTable', err })
    }
  }, [room])

  const placeDraggingGroup = useCallback((coords: { clientX: number; clientY: number }) => {
    if (!draggingGroup || !room) return
    const placement = computePlacementFromClient(coords)
    if (!placement) {
      cancelDragging()
      return
    }

    const { table, relX, relY, rotation, skipAg } = placement
    if (table.locked) {
      cancelDragging()
      return
    }

    if (draggingMeta?.tableId) {
      // Bewegung von existierender Gruppe
      const sourceAg = assignedGroups[draggingMeta.tableId]?.[draggingMeta.agIdx ?? -1]
      if (!sourceAg) {
        cancelDragging()
        return
      }

      const valid = isValidPosition(table, draggingGroup.group, rotation, relX, relY, assignedGroups, skipAg)
      if (!valid) {
        cancelDragging()
        return
      }

      pushUndo()
      if (draggingMeta.tableId === table.id) {
        setAssignedGroups({
          ...assignedGroups,
          [table.id]: assignedGroups[table.id].map((a, i) => i === draggingMeta.agIdx ? { ...a, x: relX, y: relY, rotation } : a)
        })
      } else {
        const newSourceList = [...(assignedGroups[draggingMeta.tableId] || [])]
        newSourceList.splice(draggingMeta.agIdx ?? -1, 1)
        const current = assignedGroups[table.id] || []
        const totalOccupied = current.reduce((sum, a) => sum + a.group.size, 0) + draggingGroup.group.size
        if (totalOccupied <= table.capacity) {
          setAssignedGroups({
            ...assignedGroups,
            [draggingMeta.tableId]: newSourceList,
            [table.id]: [...current, { ...sourceAg, rotation, x: relX, y: relY }]
          })
        } else {
          cancelDragging()
          return
        }
      }
    } else {
      // Neue Gruppe von der Liste
      const group = draggingGroup.group
      if (group.toGo) {
        cancelDragging()
        return
      }
      const current = assignedGroups[table.id] || []
      const totalOccupied = current.reduce((sum, a) => sum + a.group.size, 0) + group.size
      const valid = totalOccupied <= table.capacity && isValidPosition(table, group, rotation, relX, relY, assignedGroups)
      if (!valid) {
        cancelDragging()
        return
      }

      pushUndo()
      setAssignedGroups({
        ...assignedGroups,
        [table.id]: [...current, { group, rotation, locked: false, x: relX, y: relY, color: PALETTE[0] }]
      })
      const groupIndex = groups.findIndex(g => g.name === group.name && g.size === group.size)
      if (groupIndex !== -1) {
        setGroups(groups.filter((_, idx) => idx !== groupIndex))
      }
    }

    cancelDragging()
  }, [draggingGroup, draggingMeta, room, assignedGroups, groups, computePlacementFromClient, cancelDragging, pushUndo])


  // Load room definition from localStorage on mount (prefer user-scoped storage)
  useEffect(() => {
    // Club event mode: initialize from props, skip localStorage
    if (clubEventProps) {
      setRoom({ tables: clubEventProps.tables, viewFrame: clubEventProps.viewFrame ?? undefined })
      const normalizedGroups = clubEventProps.initialGroups.map((g: Group) => ({ ...g, salutation: g.salutation || 'Fam' }))
      setGroups(normalizedGroups)
      const normalizedAssigned: Record<string, AssignedGroup[]> = {}
      Object.entries(clubEventProps.initialAssignedGroups).forEach(([tid, ags]) => {
        normalizedAssigned[tid] = ags.map(ag => ({ ...ag, group: { ...ag.group, salutation: ag.group.salutation || 'Fam' } }))
      })
      setAssignedGroups(normalizedAssigned)
      return
    }
    let stored: RoomType | null = null
    try {
      const rawRoom = userStorage.getItem(STORAGE_KEY, auth.user ? auth.user.id : null) || null
      if (rawRoom) stored = JSON.parse(rawRoom as string)
      else stored = loadRoomFromStorage()
    } catch (e) {
      stored = null
    }
    if (stored) {
      setRoom(stored)
      
      // Try to load event data (groups and assigned groups)
      try {
        const rawEvent = userStorage.getItem('currentEvent', auth.user ? auth.user.id : null) || localStorage.getItem('currentEvent')
        if (rawEvent) {
          const event = JSON.parse(rawEvent as string)
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
          if (event.id) {
            setCurrentEventId(event.id)
          }
        }
      } catch (err) {
        logger.error('Room', { action: 'loadEvent', err })
      }
    } else {
      setLoadError('Kein gespeicherter Raum gefunden. Bitte im Editor speichern und erneut öffnen.')
    }
  }, [])

  // Hover tracking for preview; skip collision against the item being moved.
  useEffect(() => {
    if (!draggingGroup) return

    const handleMouseMove = (e: MouseEvent) => {
      setHeldCursor({ x: e.clientX, y: e.clientY })
      updatePreviewPosition({ clientX: e.clientX, clientY: e.clientY })
    }
    document.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [draggingGroup, updatePreviewPosition])

  useEffect(() => {
    draggingGroupRef.current = draggingGroup
  }, [draggingGroup])

  useEffect(() => { assignedGroupsRef.current = assignedGroups }, [assignedGroups])
  useEffect(() => { groupsRef.current = groups }, [groups])
  useEffect(() => { cancelDraggingRef.current = cancelDragging }, [cancelDragging])
  useEffect(() => { performUndoRef.current = performUndo }, [performUndo])
  useEffect(() => { performRedoRef.current = performRedo }, [performRedo])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!draggingGroupRef.current) return
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setPreviewRotation(prev => {
          const next = (prev + 1) % 8
          setRotationOverride(next)
          return next
        })
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        setPreviewRotation(prev => {
          const next = prev >= 4 ? prev - 4 : prev + 4
          setRotationOverride(next)
          return next
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  // Globale Shortcuts: ESC (Ziehen abbrechen), Ctrl+Z (Rükgängig), Ctrl+S (Speichern)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (draggingGroupRef.current) {
          e.preventDefault()
          cancelDraggingRef.current()
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        performUndoRef.current()
        return
      }
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        performRedoRef.current()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        saveEventSilentlyRef.current()
        return
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
    const group = { id: generateUUID(), name, size, time: newGroupTime || undefined, toGo: newGroupToGo, accessible: newGroupAccessible, note: newGroupNote.trim().slice(0,50) || undefined, salutation: newGroupSalutation }
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
    setNewGroupAccessible(false)
    setNewGroupNote('')
    setShowModal(false)
  }

  function handleSaveEvent() {
    if (clubEventProps) {
      // In club event mode, save directly without a modal
      saveEventSilently()
      return
    }
    const raw = userStorage.getItem('currentEvent', auth.user ? auth.user.id : null) || localStorage.getItem('currentEvent')
    setEventSaveName(raw ? JSON.parse(raw as string).name : 'Event')
    setShowEventSaveModal(true)
  }

  function saveEventSilently() {
    // Club event mode: save via the API callback provided by parent
    if (clubEventProps) {
      void clubEventProps.onSave(groups, assignedGroups)
      const now = new Date()
      setLastSaveTime(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`)
      setLastSaveType('auto')
      setIsDirty(false)
      return
    }
    const rawCurrent = userStorage.getItem('currentEvent', auth.user ? auth.user.id : null) || localStorage.getItem('currentEvent') || '{}'
    const current = JSON.parse(rawCurrent as string)
    const name = current.name || `Event ${new Date().toLocaleDateString()}`
    const event = { ...current }
    event.name = name
    if (!event.createdAt) event.createdAt = new Date().toLocaleDateString()
    const now = new Date()
    event.lastModified = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    event.assignedGroups = assignedGroups
    event.groups = groups
    const rawList = userStorage.getItem('events', auth.user ? auth.user.id : null) || localStorage.getItem('events') || '[]'
    const list = JSON.parse(rawList as string)
    const updated = list.map((e: any) => e.id === event.id ? event : e)
    if (!updated.find((e: any) => e.id === event.id)) updated.push(event)
    userStorage.setItem('events', JSON.stringify(updated), auth.user ? auth.user.id : null)
    userStorage.setItem('currentEvent', JSON.stringify(event), auth.user ? auth.user.id : null)
    setLastSaveTime(event.lastModified)
    setLastSaveType('auto')
    setIsDirty(false)
    try {
      if (auth.user && auth.user.id) {
        void syncUserData(auth.token, auth.user.id)
      }
    } catch (e) {}
  }

  function handleCsvImportClick() {
    // Erst Event still speichern, dann Import öffnen
    if (isDirty) {
      saveEventSilently()
    }
    setCsvPreview([])
    setCsvFile(null)
    setCsvFileEncoding(null)
    setShowCsvImportModal(true)
  }

  function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0])
      setCsvFileEncoding(null)
      setCsvPreview([])
    }
  }

  function detectCsvEncoding(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    
    // Check for UTF-16 LE BOM (FF FE)
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return 'utf-16le'
    }
    
    // Check for UTF-16 BE BOM (FE FF)
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return 'utf-16be'
    }
    
    // Check for UTF-8 BOM (EF BB BF)
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return 'utf-8'
    }
    
    // Try UTF-8 decoding and check for errors
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true })
      decoder.decode(buffer)
      return 'utf-8'
    } catch {
      return 'windows-1252'
    }
  }

  function parseCsvPreview() {
    if (!csvFile) {
      alert('Bitte wähle eine CSV-Datei aus')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer
      const encoding = detectCsvEncoding(arrayBuffer)
      setCsvFileEncoding(encoding)
      
      const decoder = new TextDecoder(encoding)
      const text = decoder.decode(arrayBuffer)

      Papa.parse(text, {
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
              id: generateUUID(),
              name,
              size,
              time: time || undefined,
              toGo: false,
              accessible: false,
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
    reader.readAsArrayBuffer(csvFile)
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

    const enriched = csvPreview.map(g => ({
      ...g,
      id: g.id || generateUUID(),
      salutation: g.salutation || 'Fam'
    }))
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

  async function confirmSaveEvent(name: string) {
    // Club event mode: save via the API callback
    if (clubEventProps) {
      setIsSavingEvent(true)
      try {
        await clubEventProps.onSave(groups, assignedGroups)
        const now = new Date()
        setLastSaveTime(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`)
        setLastSaveType('manual')
        setIsDirty(false)
        setSaveToast({ type: 'success', message: 'Gespeichert!' })
      } catch (err: any) {
        setSaveToast({ type: 'error', message: err?.message || 'Speichern fehlgeschlagen' })
      } finally {
        setIsSavingEvent(false)
        setShowEventSaveModal(false)
      }
      return
    }
    const rawCurrent = userStorage.getItem('currentEvent', auth.user ? auth.user.id : null) || localStorage.getItem('currentEvent') || '{}'
    const event = JSON.parse(rawCurrent as string)
    event.name = name || event.name || `Event ${new Date().toLocaleDateString()}`
    if (!event.createdAt) event.createdAt = new Date().toLocaleDateString()
    const now = new Date()
    event.lastModified = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    event.assignedGroups = assignedGroups
    event.groups = groups
    const rawList = userStorage.getItem('events', auth.user ? auth.user.id : null) || localStorage.getItem('events') || '[]'
    const list = JSON.parse(rawList as string)
    const updated = list.map((e: any) => e.id === event.id ? event : e)
    if (!updated.find((e: any) => e.id === event.id)) updated.push(event)
    userStorage.setItem('events', JSON.stringify(updated), auth.user ? auth.user.id : null)
    userStorage.setItem('currentEvent', JSON.stringify(event), auth.user ? auth.user.id : null)
    setLastSaveTime(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`)
    setLastSaveType('manual')
    setIsDirty(false)

    // show saving status and wait for server sync before closing modal
    setIsSavingEvent(true)
    try {
      if (auth.user && auth.user.id) {
        await syncUserData(auth.token, auth.user.id)
      }
      setSaveToast({ type: 'success', message: 'Event gespeichert!' })
    } catch (err: any) {
      setSaveToast({ type: 'error', message: err?.message || 'Speichern fehlgeschlagen' })
    } finally {
      setIsSavingEvent(false)
      setShowEventSaveModal(false)
    }
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

  // Save before auto-logout (triggered by idle timer in AuthContext)
  const saveEventSilentlyRef = useRef(saveEventSilently)
  const isDirtyRef = useRef(isDirty)
  useEffect(() => { saveEventSilentlyRef.current = saveEventSilently }, [saveEventSilently, assignedGroups, groups])
  useEffect(() => { isDirtyRef.current = isDirty }, [isDirty])
  useEffect(() => {
    function handleAutoLogout() {
      if (isDirtyRef.current) {
        saveEventSilentlyRef.current()
      }
    }
    window.addEventListener('app:auto-logout', handleAutoLogout)
    return () => window.removeEventListener('app:auto-logout', handleAutoLogout)
  }, [])

  function autoAssign() {
    if (!room) return
    const tables = room.tables
    const lockedTables = tables.filter(t => t.locked)
    const tablesForAssign = tables.filter(t => !t.locked)

    const availableMovable = groups.filter(g => !g.toGo)
    const toGoAvail = groups.filter(g => g.toGo)

    const existingToGo = assignedGroups['TOGO'] || []

    const lockedByTable: Record<string, AssignedGroup[]> = {}
    const previouslyPlaced: AssignedGroup[] = []
    for (const t of tablesForAssign) {
      const ags = assignedGroups[t.id] || []
      lockedByTable[t.id] = ags.filter(a => a.locked)
      previouslyPlaced.push(...ags.filter(a => !a.locked && !a.group.toGo))
    }

    const prevKeys = new Set(previouslyPlaced.map(ag => groupKey(ag.group)))
    const movable = [...availableMovable, ...previouslyPlaced.map(ag => ag.group)]
    const { nextByTable: proposal, placedKeys, notPlaced } = greedyReLayout(tablesForAssign, lockedByTable, movable)
    const lostSomePrev = [...prevKeys].some(k => !placedKeys.has(k))

    let finalAssigned: Record<string, AssignedGroup[]>
    let finalAvailable: Group[]

    if (!lostSomePrev) {
      finalAssigned = proposal
      finalAvailable = notPlaced
    } else {
      const keepByTable: Record<string, AssignedGroup[]> = {}
      for (const t of tablesForAssign) keepByTable[t.id] = [...(assignedGroups[t.id] || [])]
      const { nextByTable, notPlaced: remaining } = fillOnly(tablesForAssign, keepByTable, availableMovable)
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
    for (const t of tablesForAssign) nextAssigned[t.id] = finalAssigned[t.id] || []
    for (const t of lockedTables) nextAssigned[t.id] = [...(assignedGroups[t.id] || [])]
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
    const positions = getPositionsForSize(draggingGroup.group.size, previewRotation, table.width, table.height, table.rotation)
    const valid = isValidPosition(table, draggingGroup.group, previewRotation, dragOverPosition.x, dragOverPosition.y, assignedGroups, skipAg)
    return { table, positions, valid }
  }, [room, draggingGroup, dragOverPosition, previewRotation, draggingMeta, assignedGroups])

  if (!room) {
    if (clubEventProps) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 32 }}>
          <p style={{ color: '#64748b', fontSize: 15 }}>Kein Raumlayout vorhanden. Bitte zuerst im Tab „Raumplanung" Tische anlegen.</p>
          {clubEventProps.onOpenRoomEditor && (
            <button onClick={clubEventProps.onOpenRoomEditor}
              style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >Zur Raumplanung</button>
          )}
        </div>
      )
    }
    return (
      <div className="container">
        <h1>Tischplaner</h1>
        <p>{loadError ?? 'Lade Raum...'}</p>
        <button onClick={() => navigate('/app/events')}>Zu den Events</button>
      </div>
    )
  }

  // --- Mobile view: simplified tap-to-assign planner ---
  if (device === 'mobile') {
    return (
      <RoomMobile
        room={room}
        groups={groups}
        setGroups={setGroups}
        assignedGroups={assignedGroups}
        setAssignedGroups={setAssignedGroups}
        onSave={() => { saveEventSilently() }}
        onAutoAssign={() => { autoAssign() }}
        isDirty={isDirty}
        lastSaveTime={lastSaveTime}
        readOnly={clubEventProps?.readOnly}
      />
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
      {draggingGroup && !dragOverPosition && heldCursor && (
        <div
          style={{
            position: 'fixed',
            left: heldCursor.x + 12,
            top: heldCursor.y + 12,
            background: 'rgba(255,255,255,0.95)',
            border: '2px dashed #38bdf8',
            borderRadius: '10px',
            padding: '10px 12px',
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
            zIndex: 9999,
            pointerEvents: 'none',
            minWidth: '180px'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', marginBottom: '6px' }}>
            ✋ Gehalten
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            {(draggingGroup.group.salutation || 'Fam') === 'Fam' ? 'Fam.' : draggingGroup.group.salutation} {draggingGroup.group.name}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '8px' }}>
            <span>👥 {draggingGroup.group.size}</span>
            <span>🕐 {draggingGroup.group.time ? draggingGroup.group.time : 'offen'}</span>
          </div>
        </div>
      )}
      
      {/* Club event mode: compact toolbar with view toggle + room editor link */}
      {isClubEventMode && (
        <div style={{ height: 44, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0 }}>
          {clubEventProps?.onOpenRoomEditor && (
            <button onClick={clubEventProps.onOpenRoomEditor}
              style={{ padding: '5px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}
            >🏛️ Raum bearbeiten</button>
          )}
          <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
            <button onClick={() => setViewMode('map')}
              style={{ padding: '5px 12px', background: viewMode === 'map' ? '#667eea' : 'white', color: viewMode === 'map' ? 'white' : '#475569', border: '1px solid ' + (viewMode === 'map' ? '#667eea' : '#e2e8f0'), borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >📍 Karte</button>
            <button onClick={() => setViewMode('timeline')}
              style={{ padding: '5px 12px', background: viewMode === 'timeline' ? '#667eea' : 'white', color: viewMode === 'timeline' ? 'white' : '#475569', border: '1px solid ' + (viewMode === 'timeline' ? '#667eea' : '#e2e8f0'), borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >📋 Zeitplan</button>
          </div>
          {viewMode === 'timeline' && (
            <select value={timeInterval} onChange={e => setTimeInterval(parseInt(e.target.value))}
              style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: 'white', color: '#475569' }}
            >
              <option value={5}>5 Min</option>
              <option value={10}>10 Min</option>
              <option value={15}>15 Min</option>
            </select>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#64748b' }}>
            🪑 {headerStats.tableCount} Tische &nbsp;·&nbsp; {headerStats.freeSeats}/{headerStats.totalSeats} frei &nbsp;·&nbsp; 👪 {headerStats.familyCount}
          </span>
        </div>
      )}

      {/* Main Content */}
      <div className="room-content" style={{ flex: 1, display: 'flex', overflowX: 'hidden', overflowY: 'auto' }}>
        {/* Sidebar */}
        <div className="sidebar" style={{ 
          flex: '0 0 560px', 
          minWidth: '480px', 
          maxWidth: '640px', 
          background: 'white',
          boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
          padding: '20px 20px 0 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minHeight: 0,
          overflowY: 'auto'
        }}>
          <button 
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
            {/* ========== LISTS TOGGLE ========== */}
            <div style={{ display: 'inline-flex', gap: '3px', background: '#f1f5f9', padding: '5px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
              <button
                onClick={() => {
                  setListView('available')
                  setSelectedAvailableKeys(new Set())
                  setSelectedAssignedKeys(new Set())
                  setMultiSelectAvailable(false)
                  setMultiSelectAssigned(false)
                }}
                style={{
                  padding: '8px 14px',
                  background: listView === 'available' ? '#667eea' : 'transparent',
                  color: listView === 'available' ? 'white' : '#475569',
                  border: listView === 'available' ? '1px solid #5568d3' : 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 0.2s ease'
                }}
                title="Unzugewiesene Familien anzeigen"
              >
                📋 Unzugewiesen
              </button>
              <button
                onClick={() => {
                  setListView('assigned')
                  setSelectedAvailableKeys(new Set())
                  setSelectedAssignedKeys(new Set())
                  setMultiSelectAvailable(false)
                  setMultiSelectAssigned(false)
                }}
                style={{
                  padding: '8px 14px',
                  background: listView === 'assigned' ? '#667eea' : 'transparent',
                  color: listView === 'assigned' ? 'white' : '#475569',
                  border: listView === 'assigned' ? '1px solid #5568d3' : 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 0.2s ease'
                }}
                title="Zugewiesene Familien anzeigen"
              >
                🪑 Zugewiesen
              </button>
            </div>
            {listView === 'available' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#e0e7ff', padding: '4px 12px', borderRadius: '12px', fontSize: '14px' }}>{groups.length}</span>
                      Unzugewiesene Familien
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '6px', alignItems: 'center' }}>
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
                    <button
                      onClick={() => {
                        setMultiSelectAvailable(prev => {
                          const next = !prev
                          if (!next) {
                            setSelectedAvailableKeys(new Set())
                          }
                          return next
                        })
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        background: multiSelectAvailable ? 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' : '#e0f2fe',
                        color: multiSelectAvailable ? 'white' : '#0f172a',
                        border: multiSelectAvailable ? '1px solid #1d4ed8' : '1px solid #bae6fd',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '700',
                        boxShadow: multiSelectAvailable ? '0 4px 12px rgba(37,99,235,0.35)' : 'none',
                        transition: 'all 0.2s'
                      }}
                      title={multiSelectAvailable ? 'Mehrfachauswahl deaktivieren' : 'Mehrfachauswahl aktivieren'}
                    >
                      <span aria-hidden>{multiSelectAvailable ? '☑︎' : '⬜︎'}</span>
                      <span>{multiSelectAvailable ? `Ausgewählt (${selectedAvailableKeys.size})` : 'Auswählen'}</span>
                    </button>
                  </div>
                </div>

                {/* ========== AVAILABLE GROUPS LIST ========== */}
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

                      const PAGE_SIZE = 16
                      const totalPages = Math.max(1, Math.ceil(sortedGroups.length / PAGE_SIZE))
                      const currentPage = Math.min(availablePage, totalPages - 1)
                      const pageItems = sortedGroups.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

                      return pageItems.map((g, i) => {
                        const k = groupKey(g)
                        const salutation = g.salutation || 'Fam'
                        const displaySalutation = salutation === 'Fam' ? 'Fam.' : salutation
                        const displayName = `${displaySalutation} ${g.name}`
                        const isSelected = selectedAvailableKeys.has(k)
                        const fontSize = getResponsiveFontSize(displayName)
                        return (
                          <div
                            key={`${currentPage}-${i}`}
                            className="group-item"
                            style={{
                              color: '#1e293b',
                              padding: '10px',
                              borderRadius: '8px',
                              border: '2px solid ' + (isSelected ? '#22c55e' : (g.toGo ? '#fbbf24' : (g.accessible ? '#60a5fa' : '#c7d2fe'))),
                              background: isSelected ? '#ecfdf5' : 'transparent',
                              cursor: g.toGo ? 'default' : 'pointer',
                              transition: 'all 0.2s',
                              fontSize: '13px'
                            }}
                            onMouseOver={e => !g.toGo && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                            onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                            onClick={() => {
                              if (multiSelectAvailable) {
                                setSelectedAvailableKeys(prev => {
                                  const next = new Set(prev)
                                  if (next.has(k)) next.delete(k); else next.add(k)
                                  return next
                                })
                                return
                              }
                              startPickGroup(g, null, 0)
                            }}
                            onDoubleClick={() => {
                              if (!multiSelectAvailable) return
                              const key = groupKey(g)
                              setSelectedAvailableKeys(prev => {
                                const next = new Set(prev)
                                if (next.has(key)) next.delete(key); else next.add(key)
                                return next
                              })
                            }}
                            onContextMenu={e => {
                              e.preventDefault()
                              if (multiSelectAvailable) {
                                const key = groupKey(g)
                                setSelectedAvailableKeys(prev => {
                                  const next = new Set(prev)
                                  next.add(key)
                                  return next
                                })
                              }
                              setContextMenu({ x: e.clientX, y: e.clientY, tableId: '', agIdx: -1, isList: true, listIdx: i })
                            }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px', alignItems: 'center', fontSize: '13px', color: '#475569' }}>
                              <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2', fontWeight: '700', fontSize: fontSize + 'px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isSelected && <span aria-hidden style={{ fontSize: '13px', color: '#22c55e' }}>✔</span>}
                                  {g.accessible && <span aria-hidden title="Rollstuhl / Kinderwagen" style={{ fontSize: '14px', marginRight: '-3px' }}>♿</span>}
                                  {g.note && <span aria-hidden title={g.note} style={{ fontSize: '13px', color: '#f59e0b', marginRight: '-3px' }}>⚠️</span>}
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                              </div>
                              <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center' }}>
                                <span aria-hidden style={{ fontSize: '13px' }}>🕐</span>
                                <span>{g.time ? `Zeit: ${g.time}` : 'Zeit: offen'}</span>
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

                {/* ========== AVAILABLE GROUPS PAGINATION ========== */}
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
                  const PAGE_SIZE = 16
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
              </>
            )}
          
          {/* ========== ASSIGNED GROUPS LIST ========== */}
          {listView === 'assigned' && (
            <>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#dbeafe', padding: '4px 12px', borderRadius: '12px', fontSize: '14px' }}>{Object.values(assignedGroups).flat().length}</span>
                    Zugewiesene Familien
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                    <button
                      onClick={() => {
                        setMultiSelectAssigned(prev => {
                          const next = !prev
                          if (!next) {
                            setSelectedAssignedKeys(new Set())
                          }
                          return next
                        })
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        background: multiSelectAssigned ? 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' : '#e0f2fe',
                        color: multiSelectAssigned ? 'white' : '#0f172a',
                        border: multiSelectAssigned ? '1px solid #1d4ed8' : '1px solid #bae6fd',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '700',
                        boxShadow: multiSelectAssigned ? '0 4px 12px rgba(37,99,235,0.35)' : 'none',
                        transition: 'all 0.2s'
                      }}
                      title={multiSelectAssigned ? 'Auswahl aufheben' : 'Auswählen'}
                    >
                      <span aria-hidden>{multiSelectAssigned ? '☑︎' : '⬜︎'}</span>
                      <span>{multiSelectAssigned ? `Ausgewählt (${selectedAssignedKeys.size})` : 'Auswählen'}</span>
                    </button>
                  </div>
                </div>

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

                    const PAGE_SIZE = 16
                    const totalPages = Math.max(1, Math.ceil(assignedItems.length / PAGE_SIZE))
                    const currentPage = Math.min(assignedPage, totalPages - 1)
                    const pageItems = assignedItems.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

                    return pageItems.map(({ tableId, ag, idx }) => {
                      const salutation = ag.group.salutation || 'Fam'
                      const displaySalutation = salutation === 'Fam' ? 'Fam.' : salutation
                      const displayName = `${displaySalutation} ${ag.group.name}`
                      const isToGo = tableId === 'TOGO'
                      const tableLocked = !isToGo && !!room?.tables.find(t => t.id === tableId)?.locked
                      const key = assignedKey(tableId, idx)
                      const isSelected = selectedAssignedKeys.has(key)
                      const fontSize = getResponsiveFontSize(displayName)
                      return (
                        <div
                          key={`${tableId}-${idx}`}
                          className="assigned-item"
                          style={{
                            background: isSelected ? '#ecfdf5' : (isToGo ? '#fef3c7' : (assignedColors[tableId]?.[idx] || '#e0e7ff')),
                            padding: '10px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #22c55e' : ('1px solid ' + (isToGo ? '#fbbf24' : (ag.group.accessible ? '#60a5fa' : '#c7d2fe'))),
                            cursor: multiSelectAssigned ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            fontSize: '13px'
                          }}
                          onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                          onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                          onClick={() => {
                            if (tableLocked) return
                            if (!multiSelectAssigned) return
                            setSelectedAssignedKeys(prev => {
                              const next = new Set(prev)
                              if (next.has(key)) next.delete(key); else next.add(key)
                              return next
                            })
                          }}
                          onDoubleClick={() => {
                            if (tableLocked) return
                            if (!multiSelectAssigned) return
                            const k = key
                            setSelectedAssignedKeys(prev => {
                              const next = new Set(prev)
                              if (next.has(k)) next.delete(k); else next.add(k)
                              return next
                            })
                          }}
                          onContextMenu={e => {
                            e.preventDefault()
                            if (tableLocked) return
                            if (multiSelectAssigned) {
                              const k = key
                              setSelectedAssignedKeys(prev => {
                                const next = new Set(prev)
                                next.add(k)
                                return next
                              })
                            }
                            setContextMenu({ x: e.clientX, y: e.clientY, tableId, agIdx: idx, isList: false, isAssignedList: true })
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px', alignItems: 'center', fontSize: '13px', color: '#475569' }}>
                            <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2', fontWeight: '700', fontSize: fontSize + 'px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {isSelected && <span aria-hidden style={{ fontSize: '13px', color: '#22c55e' }}>✔</span>}
                              {ag.group.accessible && <span aria-hidden title="Rollstuhl / Kinderwagen" style={{ fontSize: '14px', marginRight: '4px' }}>♿</span>}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                            </div>
                            <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center' }}>
                              <span aria-hidden style={{ fontSize: '13px' }}>🕐</span>
                              <span>{ag.group.time ? `Zeit: ${ag.group.time}` : 'Zeit: offen'}</span>
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

              {/* ========== ASSIGNED GROUPS PAGINATION ========== */}
              {(() => {
                const totalItems = Object.values(assignedGroups).flat().length
                const PAGE_SIZE = 16
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
            </>
          )}
          
          {/* ========== EVENT SPEICHERN ========== */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', width: '100%' }}>
              <button 
                onClick={() => handleSaveEvent()} 
                disabled={!isDirty || !Object.keys(assignedGroups).some(tid => tid !== 'TOGO' && (assignedGroups[tid]?.length || 0) > 0)}
                style={{ 
                  flex: 1,
                  padding: '12px 20px',
                  background: isDirty && Object.keys(assignedGroups).some(tid => tid !== 'TOGO' && (assignedGroups[tid]?.length || 0) > 0) ? '#10b981' : '#e0e7ff',
                  color: isDirty && Object.keys(assignedGroups).some(tid => tid !== 'TOGO' && (assignedGroups[tid]?.length || 0) > 0) ? 'white' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isDirty && Object.keys(assignedGroups).some(tid => tid !== 'TOGO' && (assignedGroups[tid]?.length || 0) > 0) ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(102,126,234,0.15)',
                  transition: 'all 0.2s',
                  opacity: isDirty && Object.keys(assignedGroups).some(tid => tid !== 'TOGO' && (assignedGroups[tid]?.length || 0) > 0) ? 1 : 0.6
                }}
              >
                💾 Speichern
              </button>
              
              <button
                onClick={() => {
                  // Öffne Print-Dokument mit Sitzplan und Zeitplan in neuem Fenster
                  const rawCurrent = userStorage.getItem('currentEvent', auth.user ? auth.user.id : null) || localStorage.getItem('currentEvent') || '{}'
                  const current = JSON.parse(rawCurrent as string)
                  const name = current.name || `Event ${new Date().toLocaleDateString()}`;
                  const now = new Date();
                  
                  if (!room) return;
                  
                  openPrintDocument({
                    eventName: name,
                    printHeaderTitle: current.printHeaderTitle || name,
                    printHeaderMapLabel: current.printHeaderMapLabel || 'Sitzplan',
                    printHeaderListLabel: current.printHeaderListLabel || 'Zeitplan',
                    eventDate: current.date || current.createdAt || null,
                    eventTimeFrom: current.timeFrom || null,
                    eventTimeTo: current.timeTo || null,
                    showDate: current.showPrintDate !== false,
                    showTimeRange: current.showPrintTimeRange !== false,
                    lastModified: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
                    room: room,
                    groups: groups,
                    assignedGroups: assignedGroups
                  });
                }}
                disabled={!room}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: room ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' : '#e2e8f0',
                  color: room ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: room ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '700',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: room ? '0 2px 8px rgba(34,197,94,0.15)' : 'none'
                }}
                onMouseOver={e => { if (room) { e.currentTarget.style.background = 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(34,197,94,0.25)'; } }}
                onMouseOut={e => { if (room) { e.currentTarget.style.background = 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(34,197,94,0.15)'; } }}
                title="Sitzplan & Zeitplan drucken (2 Seiten)"
              >
                🖨️
              </button>
            </div>

            <div style={{ display: 'flex', width: '100%', marginTop: '10px' }}>
              <div style={{ flex: 3, display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                {/* Auto-Save Status - Kompakt */}
                {typeof autosaveRemaining === 'number' && (
                  <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '6px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                    Auto: {String(Math.floor(autosaveRemaining / 60)).padStart(2, '0')}:{String(autosaveRemaining % 60).padStart(2, '0')}
                  </span>
                )}
                
                {/* Zuletzt gespeichert - Kompakt */}
                {lastSaveTime && (
                  <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '6px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                    {lastSaveType === 'auto' ? 'Auto' : 'Sicherung'}: {lastSaveTime}
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }} />
            </div>
          </div>
          </div>
        </div>

        {/* Main area - switches between map and timeline */}
        <div className="room-layout" style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '12px', position: 'relative', minWidth: 0, minHeight: 0 }}>

          {/* Content area with top padding to avoid toggle overlap */}
          <div
            ref={mapContainerRef}
            style={{
              paddingTop: '0px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '12px 12px 12px',
              width: '100%',
              flex: 1,
              minHeight: 0,
              height: 'calc(100vh - 150px)',
              overflowX: 'auto',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
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
                      gridTemplateColumns: `repeat(${gridWidthVar}, ${CELL_SIZE}px)`,
                      gridTemplateRows: `repeat(${gridHeightVar}, ${CELL_SIZE}px)`,
                      border: '2px solid #cbd5e1',
                      width: gridWidthVar * CELL_SIZE + 'px',
                      height: gridHeightVar * CELL_SIZE + 'px',
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
                    onClick={e => {
                      if (!draggingGroup) return
                      placeDraggingGroup({ clientX: e.clientX, clientY: e.clientY })
                    }}
          >
            {room.tables.map(table => {
              const ags = assignedGroups[table.id] || []
              const occupied = ags.reduce((sum, ag) => sum + ag.group.size, 0)
              const isTableLocked = !!table.locked
              return (
                <div
                  key={table.id}
                  style={{
                    gridColumn: `${table.x + 1} / span ${table.width}`,
                    gridRow: `${table.y + 1} / span ${table.height}`,
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: isTableLocked ? '2px solid #ef4444' : '2px solid #94a3b8',
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
                  <div
                    onContextMenu={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setContextMenu(null)
                      setTableContextMenu({ x: e.clientX, y: e.clientY, tableId: table.id })
                    }}
                    title={isTableLocked ? 'Rechtsklick: Tisch entsperren' : 'Rechtsklick: Tisch sperren'}
                    style={{
                      fontSize: '10px',
                      background: isTableLocked ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                      boxShadow: isTableLocked ? '0 2px 8px rgba(239,68,68,0.35)' : '0 2px 8px rgba(102,126,234,0.3)',
                      letterSpacing: '0.3px',
                      zIndex: 5,
                      cursor: 'context-menu'
                    }}
                  >
                    {isTableLocked ? '🔒' : '🪑'} Tisch {table.id.slice(1)} • {occupied}/{table.capacity}
                  </div>
                </div>
              )
            })}
            {/* Locked seat placeholders */}
            {room.tables.filter(t => t.locked).flatMap(table => {
              const ags = assignedGroups[table.id] || []
              const occupied = new Set<string>()
              for (const ag of ags) {
                const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
                for (const pos of positions) {
                  occupied.add(`${pos.x},${pos.y}`)
                }
              }
              const seats = generateOptimalSeating(table.capacity, table.width, table.height, table.rotation ?? 0)
              return seats
                .filter(pos => !occupied.has(`${pos.x},${pos.y}`))
                .map((pos, idx) => (
                  <div
                    key={`${table.id}-locked-${idx}`}
                    style={{
                      gridColumn: table.x + pos.x + 1,
                      gridRow: table.y + pos.y + 1,
                      background: '#e2e8f0',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '6px',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      pointerEvents: 'none',
                      width: 40,
                      height: 40,
                      minWidth: 40,
                      minHeight: 40,
                      maxWidth: 40,
                      maxHeight: 40,
                      margin: 0,
                      boxSizing: 'border-box',
                      padding: 4
                    }}
                  >
                    Gesperrt
                  </div>
                ))
            })}
            {/* Render all assigned groups directly on the grid */}
            {Object.entries(assignedGroups).map(([tableId, ags]) =>
              ags.map((ag, idx) => {
                const table = room.tables.find(t => t.id === tableId)
                if (!table) return null
                const tableLocked = !!table.locked
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
                const defaultCenterX = gridCells.reduce((sum, c) => sum + (c.col0 + 0.5) * CELL_SIZE, 0) / gridCells.length
                const defaultCenterY = gridCells.reduce((sum, c) => sum + (c.row0 + 0.5) * CELL_SIZE, 0) / gridCells.length

                let centerX = defaultCenterX
                let centerY = defaultCenterY

                if (ag.group.size === 3) {
                  // Find the row that has the horizontal pair
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
                    centerX = (minCol + maxCol + 1) * CELL_SIZE / 2
                    centerY = (bestRow + 0.5) * CELL_SIZE
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
                const labelColor = assignedColors[tableId]?.[idx] || paletteColor(PALETTE[0])

                // Name font size: responsive but clamped to min/max
                const baseNameSize = Math.round(getResponsiveFontSize(displayName) * 0.6)
                const approxCharWidth = 0.6
                const maxSizeByWidth = Math.floor((labelMaxWidth - 4) / Math.max(displayName.length, 1) / approxCharWidth)
                const nameFontSize = Math.max(5, Math.min(9, baseNameSize, maxSizeByWidth))

                // Meta font size: keep consistent (fixed), except for size 1
                const useCompactName = ag.group.size === 1 || isVerticalTwo
                const metaFontSize = useCompactName ? 5 : 6

                return [
                  ...gridCells.map(({ col0, row0, pidx }) => (
                    <div
                      key={`${tableId}-${idx}-${pidx}`}
                      onClick={() => {
                        if (!ag.locked && !tableLocked) {
                          startPickGroup(ag.group, { tableId, agIdx: idx }, ag.rotation)
                        }
                      }}
                      onContextMenu={e => {
                        e.preventDefault()
                        if (tableLocked) return
                        setContextMenu({ x: e.clientX, y: e.clientY, tableId, agIdx: idx, isList: false })
                      }}
                      style={{
                        gridColumn: col0 + 1,
                        gridRow: row0 + 1,
                        background: assignedColors[tableId]?.[idx] || paletteColor(PALETTE[0]),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        cursor: ag.locked ? 'default' : 'pointer',
                        zIndex: 10,
                        border: '1px solid rgba(0,0,0,0.15)',
                        borderRadius: '6px',
                        padding: '4px',
                        textAlign: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                      }}
                      onDoubleClick={() => {
                        if (tableLocked) return
                        setAssignedGroups({
                          ...assignedGroups,
                          [tableId]: ags.map(a => a === ag ? { ...a, locked: !a.locked } : a)
                        })
                      }}
                    />
                  )),
                        <div
                    key={`${tableId}-${idx}-label`}
                    style={{
                      position: 'absolute',
                      left: `${centerX}px`,
                      top: `${centerY}px`,
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 15,
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
                      border: `1px solid ${ag.group.accessible ? '#60a5fa' : '#c7d2fe'}`,
                      textAlign: 'center'
                    }}>
                      {/* Name */}
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

                      {/* Meta info (fixed sizes) */}
                      {ag.group.time && (
                        <div style={{ fontSize: `${metaFontSize}px`, lineHeight: '1' }}>
                          🕐 {ag.group.time.slice(0, 5)}
                        </div>
                      )}
                      {ag.group.size > 1 && (
                        <div style={{ fontSize: `${metaFontSize}px`, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {ag.group.accessible && <span title="Rollstuhl / Kinderwagen">♿</span>}
                              {ag.group.note && (
                                <span title={ag.group.note} style={{ fontSize: `${metaFontSize}px`, lineHeight: 1, color: '#f59e0b', marginLeft: 6 }}>⚠️</span>
                              )}
                            </div>
                          <div>👥 {ag.group.size}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ]
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

        {/* Schmale Aktions-Spalte rechts */}
        {(() => {
          const isDragging = !!draggingGroup
          const btnBase: React.CSSProperties = {
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            background: 'white',
            cursor: 'pointer',
            transition: 'all 0.15s',
            flexShrink: 0,
            padding: 0,
          }
          const btnActive: React.CSSProperties = { ...btnBase, borderColor: '#a5b4fc', background: '#f5f3ff' }
          const btnDisabled: React.CSSProperties = { ...btnBase, opacity: 0.35, cursor: 'not-allowed', background: '#f8fafc' }
          return (
            <div style={{
              flex: '0 0 56px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 8px',
              background: 'white',
              borderLeft: '1px solid #f1f5f9',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.03)',
            }}>
              {/* Zurück / Undo */}
              <button
                onClick={performUndo}
                disabled={undoCount === 0}
                title={`Rückgängig (Strg+Z)${undoCount > 0 ? ` – ${undoCount} Schritt${undoCount > 1 ? 'e' : ''}` : ''}`}
                style={undoCount > 0 ? btnActive : btnDisabled}
                onMouseOver={e => { if (undoCount > 0) { (e.currentTarget as HTMLElement).style.background = '#ede9fe'; (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; } }}
                onMouseOut={e => { if (undoCount > 0) { (e.currentTarget as HTMLElement).style.background = '#f5f3ff'; (e.currentTarget as HTMLElement).style.borderColor = '#a5b4fc'; } }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={undoCount > 0 ? '#5b21b6' : '#94a3b8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6"/>
                  <path d="M3 13C5 7.5 10 4 15.5 4c5 0 8.5 3.5 8.5 8s-3.5 8-8.5 8c-3 0-5.5-1-7.5-3"/>
                </svg>
              </button>

              {/* Vorwärts / Redo */}
              <button
                onClick={performRedo}
                disabled={redoCount === 0}
                title={`Wiederholen (Strg+Y)${redoCount > 0 ? ` – ${redoCount} Schritt${redoCount > 1 ? 'e' : ''}` : ''}`}
                style={redoCount > 0 ? btnActive : btnDisabled}
                onMouseOver={e => { if (redoCount > 0) { (e.currentTarget as HTMLElement).style.background = '#ede9fe'; (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; } }}
                onMouseOut={e => { if (redoCount > 0) { (e.currentTarget as HTMLElement).style.background = '#f5f3ff'; (e.currentTarget as HTMLElement).style.borderColor = '#a5b4fc'; } }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={redoCount > 0 ? '#5b21b6' : '#94a3b8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6"/>
                  <path d="M21 13C19 7.5 14 4 8.5 4 3.5 4 0 7.5 0 12s3.5 8 8.5 8c3 0 5.5-1 7.5-3"/>
                </svg>
              </button>

              {/* Trennlinie */}
              <div style={{ width: '28px', height: '1px', background: '#e2e8f0', margin: '2px 0' }} />

              {/* Drehen (R) */}
              <button
                onClick={rotateGroup}
                disabled={!isDragging}
                title="Drehen (R) – nur beim Ziehen"
                style={isDragging ? btnBase : btnDisabled}
                onMouseOver={e => { if (isDragging) { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; (e.currentTarget as HTMLElement).style.borderColor = '#86efac'; } }}
                onMouseOut={e => { if (isDragging) { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; } }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDragging ? '#16a34a' : '#94a3b8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6"/>
                  <path d="M21 8A9 9 0 1 0 18 18"/>
                </svg>
              </button>

              {/* Spiegeln (T) */}
              <button
                onClick={mirrorGroup}
                disabled={!isDragging}
                title="Spiegeln (T) – nur beim Ziehen"
                style={isDragging ? btnBase : btnDisabled}
                onMouseOver={e => { if (isDragging) { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; (e.currentTarget as HTMLElement).style.borderColor = '#86efac'; } }}
                onMouseOut={e => { if (isDragging) { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; } }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDragging ? '#16a34a' : '#94a3b8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18"/>
                  <path d="M4 7l-2 5 2 5"/>
                  <path d="M20 7l2 5-2 5"/>
                  <path d="M2 12h8"/>
                  <path d="M14 12h8"/>
                </svg>
              </button>
            </div>
          )
        })()}
      </div>
      {tableContextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: tableContextMenu.x,
            top: tableContextMenu.y,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 9999,
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
          }}
          onMouseLeave={() => setTableContextMenu(null)}
        >
          {(() => {
            const isLocked = !!room?.tables.find(t => t.id === tableContextMenu.tableId)?.locked
            return (
              <button
                onClick={() => {
                  toggleTableLock(tableContextMenu.tableId)
                  setTableContextMenu(null)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: isLocked ? '#16a34a' : '#ef4444',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = isLocked ? '#f0fdf4' : '#fef2f2'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                {isLocked ? '🔓 Tisch entsperren' : '🔒 Tisch sperren'}
              </button>
            )
          })()}
        </div>
      )}
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
            (() => {
              const group = groups[contextMenu.listIdx!]
              const key = groupKey(group)
              const isMarked = selectedAvailableKeys.has(key)
              if (multiSelectAvailable) {
                return (
                  <>
                    {selectedAvailableKeys.size > 0 ? (
                      <>
                        <button
                          onClick={() => {
                            const batch = groups.filter(g => selectedAvailableKeys.has(groupKey(g)))
                            if (batch.length > 0) {
                              setBatchTableSelectModal(batch)
                            }
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
                          📌 Ausgewählte zu Tisch zuweisen
                        </button>
                        <button
                          onClick={() => {
                            const deleteSet = new Set(selectedAvailableKeys)
                            setGroups(prev => prev.filter(g => !deleteSet.has(groupKey(g))))
                            setSelectedAvailableKeys(new Set())
                            setMultiSelectAvailable(false)
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
                          🗑️ Ausgewählte Familien löschen
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setBatchTableSelectModal([group])
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
                        📌 Zu Tisch zuweisen
                      </button>
                    )}
                  </>
                )
              }

              return (
                <>
                  <button
                    onClick={() => {
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
                    📌 Zu Tisch zuweisen
                  </button>
                  <button
                    onClick={() => {
                      setEditModal({ tableId: '', agIdx: -1, isList: true, listIdx: contextMenu.listIdx })
                      setEditName(group.name)
                      setEditSalutation((group.salutation as 'Fam' | 'Frau' | 'Herr') || 'Fam')
                      setEditSize(group.size.toString())
                      setEditTime(group.time || '')
                      setEditToGo(Boolean(group.toGo))
                      setEditAccessible(Boolean(group.accessible))
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
                    ✏️ Familie bearbeiten
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
                    🗑️ Familie löschen
                  </button>
                </>
              )
            })()
          ) : contextMenu.isAssignedList ? (
            (() => {
              const ag = assignedGroups[contextMenu.tableId][contextMenu.agIdx]
              const key = assignedKey(contextMenu.tableId, contextMenu.agIdx)
              const isMarked = selectedAssignedKeys.has(key)
              if (multiSelectAssigned) {
                const ensureSelected = () => {
                  setSelectedAssignedKeys(prev => {
                    const next = new Set(prev)
                    next.add(key)
                    return next
                  })
                }
                const effectiveKeys = (() => {
                  const next = new Set(selectedAssignedKeys)
                  next.add(key)
                  return next
                })()
                const selectedCount = effectiveKeys.size
                return (
                  <>
                    <button
                      onClick={() => {
                        ensureSelected()
                        setBatchMoveTableModal({ count: selectedCount })
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
                      📋 Zu anderem Tisch verschieben
                    </button>
                    <button
                      onClick={() => {
                        ensureSelected()
                        setBatchRemoveAssignmentModal({ count: selectedCount })
                        setContextMenu(null)
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        color: '#8b5cf6',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '500',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#faf5ff'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      ↩️ Tischzuweisung aufheben
                    </button>
                    <button
                      onClick={() => {
                        ensureSelected()
                        const removeSet = new Set(selectedAssignedKeys)
                        removeSet.add(key)
                        const count = removeSet.size
                        if (count > 1) {
                          setBatchDeleteConfirmModal({ count })
                        } else {
                          setAssignedGroups(prev => {
                            const next: typeof prev = {}
                            Object.entries(prev).forEach(([tid, arr]) => {
                              next[tid] = arr.filter((_, i) => !removeSet.has(assignedKey(tid, i)))
                            })
                            return next
                          })
                          setSelectedAssignedKeys(new Set())
                        }
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
                      🗑️ Ausgewählte Familien löschen
                    </button>
                  </>
                )
              }

              return (
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
                    ↩️ Tischzuweisung aufheben
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
                      setEditAccessible(Boolean(ag.group.accessible))
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
                    ✏️ Familie bearbeiten
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
                    🗑️ Familie löschen
                  </button>
                </>
              )
            })()
          ) : (
            <>
              <button
                onClick={() => {
                  pushUndo()
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
                  setEditAccessible(Boolean(ag.group.accessible))
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

      {/* Save Toast Notification */}
      {saveToast && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '14px 20px',
          background: saveToast.type === 'success' 
            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideIn 0.3s ease-out',
          zIndex: 9999
        }}>
          <span>{saveToast.type === 'success' ? '✓' : '✕'}</span>
          <span>{saveToast.message}</span>
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
                const isLocked = !!table.locked
                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      if (tableSelectModal.group.toGo || !canFit || isLocked) return
                      const currentAssigned = assignedGroups[table.id] || []
                      const occupiedSet = buildOccupied(table, currentAssigned)
                      const placement = tryPlaceOnTable(table, tableSelectModal.group, occupiedSet)
                      if (!placement) return
                      setAssignedGroups({
                        ...assignedGroups,
                        [table.id]: [...currentAssigned, { group: tableSelectModal.group, rotation: placement.rotation, locked: false, x: placement.x, y: placement.y, color: PALETTE[0] }]
                      })
                      setGroups(groups.filter((_, i) => i !== tableSelectModal.index))
                      setTableSelectModal(null)
                    }}
                    style={{
                      padding: '12px',
                      background: isLocked ? '#fee2e2' : (canFit ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e2e8f0'),
                      color: isLocked ? '#991b1b' : (canFit ? 'white' : '#94a3b8'),
                      border: 'none',
                      borderRadius: '6px',
                      cursor: (!isLocked && canFit) ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseOver={e => {
                      if (canFit && !isLocked) e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {isLocked ? '🔒 ' : ''}Tisch {table.id.slice(1)}
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
      {batchTableSelectModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 440 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>Tisch für {batchTableSelectModal.length} Familien auswählen</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>Es werden so viele wie möglich platziert; ToGo wird übersprungen.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
              {room?.tables.map(table => {
                const current = assignedGroups[table.id] || []
                const occupied = current.reduce((sum, a) => sum + a.group.size, 0)
                const available = table.capacity - occupied
                const anyFit = batchTableSelectModal.some(g => !g.toGo && g.size <= available)
                const isLocked = !!table.locked
                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      if (isLocked) return
                      const currentAssigned = assignedGroups[table.id] || []
                      let occ = buildOccupied(table, currentAssigned)
                      let totalOcc = currentAssigned.reduce((sum, a) => sum + a.group.size, 0)
                      const placed: typeof currentAssigned = []
                      const placedKeys = new Set<string>()
                      for (const g of batchTableSelectModal) {
                        if (g.toGo) continue
                        if (totalOcc + g.size > table.capacity) continue
                        const placement = tryPlaceOnTable(table, g, occ)
                        if (placement) {
                          const cells = getPositionsForSize(g.size, placement.rotation, table.width, table.height, table.rotation)
                          for (const c of cells) occ.add(`${placement.x + c.x},${placement.y + c.y}`)
                          placed.push({ group: g, rotation: placement.rotation, locked: false, x: placement.x, y: placement.y, color: PALETTE[0] })
                          totalOcc += g.size
                          placedKeys.add(groupKey(g))
                        }
                      }
                      if (placed.length > 0) {
                        setAssignedGroups({
                          ...assignedGroups,
                          [table.id]: [...currentAssigned, ...placed]
                        })
                        setGroups(prev => prev.filter(g => !placedKeys.has(groupKey(g))))
                      }
                      setBatchTableSelectModal(null)
                      setSelectedAvailableKeys(new Set())
                    }}
                    style={{
                      padding: '12px',
                      background: isLocked ? '#fee2e2' : (anyFit ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e2e8f0'),
                      color: isLocked ? '#991b1b' : (anyFit ? 'white' : '#94a3b8'),
                      border: 'none',
                      borderRadius: '6px',
                      cursor: (!isLocked && anyFit) ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseOver={e => {
                      if (anyFit && !isLocked) e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {isLocked ? '🔒 ' : ''}Tisch {table.id.slice(1)}
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>{occupied}/{table.capacity} Plätze</span>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setBatchTableSelectModal(null)}
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
      {batchMoveTableModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 420 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Zu anderem Tisch verschieben</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>
              Wählen Sie einen Ziel-Tisch für <strong>{batchMoveTableModal.count} Familien</strong>:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
              {room?.tables
                .map(t => t.id)
                .filter(tid => tid !== 'TOGO')
                .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
                .map(tid => {
                  const tableNum = tid.slice(1)
                  const occupied = (assignedGroups[tid] || []).reduce((sum, ag) => sum + ag.group.size, 0)
                  const table = room?.tables.find(t => t.id === tid)
                  const capacity = table?.capacity || 10
                  const isLocked = !!table?.locked
                  return (
                    <button
                      key={tid}
                      onClick={() => {
                        if (isLocked) return
                        const moveSet = new Set(selectedAssignedKeys)
                        const canFit = capacity >= occupied + batchMoveTableModal.count
                        if (canFit) {
                          setAssignedGroups(prev => {
                            const next: typeof prev = {}
                            Object.entries(prev).forEach(([t, arr]) => {
                              next[t] = arr.filter((_, i) => !moveSet.has(assignedKey(t, i)))
                            })
                            const movedItems: typeof next[string] = []
                            Object.entries(prev).forEach(([t, arr]) => {
                              arr.forEach((ag, i) => {
                                if (moveSet.has(assignedKey(t, i))) {
                                  movedItems.push(ag)
                                }
                              })
                            })
                            next[tid] = [...(next[tid] || []), ...movedItems]
                            return next
                          })
                          setSelectedAssignedKeys(new Set())
                          setMultiSelectAssigned(false)
                          setBatchMoveTableModal(null)
                        } else {
                          alert(`Nicht genug Plätze am Tisch ${tableNum}. Verfügbar: ${capacity - occupied}, benötigt: ${batchMoveTableModal.count}`)
                        }
                      }}
                      style={{
                        padding: '12px 10px',
                        background: isLocked ? '#fee2e2' : '#f1f5f9',
                        color: isLocked ? '#991b1b' : '#1e293b',
                        border: isLocked ? '2px solid #fecaca' : '2px solid #cbd5e1',
                        borderRadius: '8px',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                      onMouseOver={e => {
                        if (isLocked) return
                        e.currentTarget.style.background = '#0ea5e9'
                        e.currentTarget.style.color = 'white'
                        e.currentTarget.style.borderColor = '#0ea5e9'
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = isLocked ? '#fee2e2' : '#f1f5f9'
                        e.currentTarget.style.color = isLocked ? '#991b1b' : '#1e293b'
                        e.currentTarget.style.borderColor = isLocked ? '#fecaca' : '#cbd5e1'
                      }}
                    >
                      {isLocked ? '🔒 ' : ''}T{tableNum} ({occupied}/{capacity})
                    </button>
                  )
                })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setBatchMoveTableModal(null)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'white',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >Abbrechen</button>
            </div>
          </div>
        </div>
      )}
      {batchRemoveAssignmentModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 380 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Bestätigung: Zuweisung entfernen</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b' }}>
              Sollen wirklich <strong>{batchRemoveAssignmentModal.count} Familien</strong> aus der Tischzuweisung entfernt werden? Sie werden zur unzugeordneten Liste hinzugefügt.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setBatchRemoveAssignmentModal(null)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'white',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >Abbrechen</button>
              <button
                onClick={() => {
                  const removeSet = new Set(selectedAssignedKeys)
                  // Entferne die ausgewählten Gruppen aus assignedGroups
                  setAssignedGroups(prev => {
                    const next: typeof prev = {}
                    Object.entries(prev).forEach(([tid, arr]) => {
                      next[tid] = arr.filter((_, i) => !removeSet.has(assignedKey(tid, i)))
                    })
                    return next
                  })
                  setSelectedAssignedKeys(new Set())
                  setMultiSelectAssigned(false)
                  setBatchRemoveAssignmentModal(null)
                  setIsDirty(true)
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                Ja, entfernen
              </button>
            </div>
          </div>
        </div>
      )}
      {batchDeleteConfirmModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 380 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>Bestätigung: Familien löschen</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#475569', lineHeight: 1.6 }}>Sollen wirklich <strong style={{ color: '#dc2626' }}>{batchDeleteConfirmModal.count} Familien</strong> gelöscht werden?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setBatchDeleteConfirmModal(null)
                }}
                style={{ flex: 1, padding: '10px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  const deleteSet = new Set(selectedAssignedKeys)
                  // Entferne die ausgewählten Gruppen aus assignedGroups
                  setAssignedGroups(prev => {
                    const next: typeof prev = {}
                    Object.entries(prev).forEach(([tid, arr]) => {
                      next[tid] = arr.filter((_, i) => !deleteSet.has(assignedKey(tid, i)))
                    })
                    return next
                  })
                  setSelectedAssignedKeys(new Set())
                  setMultiSelectAssigned(false)
                  setBatchDeleteConfirmModal(null)
                  setIsDirty(true)
                }}
                style={{ flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
              >
                Ja, löschen
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input
                    type="checkbox"
                    checked={newGroupToGo}
                    onChange={e => {
                      const v = e.target.checked
                      setNewGroupToGo(v)
                      if (v) setNewGroupAccessible(false)
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#475569' }}>ToGo (kein Tisch)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input
                    type="checkbox"
                    checked={newGroupAccessible}
                    onChange={e => {
                      const v = e.target.checked
                      setNewGroupAccessible(v)
                      if (v) setNewGroupToGo(false)
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#475569' }}>Rollstuhl / Kinderwagen</span>
                </label>
              </div>

              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Bemerkung (max. 50 Zeichen)</label>
                <input
                  type="text"
                  value={newGroupNote}
                  maxLength={50}
                  placeholder="z.B. Allergie, spezielle Wünsche"
                  onChange={e => setNewGroupNote(e.target.value.slice(0,50))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input
                    type="checkbox"
                    checked={editToGo}
                    onChange={e => {
                      const v = e.target.checked
                      setEditToGo(v)
                      if (v) setEditAccessible(false)
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#475569' }}>ToGo (kein Tisch)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input
                    type="checkbox"
                    checked={editAccessible}
                    onChange={e => {
                      const v = e.target.checked
                      setEditAccessible(v)
                      if (v) setEditToGo(false)
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#475569' }}>Rollstuhl / Kinderwagen</span>
                </label>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                ToGo oder größere Familien können den Tisch überlasten – in diesem Fall wandert die Gruppe nach dem Speichern automatisch zurück in "Unzugewiesen" oder in den ToGo-Bereich.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => {
                    const size = Math.max(1, parseInt(editSize) || 1)
                    const nextToGo = Boolean(editToGo)
                    const nextAccessible = Boolean(editAccessible) && !nextToGo
                    const nextTime = editTime || undefined
                    const nextSalutation = editSalutation || 'Fam'
                    const nextName = editName.trim()

                    if (editModal.isList) {
                      const current = groups[editModal.listIdx ?? -1]
                      if (!current) {
                        setEditModal(null)
                        return
                      }
                      const updatedGroup = {
                        ...current,
                        name: nextName || current.name || `Familie ${(editModal.listIdx ?? 0) + 1}`,
                        size,
                        time: nextTime,
                        toGo: nextToGo,
                        accessible: nextAccessible,
                        salutation: nextSalutation
                      }
                      if (nextToGo) {
                        const updatedAssigned = ensureToGoBucket({ ...assignedGroups })
                        updatedAssigned['TOGO'] = [
                          ...(updatedAssigned['TOGO'] || []),
                          { group: updatedGroup, rotation: 0, locked: false, x: 0, y: 0, color: TOGO_COLOR }
                        ]
                        setAssignedGroups(updatedAssigned)
                        setGroups(groups.filter((_, i) => i !== editModal.listIdx))
                      } else {
                        setGroups(groups.map((g, i) => i === editModal.listIdx ? updatedGroup : g))
                      }
                      setEditModal(null)
                      return
                    }

                    const tableId = editModal.tableId
                    const currentList = assignedGroups[tableId] || []
                    const currentAg = currentList[editModal.agIdx]
                    if (!currentAg) {
                      setEditModal(null)
                      return
                    }

                    const updatedGroup = {
                      ...currentAg.group,
                      name: nextName || currentAg.group.name,
                      size,
                      time: nextTime,
                      toGo: nextToGo,
                      accessible: nextAccessible,
                      salutation: nextSalutation
                    }

                    if (nextToGo) {
                      const updatedAssigned = ensureToGoBucket({ ...assignedGroups })
                      if (tableId === 'TOGO') {
                        updatedAssigned['TOGO'] = currentList.map((ag, i) => i === editModal.agIdx ? { ...ag, group: updatedGroup } : ag)
                      } else {
                        updatedAssigned[tableId] = currentList.filter((_, i) => i !== editModal.agIdx)
                        updatedAssigned['TOGO'] = [
                          ...(updatedAssigned['TOGO'] || []),
                          { ...currentAg, group: updatedGroup, rotation: 0, x: 0, y: 0, color: TOGO_COLOR }
                        ]
                      }
                      setAssignedGroups(updatedAssigned)
                      setEditModal(null)
                      return
                    }

                    if (tableId === 'TOGO') {
                      setAssignedGroups({
                        ...assignedGroups,
                        [tableId]: currentList.filter((_, i) => i !== editModal.agIdx)
                      })
                      setGroups([...groups, { ...updatedGroup, toGo: false }])
                      setEditModal(null)
                      return
                    }

                    const sizeChanged = size !== currentAg.group.size
                    if (!sizeChanged) {
                      setAssignedGroups({
                        ...assignedGroups,
                        [tableId]: currentList.map((ag, i) => i === editModal.agIdx ? { ...ag, group: updatedGroup } : ag)
                      })
                      setEditModal(null)
                      return
                    }

                    const table = room?.tables.find(t => t.id === tableId)
                    if (!table) {
                      setEditModal(null)
                      return
                    }

                    const remaining = currentList.filter((_, i) => i !== editModal.agIdx)
                    const occupiedSeats = remaining.reduce((sum, ag) => sum + ag.group.size, 0) + size
                    if (occupiedSeats > table.capacity) {
                      setAssignedGroups({
                        ...assignedGroups,
                        [tableId]: remaining
                      })
                      setGroups([...groups, updatedGroup])
                      setEditModal(null)
                      return
                    }

                    const occupied = buildOccupied(table, remaining)
                    const placement = tryPlaceOnTable(table, updatedGroup, occupied, remaining)
                    if (placement) {
                      const nextAg = { ...currentAg, group: updatedGroup, rotation: placement.rotation, x: placement.x, y: placement.y }
                      setAssignedGroups({
                        ...assignedGroups,
                        [tableId]: currentList.map((ag, i) => i === editModal.agIdx ? nextAg : ag)
                      })
                    } else {
                      setAssignedGroups({
                        ...assignedGroups,
                        [tableId]: remaining
                      })
                      setGroups([...groups, updatedGroup])
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
                  min={1}
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
                Gewählt: {csvFile.name} {csvFileEncoding && `(${csvFileEncoding})`}
              </div>
            )}
            {csvPreview.length > 0 ? (
              <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', marginBottom: '12px', background: '#f8fafc' }}>
                {csvPreview.map((row, idx) => (
                  <div key={`csv-row-${idx}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 0.8fr 1fr auto', gap: '8px', alignItems: 'center', padding: '6px', borderBottom: '1px solid #e2e8f0' }}>
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
                        onChange={e => updateCsvPreview(idx, { toGo: e.target.checked, accessible: e.target.checked ? false : row.accessible })}
                      />
                      ToGo
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0f172a', paddingLeft: '6px' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(row.accessible)}
                        onChange={e => updateCsvPreview(idx, { accessible: e.target.checked, toGo: e.target.checked ? false : row.toGo })}
                      />
                      Rollstuhl / Kinderwagen
                    </label>
                    <input
                      type="text"
                      value={row.note || ''}
                      maxLength={50}
                      placeholder="Bemerkung"
                      onChange={e => updateCsvPreview(idx, { note: e.target.value.slice(0,50) })}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
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
                  onClick={() => { setShowCsvImportModal(false); setCsvFile(null); setCsvFileEncoding(null); setCsvPreview([]) }}
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
                  disabled={!eventSaveName.trim() || isSavingEvent}
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
                  {isSavingEvent ? 'Speichert…' : '💾 Speichern'}
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
      {/* Der separate Drucken-Button am Seitenrand wurde entfernt, da das Druckersymbol verwendet wird */}
      {showReservationPanel && currentEventId && (
        <ReservationConfigPanel
          eventId={currentEventId}
          isToGo={false}
          token={auth.token ?? undefined}
          onClose={() => setShowReservationPanel(false)}
        />
      )}
    </div>
  )
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
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [columnMaxHeight, setColumnMaxHeight] = useState<number>(0)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setColumnMaxHeight(el.clientHeight || 0)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const HEADER_HEIGHT = 44
  const SUMMARY_HEIGHT = 28
  const ITEM_BASE_HEIGHT = 32
  const ITEM_PADDING = 20
  const ITEM_MARGIN = 8
  const ITEM_META_LINE = 16
  const ITEM_NOTE_LINE = 16
  const ITEM_NOTE_MAX_LINES = 2

  const estimateItemHeight = (item: { group: Group }, variant: 'unassigned' | 'timed') => {
    let height = ITEM_BASE_HEIGHT + ITEM_PADDING + ITEM_MARGIN
    if (variant === 'timed') height += ITEM_META_LINE
    if (variant === 'timed' && item.group.note) height += ITEM_NOTE_LINE * ITEM_NOTE_MAX_LINES
    return height
  }

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

  const unassignedWithTimeNonToGo = unassignedWithTime.filter(item => !item.group.toGo)
  const unassignedToGoNoTime = unassignedNoTime.filter(item => item.group.toGo)

  const unassignedCombined = [
    ...unassignedNoTime.filter(item => !item.group.toGo).map(item => ({ kind: 'unassigned' as const, item })),
    ...unassignedWithTimeNonToGo.map(item => ({ kind: 'unassigned' as const, item })),
    ...unassignedToGoNoTime.map(item => ({ kind: 'unassigned' as const, item })),
    ...assignedNoTime.map(item => ({ kind: 'assigned' as const, item }))
  ]

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

  // Sort items within each time slot alphabetically by group name
  for (const [k, arr] of timeSlots.entries()) {
    arr.sort((a, b) => (a.group.name || '').localeCompare(b.group.name || ''))
  }

  // Order slots chronologically by their start time (slotKey format: "HH:MM - HH:MM")
  const parseStart = (slotKey: string) => {
    const m = slotKey.match(/(\d{2}):(\d{2})/) 
    if (!m) return 0
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  }

  const slotEntries = Array.from(timeSlots.entries()).sort((a, b) => parseStart(a[0]) - parseStart(b[0]))

  const maxHeight = columnMaxHeight || 640
  const columns: React.ReactNode[][] = []
  let currentColumn: React.ReactNode[] = []
  let remaining = maxHeight

  const startNewColumn = () => {
    if (currentColumn.length) columns.push(currentColumn)
    currentColumn = []
    remaining = maxHeight
  }

  const pushNode = (node: React.ReactNode, height: number) => {
    if (height > remaining && currentColumn.length) startNewColumn()
    currentColumn.push(node)
    remaining = Math.max(0, remaining - height)
  }

  const addSlotSegments = <T,>(params: {
    slotKey: string
    continuationLabel?: string
    items: T[]
    variant: 'unassigned' | 'timed'
    summaryText: string
    renderItem: (item: T, index: number) => React.ReactNode
  }) => {
    const { slotKey, continuationLabel, items, variant, summaryText, renderItem } = params
    let index = 0
    let segmentIndex = 0
    while (index < items.length) {
      const continuation = continuationLabel || slotKey
      const headerText = segmentIndex > 0 ? `Fortsetzung (${continuation})` : slotKey
      const baseHeight = HEADER_HEIGHT + SUMMARY_HEIGHT
      const minItemHeight = estimateItemHeight(items[index] as any, variant)
      if (baseHeight + minItemHeight > remaining && currentColumn.length) startNewColumn()

      let segmentItems: T[] = []
      let height = baseHeight
      while (index < items.length) {
        const itemHeight = estimateItemHeight(items[index] as any, variant)
        if (segmentItems.length > 0 && height + itemHeight > remaining) break
        if (segmentItems.length === 0 && height + itemHeight > remaining && currentColumn.length === 0 && remaining < maxHeight) {
          startNewColumn()
        }
        height += itemHeight
        segmentItems.push(items[index])
        index += 1
      }

      if (segmentItems.length === 0 && items[index]) {
        height += estimateItemHeight(items[index] as any, variant)
        segmentItems = [items[index]]
        index += 1
      }

      const node = (
        <div className="timeline-slot" key={`${slotKey}-${segmentIndex}`}>
          <div className="timeline-slot-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '12px 14px', fontSize: '14px', fontWeight: '700' }}>
            {segmentIndex > 0 ? headerText : slotKey}
          </div>

          <div style={{ padding: '12px 12px 0 12px', fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>
            {summaryText}
          </div>

          {segmentItems.map((item, i) => renderItem(item, i))}
        </div>
      )

      pushNode(node, height)
      segmentIndex += 1
    }
  }

  if (unassignedCombined.length > 0) {
    addSlotSegments({
      slotKey: 'Unzugeordnete Familien',
      continuationLabel: 'Unzugeordnete',
      items: unassignedCombined,
      variant: 'unassigned',
      summaryText: `${unassignedCombined.length} Einträge`,
      renderItem: (entry, i) => {
        const isToGo = entry.item.group.toGo
        return (
          <div
            key={`unassigned-${i}`}
            className="timeline-slot-item"
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#1e293b',
              borderLeft: `4px solid ${isToGo ? '#f59e0b' : '#94a3b8'}`,
              lineHeight: '1.4'
            }}
          >
            {entry.item.group.note && <span title={entry.item.group.note} style={{ fontSize: 13, color: '#f59e0b', marginRight: 6 }}>⚠️</span>}
            <div>{entry.item.group.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {entry.item.group.time ? `🕐 ${entry.item.group.time} • ` : ''}👥 {entry.item.group.size}
              {entry.kind === 'assigned' && (entry.item.tableId ? ` • Tisch ${entry.item.tableId?.slice(1)}` : '')}
              {entry.kind === 'unassigned' && entry.item.group.toGo && !entry.item.group.time ? ' • ToGo' : ''}
            </div>
            {entry.item.group.note && (
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>{entry.item.group.note}</div>
            )}
          </div>
        )
      }
    })
  }

  slotEntries.forEach(([slotKey, items]) => {
    const totalPeople = items.reduce((sum, item) => sum + item.group.size, 0)
    const familyCount = items.length
    addSlotSegments({
      slotKey: `🕐 ${slotKey}`,
      continuationLabel: slotKey,
      items,
      variant: 'timed',
      summaryText: `${familyCount} Familien • ${totalPeople} Personen`,
      renderItem: (item, i) => (
        <div
          key={`${slotKey}-${i}`}
          className="timeline-slot-item"
          style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#1e293b',
            borderLeft: `4px solid ${item.isAssigned && item.tableId === 'TOGO' ? '#f59e0b' : '#2196F3'}`,
            lineHeight: '1.4'
          }}
        >
          <div>{item.group.note && <span title={item.group.note} style={{ fontSize: 13, color: '#f59e0b', marginRight: 6 }}>⚠️</span>}{item.group.name}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            🕐 {item.group.time || ''} • 👥 {item.group.size} {item.isAssigned && item.tableId !== 'TOGO' ? `| Tisch ${item.tableId?.slice(1)}` : item.isAssigned && item.tableId === 'TOGO' ? '| ToGo' : ''}
          </div>
          {item.group.note && (
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>{item.group.note}</div>
          )}
        </div>
      )
    })
  })

  if (currentColumn.length) columns.push(currentColumn)

  // Manual column layout: height-based segmentation
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Unassigned families are rendered inside the timeline-list so they share scrolling and column wrapping */}

      <div ref={scrollRef} className="timeline-scroll-wrapper" style={{ height: 'calc(100vh - 150px)', overflow: 'hidden' }}>
        <div className="timeline-list">
          {columns.map((column, columnIndex) => (
            <div className="timeline-column" key={`timeline-column-${columnIndex}`}>
              {column}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}