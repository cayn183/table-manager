// ============================================================================
// IMPORTS
// ============================================================================
import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Importer, { Group } from './Importer'
import Papa from 'papaparse'
import { bestFitAssign } from '../utils/placement'
import type { Table, Room as RoomType, AssignedGroup, DraggingMeta } from '../types/room'
import {
  PALETTE,
  TOGO_COLOR,
  GRID_HEIGHT,
  GRID_WIDTH,
  CELL_SIZE,
  paletteColor,
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
} from '../utils/roomUtils'

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

export default function Room() {
  const navigate = useNavigate()
  
  // --------------------------------------------------------------------------
  // STATE: Core Data
  // --------------------------------------------------------------------------
  const [room, setRoom] = useState<RoomType | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [assignedGroups, setAssignedGroups] = useState<Record<string, AssignedGroup[]>>({})
  
  // --------------------------------------------------------------------------
  // STATE: Modals & UI Controls
  // --------------------------------------------------------------------------
  const [showEventSaveModal, setShowEventSaveModal] = useState(false)
  const [eventSaveName, setEventSaveName] = useState('')
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId: string; agIdx: number; isList: boolean; listIdx?: number; isAssignedList?: boolean } | null>(null)
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
  const [uiScale, setUiScale] = useState(1)
  const draggingGroupRef = useRef<{ group: Group; rotation: number } | null>(null)

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
    // Build occupied set for scoring
    const occupied = new Set<string>()
    for (const ag of (currentAssigned[table.id] || [])) {
      if (ag === skipAg) continue
      const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
      for (const pos of positions) {
        occupied.add(`${ag.x + pos.x},${ag.y + pos.y}`)
      }
    }

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

      // Count isolated empty cells (gaps with few empty neighbors)
      let isolatedGaps = 0
      let totalGaps = 0
      for (let ty = 0; ty < table.height; ty++) {
        for (let tx = 0; tx < table.width; tx++) {
          const key = `${tx},${ty}`
          if (!tempOccupied.has(key)) {
            totalGaps++
            const emptyNeighbors = [
              `${tx - 1},${ty}`,
              `${tx + 1},${ty}`,
              `${tx},${ty - 1}`,
              `${tx},${ty + 1}`
            ].filter(nk => {
              const [nx, ny] = nk.split(',').map(Number)
              return nx >= 0 && nx < table.width && ny >= 0 && ny < table.height && !tempOccupied.has(nk)
            }).length

            // Heavily penalize isolated single cells
            if (emptyNeighbors === 0) {
              isolatedGaps += 3 // Completely isolated
            } else if (emptyNeighbors === 1) {
              isolatedGaps += 2 // Nearly isolated
            } else if (emptyNeighbors === 2) {
              isolatedGaps += 1 // Somewhat isolated
            }
          }
        }
      }
      score -= isolatedGaps * 10 // Strong penalty for fragmentation

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

      validRotations.push({ rot, score })
      if (debug) {
        console.debug('[findBestRotation]', { table: table.id, group: group.size, rot, targetX, targetY, score })
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
      return { minX: 0, minY: 0, maxX: GRID_WIDTH, maxY: GRID_HEIGHT, width: GRID_WIDTH, height: GRID_HEIGHT }
    }

    // If a custom view frame exists, honor it directly (clamped to grid)
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
    
    const width = maxX - minX
    const height = maxY - minY
    
    // Add padding (1 cell on each side)
    const paddedMinX = Math.max(0, minX - 1)
    const paddedMinY = Math.max(0, minY - 1)
    const paddedMaxX = Math.min(GRID_WIDTH, maxX + 1)
    const paddedMaxY = Math.min(GRID_HEIGHT, maxY + 1)
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
      const scale = Math.min(maxScale, Math.max(0.3, Math.min(scaleX, scaleY)))

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

  // Track dirty state: when groups or assignedGroups change, mark as dirty and clamp pagination
  useEffect(() => {
    setIsDirty(true)
    const totalPages = Math.max(1, Math.ceil(Object.values(assignedGroups).flat().length / 20))
    setAssignedPage(prev => Math.min(prev, totalPages - 1))
  }, [groups, assignedGroups])

  const updatePreviewPosition = useCallback((coords: { clientX: number; clientY: number }) => {
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

    // Use smart rotation finding for best gap-filling placement
    let bestRotation = findBestRotation(table, draggingGroup.group, relX, relY, assignedGroups, skipAg)

    if (!isValidPosition(table, draggingGroup.group, bestRotation, relX, relY, assignedGroups, skipAg)) {
      const positions = getPositionsForSize(draggingGroup.group.size, bestRotation, table.width, table.height, table.rotation)
      const maxX = Math.max(...positions.map(p => p.x))
      const maxY = Math.max(...positions.map(p => p.y))
      relX = Math.min(relX, table.width - 1 - maxX)
      relY = Math.min(relY, table.height - 1 - maxY)
      relX = Math.max(relX, 0)
      relY = Math.max(relY, 0)
      
      // Re-calculate best rotation for adjusted position
      bestRotation = findBestRotation(table, draggingGroup.group, relX, relY, assignedGroups, skipAg)
    }

    setPreviewRotation(bestRotation)
    setDragOverPosition({ tableId: table.id, x: relX, y: relY })
  }, [draggingGroup, draggingMeta, room, assignedGroups, mapScale, findBestRotation])


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
        
        // Find optimal rotation for drop position
        const optimalRotation = sourceAg ? findBestRotation(table, draggingGroup.group, relX, relY, assignedGroups, sourceAg) : 0
        
        if (sourceAg && isValidPosition(table, draggingGroup.group, optimalRotation, relX, relY, assignedGroups, sourceAg)) {
          if (draggingMeta.tableId === table.id) {
            // Gleicher Tisch, nur Position ändern
            setAssignedGroups({
              ...assignedGroups,
              [table.id]: assignedGroups[table.id].map((a, i) => i === draggingMeta.agIdx ? { ...a, x: relX, y: relY, rotation: optimalRotation } : a)
            })
          } else {
            // Anderer Tisch
            const newSourceList = [...(assignedGroups[draggingMeta.tableId] || [])]
            newSourceList.splice(draggingMeta.agIdx ?? -1, 1)
            const current = assignedGroups[table.id] || []
            setAssignedGroups({
              ...assignedGroups,
              [draggingMeta.tableId]: newSourceList,
              [table.id]: [...current, { ...sourceAg, rotation: optimalRotation, x: relX, y: relY }]
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
        
        // Find optimal rotation for new group
        const optimalRotation = findBestRotation(table, group, relX, relY, assignedGroups)
        
        if (totalOccupied <= table.capacity && isValidPosition(table, group, optimalRotation, relX, relY, assignedGroups)) {
          setAssignedGroups({
            ...assignedGroups,
            [table.id]: [...current, { group, rotation: optimalRotation, locked: false, x: relX, y: relY, color: PALETTE[0] }]
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
    const group = { id: generateUUID(), name, size, time: newGroupTime || undefined, toGo: newGroupToGo, salutation: newGroupSalutation }
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
    setSaveToast({ type: 'success', message: 'Event gespeichert!' })
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
    const positions = getPositionsForSize(draggingGroup.group.size, previewRotation, table.width, table.height, table.rotation)
    const valid = isValidPosition(table, draggingGroup.group, previewRotation, dragOverPosition.x, dragOverPosition.y, assignedGroups, skipAg)
    return { table, positions, valid }
  }, [room, draggingGroup, dragOverPosition, previewRotation, draggingMeta, assignedGroups])

  if (!room) {
    return (
      <div className="container">
        <h1>Tischplaner</h1>
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
        alignItems: 'center',
        gap: '0'
      }}>
        {/* Left Column - Logo & Title (aligned with sidebar width) */}
        <div style={{ 
          flex: '0 0 560px',
          minWidth: '480px',
          maxWidth: '640px',
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px' 
        }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
            <span 
              style={{ 
                fontSize: '24px', 
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)'
              }} 
              title="Zur Startseite"
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.border = '2px solid rgba(255,255,255,0.4)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.border = '2px solid rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >🏠</span>
          </Link>
          <h1 style={{ margin: 0, fontSize: '24px', color: 'white', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Tischplaner</h1>
        </div>

        {/* Right Column - View Toggle & Controls */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}>
          {/* View Toggle - Kartenansicht / Planansicht */}
          <div style={{ display: 'inline-flex', gap: '3px', background: 'rgba(255,255,255,0.15)', padding: '5px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
            <button
              onClick={() => setViewMode('map')}
              style={{
                padding: '8px 14px',
                background: viewMode === 'map' ? 'rgba(255,255,255,0.3)' : 'transparent',
                color: 'white',
                border: viewMode === 'map' ? '1px solid rgba(255,255,255,0.4)' : 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === 'map' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
              title="Kartenansicht"
            >
              📍 Kartenansicht
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '8px 14px',
                background: viewMode === 'timeline' ? 'rgba(255,255,255,0.3)' : 'transparent',
                color: 'white',
                border: viewMode === 'timeline' ? '1px solid rgba(255,255,255,0.4)' : 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === 'timeline' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
              title="Zeitplanansicht"
            >
              📋 Zeitplanansicht
            </button>
          </div>

          {/* Zeitintervall - nur in Zeitplan-Ansicht */}
          {viewMode === 'timeline' && (
            <select 
              value={timeInterval} 
              onChange={e => setTimeInterval(parseInt(e.target.value))}
              style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            >
              <option value={5} style={{ background: '#667eea' }}>⏱️ 5 Min</option>
              <option value={10} style={{ background: '#667eea' }}>⏱️ 10 Min</option>
              <option value={15} style={{ background: '#667eea' }}>⏱️ 15 Min</option>
            </select>
          )}

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
              backdropFilter: 'blur(10px)',
              marginLeft: 'auto'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >Raum bearbeiten</button>
        </div>
      </div>
      
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
                              border: '2px solid ' + (isSelected ? '#22c55e' : (g.toGo ? '#fbbf24' : '#e2e8f0')),
                              background: isSelected ? '#ecfdf5' : 'transparent',
                              cursor: g.toGo ? 'default' : (multiSelectAvailable ? 'pointer' : 'move'),
                              transition: 'all 0.2s',
                              fontSize: '13px'
                            }}
                            onMouseOver={e => !g.toGo && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                            onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                            draggable={!g.toGo && !multiSelectAvailable}
                            onDragStart={e => {
                              if (g.toGo) return
                              e.dataTransfer.setData('text/plain', JSON.stringify({ index: i, ...g }))
                              setDraggingGroup({ group: g, rotation: 0 })
                              setDraggingMeta(null)
                              setPreviewRotation(0)
                            }}
                            onClick={() => {
                              if (!multiSelectAvailable) return
                              setSelectedAvailableKeys(prev => {
                                const next = new Set(prev)
                                if (next.has(k)) next.delete(k); else next.add(k)
                                return next
                              })
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
                            border: isSelected ? '2px solid #22c55e' : ('1px solid ' + (isToGo ? '#fbbf24' : '#c7d2fe')),
                            cursor: multiSelectAssigned ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            fontSize: '13px'
                          }}
                          onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                          onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                          onClick={() => {
                            if (!multiSelectAssigned) return
                            setSelectedAssignedKeys(prev => {
                              const next = new Set(prev)
                              if (next.has(key)) next.delete(key); else next.add(key)
                              return next
                            })
                          }}
                          onDoubleClick={() => {
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
                  flex: 3,
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
                  // Speichere aktuelle Daten in LocalStorage und navigiere zur PrintView
                  const current = JSON.parse(localStorage.getItem('currentEvent') || '{}');
                  const name = current.name || `Event ${new Date().toLocaleDateString()}`;
                  const event = { ...current };
                  event.name = name;
                  if (!event.createdAt) event.createdAt = new Date().toLocaleDateString();
                  const now = new Date();
                  event.lastModified = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
                  event.assignedGroups = assignedGroups;
                  event.groups = groups;
                  event.room = room;
                  localStorage.setItem('currentEvent', JSON.stringify(event));
                  navigate("/printview");
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#f1f5f9',
                  color: '#667eea',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                title="Drucken oder als PDF speichern"
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
                      gridTemplateColumns: `repeat(${GRID_WIDTH}, ${CELL_SIZE}px)`,
                      gridTemplateRows: `repeat(${GRID_HEIGHT}, ${CELL_SIZE}px)`,
                      border: '2px solid #cbd5e1',
                      width: GRID_WIDTH * CELL_SIZE + 'px',
                      height: GRID_HEIGHT * CELL_SIZE + 'px',
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
                
                // Find optimal rotation for this position
                const optimalRotation = findBestRotation(table, ag.group, relX, relY, assignedGroups, ag)
                
                if (fromTable === table.id) {
                  // Same table, just move position and rotation
                  if (isValidPosition(table, ag.group, optimalRotation, relX, relY, assignedGroups, ag)) {
                    setAssignedGroups({
                      ...assignedGroups,
                      [table.id]: assignedGroups[table.id].map(a => a === ag ? { ...a, x: relX, y: relY, rotation: optimalRotation } : a)
                    })
                  }
                } else {
                  // Different table
                  const newFrom = assignedGroups[fromTable].filter((_, i) => i !== agIdx)
                  const current = assignedGroups[table.id] || []
                  const totalOccupied = current.reduce((sum, a) => sum + a.group.size, 0) + ag.group.size
                  if (totalOccupied <= table.capacity && isValidPosition(table, ag.group, optimalRotation, relX, relY, assignedGroups)) {
                    setAssignedGroups({
                      ...assignedGroups,
                      [fromTable]: newFrom,
                      [table.id]: [...current, { ...ag, x: relX, y: relY, rotation: optimalRotation }]
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
                // Ensure dragged-in groups always carry an id for selection and assignment logic
                const group = { id: data.id || generateUUID(), name: data.name, size: data.size, time: data.time, toGo: data.toGo, salutation: data.salutation || 'Fam' }
                const current = assignedGroups[table.id] || []
                const totalOccupied = current.reduce((sum, a) => sum + a.group.size, 0) + group.size
                
                // Find optimal rotation for new group
                const optimalRotation = findBestRotation(table, group, relX, relY, assignedGroups)
                
                if (totalOccupied <= table.capacity && isValidPosition(table, group, optimalRotation, relX, relY, assignedGroups)) {
                  setAssignedGroups({
                    ...assignedGroups,
                    [table.id]: [...current, { group, rotation: optimalRotation, locked: false, x: relX, y: relY, color: PALETTE[0] }]
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
                const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
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
                    ) : ''}
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
                return (
                  <button
                    key={table.id}
                    onClick={() => {
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
                      background: anyFit ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e2e8f0',
                      color: anyFit ? 'white' : '#94a3b8',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: anyFit ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseOver={e => {
                      if (anyFit) e.currentTarget.style.transform = 'translateY(-2px)'
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
                  return (
                    <button
                      key={tid}
                      onClick={() => {
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
                        background: '#f1f5f9',
                        color: '#1e293b',
                        border: '2px solid #cbd5e1',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = '#0ea5e9'
                        e.currentTarget.style.color = 'white'
                        e.currentTarget.style.borderColor = '#0ea5e9'
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = '#f1f5f9'
                        e.currentTarget.style.color = '#1e293b'
                        e.currentTarget.style.borderColor = '#cbd5e1'
                      }}
                    >
                      T{tableNum} ({occupied}/{capacity})
                    </button>
                  )
                })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setBatchMoveTableModal(null)}
                style={{ flex: 1, padding: '10px 14px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
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
                style={{ flex: 1, padding: '10px 14px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >Abbrechen</button>
              <button
                onClick={() => {
                  const removeSet = new Set(selectedAssignedKeys)
                  const itemsToRestore: Group[] = []
                  // Sammle alle Gruppen die wiederhergestellt werden sollen
                  Object.entries(assignedGroups).forEach(([tid, arr]) => {
                    arr.forEach((ag, i) => {
                      if (removeSet.has(assignedKey(tid, i))) {
                        itemsToRestore.push(ag.group)
                      }
                    })
                  })
                  // Entferne die Gruppen aus assignedGroups
                  setAssignedGroups(prev => {
                    const next: typeof prev = {}
                    Object.entries(prev).forEach(([tid, arr]) => {
                      next[tid] = arr.filter((_, i) => !removeSet.has(assignedKey(tid, i)))
                    })
                    return next
                  })
                  // Füge sie zur verfügbaren Liste hinzu
                  setGroups(prev => [...prev, ...itemsToRestore])
                  setSelectedAssignedKeys(new Set())
                  setMultiSelectAssigned(false)
                  setBatchRemoveAssignmentModal(null)
                }}
                style={{ flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
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
                      setGroups(groups.map((g, i) => i === editModal.listIdx ? { ...g, name: editName || `Familie ${i + 1}`, size, time: editTime || undefined, toGo: editToGo, salutation: editSalutation || 'Fam' } : g))
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
                Gewählt: {csvFile.name} {csvFileEncoding && `(${csvFileEncoding})`}
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
      {/* Der separate Drucken-Button am Seitenrand wurde entfernt, da das Druckersymbol verwendet wird */}
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