import type { Group } from '../components/Importer'
import type { Table, Room, AssignedGroup } from '../types/room'

export const GRID_SIZE = 20
export const CELL_SIZE = 40
export const STORAGE_KEY = 'currentRoom'
export const PALETTE = ['#E91E63', '#FF9800', '#4CAF50', '#673AB7', '#FF5722']
export const TOGO_COLOR = '#FFE082'

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export function paletteColor(hex: string): string {
  return hex + '70'
}

export function generatePossibleLayouts(size: number, maxWidth: number, maxHeight: number): { x: number; y: number }[][] {
  const layouts: { x: number; y: number }[][] = []
  for (let cols = 1; cols <= maxWidth; cols++) {
    for (let rows = 1; rows <= maxHeight; rows++) {
      const mainBlock = cols * rows
      if (mainBlock >= size) {
        const pos: { x: number; y: number }[] = []
        for (let i = 0; i < size; i++) pos.push({ x: i % cols, y: Math.floor(i / cols) })
        layouts.push(pos)
      } else if (mainBlock < size && rows < maxHeight) {
        const pos: { x: number; y: number }[] = []
        for (let i = 0; i < mainBlock; i++) pos.push({ x: i % cols, y: Math.floor(i / cols) })
        const remaining = size - mainBlock
        for (let i = 0; i < Math.min(remaining, cols); i++) pos.push({ x: i, y: rows })
        if (pos.length === size) layouts.push(pos)
      }
    }
  }
  return layouts.filter(layout => {
    const maxX = Math.max(...layout.map(p => p.x))
    const maxY = Math.max(...layout.map(p => p.y))
    return maxX < maxWidth && maxY < maxHeight
  })
}

export function adaptiveLayout(size: number, maxWidth: number, maxHeight: number): { x: number; y: number }[] {
  const layouts = generatePossibleLayouts(size, maxWidth, maxHeight)
  if (layouts.length === 0) {
    const cols = Math.ceil(Math.sqrt(size))
    const positions: { x: number; y: number }[] = []
    for (let i = 0; i < size; i++) positions.push({ x: i % cols, y: Math.floor(i / cols) })
    return positions
  }
  const best = layouts.sort((a, b) => {
    const aArea = (Math.max(...a.map(p => p.x)) + 1) * (Math.max(...a.map(p => p.y)) + 1)
    const bArea = (Math.max(...b.map(p => p.x)) + 1) * (Math.max(...b.map(p => p.y)) + 1)
    return aArea - bArea
  })[0]
  return best
}

export function getPositionsForSize(size: number, rotation: number, tableWidth?: number, tableHeight?: number): { x: number; y: number }[] {
  let positions: { x: number; y: number }[] = []
  if (size === 1) positions = [{ x: 0, y: 0 }]
  else if (size === 2) positions = [{ x: 0, y: 0 }, { x: 0, y: 1 }]
  else if (size === 3) positions = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
  else if (size === 4) positions = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]
  else {
    if (tableWidth && tableHeight) positions = adaptiveLayout(size, tableWidth, tableHeight)
    else {
      const cols = Math.ceil(Math.sqrt(size))
      for (let i = 0; i < size; i++) positions.push({ x: i % cols, y: Math.floor(i / cols) })
    }
  }

  const mirrored = rotation >= 4
  const actualRotation = rotation % 4
  const transformed = mirrored ? positions.map(pos => ({ x: -pos.x, y: pos.y })) : positions
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

export function isValidPosition(
  table: Table,
  group: Group,
  rotation: number,
  x: number,
  y: number,
  assignedGroups: Record<string, AssignedGroup[]>,
  skipAg?: AssignedGroup
): boolean {
  const positions = getPositionsForSize(group.size, rotation, table.width, table.height)
  for (const pos of positions) {
    const absX = table.x + x + pos.x
    const absY = table.y + y + pos.y
    if (absX < table.x || absX >= table.x + table.width || absY < table.y || absY >= table.y + table.height) return false
    for (const ag of assignedGroups[table.id] || []) {
      if (ag === skipAg) continue
      const agPositions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height)
      for (const agPos of agPositions) {
        if (absX === table.x + ag.x + agPos.x && absY === table.y + ag.y + agPos.y) return false
      }
    }
  }
  return true
}

export function loadRoomFromStorage(): Room | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) as Room : null
  } catch (err) {
    console.error('Raum konnte nicht geladen werden', err)
    return null
  }
}

export function ensureToGoBucket(map: Record<string, AssignedGroup[]>): Record<string, AssignedGroup[]> {
  if (!map['TOGO']) map['TOGO'] = []
  return map
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
          if (occupied.has(key)) { collision = true; break }
        }
        if (!collision) return { x, y, rotation: rot }
      }
    }
  }
  return null
}

export function placeGroupsOnTable(table: Table, groups: Group[], seedPlaced: AssignedGroup[] = []): { placed: AssignedGroup[]; unplaced: Group[] } {
  const placed: AssignedGroup[] = [...seedPlaced]
  const unplaced: Group[] = []
  const occupied = new Set<string>()

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

export function groupKey(g: Group) {
  return g.id
}

export function buildOccupied(table: Table, placements: AssignedGroup[]): Set<string> {
  const occ = new Set<string>()
  for (const ag of placements) {
    const cells = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height)
    for (const c of cells) occ.add(`${ag.x + c.x},${ag.y + c.y}`)
  }
  return occ
}

export function tryPlaceOnTable(
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

export function greedyReLayout(
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

export function fillOnly(
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
