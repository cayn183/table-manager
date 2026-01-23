import type { Group } from '../components/Importer'
import type { Table, Room, AssignedGroup } from '../types/room'
import { generateOptimalSeating, getPerpendicularOrientation, canFit, getLayoutByRotation } from './layoutUtils'

export const GRID_WIDTH = 28
export const GRID_HEIGHT = 20
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

export function positionsAreConnected(positions: { x: number; y: number }[]): boolean {
  if (positions.length === 0) return false
  const set = new Set(positions.map(p => `${p.x},${p.y}`))
  const seen = new Set<string>()
  const q: { x: number; y: number }[] = [positions[0]]
  seen.add(`${positions[0].x},${positions[0].y}`)
  while (q.length) {
    const cur = q.shift()!
    const neigh = [
      `${cur.x-1},${cur.y}`,
      `${cur.x+1},${cur.y}`,
      `${cur.x},${cur.y-1}`,
      `${cur.x},${cur.y+1}`
    ]
    for (const nk of neigh) {
      if (set.has(nk) && !seen.has(nk)) {
        seen.add(nk)
        const [nx, ny] = nk.split(',').map(Number)
        q.push({ x: nx, y: ny })
      }
    }
  }
  return seen.size === set.size
}

/**
 * Get positions for a group, considering table rotation
 * Rotation 0/2 (Ost/West): VERTICAL layout (2 Spalten perpendikular)
 * Rotation 1/3 (Süd/Nord): HORIZONTAL layout (2 Reihen perpendikular)
 * 
 * For rotations 0-7, applies real geometric transformations:
 * 0-3: Different variation patterns
 * 4-7: Mirrored/rotated versions of patterns
 */
export function getPositionsForSize(
  size: number,
  groupRotation: number,
  tableWidth?: number,
  tableHeight?: number,
  tableRotation?: number
): { x: number; y: number }[] {
  const width = tableWidth || 20
  const height = tableHeight || 20
  const rotation = tableRotation || 0
  // Use unified rotation-aware layout selection, including staggered variants and axis-aware mirroring
  let positions = getLayoutByRotation(size, groupRotation, width, height, rotation)

  if (positions.length === 0) {
    // Fallback: square layout
    const cols = Math.ceil(Math.sqrt(size))
    const fallback: { x: number; y: number }[] = []
    for (let i = 0; i < size; i++) fallback.push({ x: i % cols, y: Math.floor(i / cols) })
    positions = fallback
  }

  // Normalize to positive coordinates
  const minX = Math.min(...positions.map(p => p.x))
  const minY = Math.min(...positions.map(p => p.y))
  return positions.map(p => ({ x: p.x - minX, y: p.y - minY }))
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
  const positions = getPositionsForSize(group.size, rotation, table.width, table.height, table.rotation)
  for (const pos of positions) {
    const absX = table.x + x + pos.x
    const absY = table.y + y + pos.y
    if (absX < table.x || absX >= table.x + table.width || absY < table.y || absY >= table.y + table.height) return false
    for (const ag of assignedGroups[table.id] || []) {
      if (ag === skipAg) continue
      const agPositions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
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

/**
 * Score a placement based on how well it fills gaps and creates compact arrangements
 * Higher score = better placement
 * 
 * Scoring factors:
 * 1. Adjacent occupied cells (neighbors) - prefer filling next to existing groups
 * 2. Minimize isolated empty cells after placement
 * 3. Compactness - prefer placements that create contiguous occupied areas
 */
function scorePlacement(
  table: Table,
  positions: { x: number; y: number }[],
  x: number,
  y: number,
  occupied: Set<string>,
  group?: Group,
  assignedGroups?: AssignedGroup[]
): number {
  let score = 0

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
            gaps += 5
          } else if (emptyNeighbors === 1) {
            gaps += 3
          } else if (emptyNeighbors === 2) {
            gaps += 2
          }
        }
      }
    }
    return gaps
  }

  // 1. Adjacency score: Strong bonus for placing next to existing groups
  for (const pos of positions) {
    const absX = x + pos.x
    const absY = y + pos.y
    // Check all 4 direct neighbors
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
    // Check diagonal neighbors (weaker bonus)
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

  // 1d. Small bonus for adjacent/nearby times
  if (group && assignedGroups) {
    for (const pos of positions) {
      const absX = x + pos.x
      const absY = y + pos.y
      for (const ag of assignedGroups) {
        const agPositions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
        for (const agPos of agPositions) {
          const agAbsX = ag.x + agPos.x
          const agAbsY = ag.y + agPos.y
          if ((Math.abs(absX - agAbsX) + Math.abs(absY - agAbsY)) === 1) {
            // Direct neighbor
            if (group.time && ag.group.time) {
              const t1 = typeof group.time === 'string' ? group.time : ''
              const t2 = typeof ag.group.time === 'string' ? ag.group.time : ''
              // Parse times as HH:MM
              const [h1, m1] = t1.split(':').map(Number)
              const [h2, m2] = t2.split(':').map(Number)
              if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
                const min1 = h1 * 60 + m1
                const min2 = h2 * 60 + m2
                const diff = Math.abs(min1 - min2)
                if (diff === 0) score += 2
                else if (diff <= 15) score += 1
              }
            }
          }
        }
      }
    }
  }

  // 1b. Side balance bonus: prefer placements spanning both sides of the table
  // Determine perpendicular orientation from table rotation
  const isVertical = getPerpendicularOrientation(table.rotation ?? 0) === 'VERTICAL'
  if (positions.length > 1) {
    const sideValues = positions.map(p => isVertical ? p.x : p.y)
    const side0 = sideValues.filter(v => v === 0).length
    const side1 = sideValues.filter(v => v === 1).length
    const total = positions.length
    const balanceRatio = Math.min(side0, side1) / total // 0..0.5
    // Reward distributing across both sides; stronger for larger groups
    score += balanceRatio * 20
    // Small penalty if entirely on one side (when table supports two sides)
    if ((side0 === 0 || side1 === 0) && (isVertical ? table.width >= 2 : table.height >= 2)) {
      score -= 8
    }
    // Slight bonus for odd-sized groups that naturally stagger across sides
    if (total % 2 === 1 && side0 > 0 && side1 > 0) {
      score += 3
    }
  }

  // 1c. Row pairing bonus: prefer placements that complete rows across both sides
  if (positions.length > 0) {
    for (const pos of positions) {
      const absX = x + pos.x
      const absY = y + pos.y
      if (isVertical) {
        const acrossX = x + (1 - pos.x)
        const keyAcross = `${acrossX},${absY}`
        if (occupied.has(keyAcross)) {
          score += 30 // Stronger bonus for pairing, helps 5&5 and odd combos
        }
      } else {
        const acrossY = y + (1 - pos.y)
        const keyAcross = `${absX},${acrossY}`
        if (occupied.has(keyAcross)) {
          score += 30
        }
      }
    }
  }

  // 2. Simulate placement and evaluate resulting gaps
  const tempOccupied = new Set(occupied)
  for (const pos of positions) {
    tempOccupied.add(`${x + pos.x},${y + pos.y}`)
  }

  const isolatedGapsBefore = countIsolatedGaps(occupied)
  const isolatedGapsAfter = countIsolatedGaps(tempOccupied)
  score -= isolatedGapsAfter * 12 // Even stronger penalty for fragmentation

  // 3. Compactness bonus: prefer arrangements where group members touch each other
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
      // Penalize diagonal relationships within the group
      if (dx === 1 && dy === 1) {
        score -= 12
      }
    }
  }
  // Stronger weight for internal adjacency to keep group members together
  score += internalAdjacency * 8

  // Compactness by bounding box: prefer small bounding area (no holes)
  const minX = Math.min(...positions.map(p => p.x))
  const maxX = Math.max(...positions.map(p => p.x))
  const minY = Math.min(...positions.map(p => p.y))
  const maxY = Math.max(...positions.map(p => p.y))
  const bboxW = maxX - minX + 1
  const bboxH = maxY - minY + 1
  const bboxArea = bboxW * bboxH
  if (bboxArea === positions.length) {
    // perfectly compact (no holes)
    score += 20
  } else {
    // penalize shapes with holes/inefficient spread
    score -= (bboxArea - positions.length) * 8
  }

  // Special strong bonus for 4-person 2x2 block
  if (positions.length === 4 && bboxW === 2 && bboxH === 2) {
    score += 30
  }

  // Per-member adjacency penalty: each member should have at least one orthogonal neighbor
  let isolatedMembers = 0
  const posSet = new Set(positions.map(p => `${p.x},${p.y}`))
  for (const p of positions) {
    const neighKeys = [
      `${p.x-1},${p.y}`,
      `${p.x+1},${p.y}`,
      `${p.x},${p.y-1}`,
      `${p.x},${p.y+1}`
    ]
    const hasNeighbor = neighKeys.some(k => posSet.has(k))
    if (!hasNeighbor) isolatedMembers++
  }
  if (isolatedMembers > 0) {
    score -= isolatedMembers * 25 // strong penalty per isolated member
  }

  // Across-table counterpart penalty: prefer people to have someone opposite on the other side
  const supportsTwoSides = isVertical ? (table.width >= 2) : (table.height >= 2)
  if (supportsTwoSides) {
    let missingAcross = 0
    for (const p of positions) {
      if (isVertical) {
        const acrossKey = `${1 - p.x},${p.y}`
        if (!posSet.has(acrossKey)) missingAcross++
      } else {
        const acrossKey = `${p.x},${1 - p.y}`
        if (!posSet.has(acrossKey)) missingAcross++
      }
    }
    if (missingAcross > 0) {
      score -= missingAcross * 12
    }
  }

  // Disallow disconnected placements (prevent splitting families across non-adjacent cells)
  if (!positionsAreConnected(positions)) {
    return -Infinity
  }

  // 3b. Specific 2-person alignment preference
  if (positions.length === 2) {
    const [a, b] = positions
    const gapReduction = isolatedGapsBefore - isolatedGapsAfter
    if (isVertical) {
      // Prefer same-row across sides (gegenüber) over same-side adjacent (nebeneinander)
      const isOpposite = a.y === b.y && a.x !== b.x
      const isAdjacent = a.x === b.x && Math.abs(a.y - b.y) === 1
      const isDiagonal = a.x !== b.x && a.y !== b.y
      if (isOpposite) score += 35
      if (isAdjacent) score += gapReduction > 0 ? 4 : -20
      if (isDiagonal) score -= 10
    } else {
      // Horizontal orientation: rows are sides
      const isOpposite = a.x === b.x && a.y !== b.y
      const isAdjacent = a.y === b.y && Math.abs(a.x - b.x) === 1
      const isDiagonal = a.x !== b.x && a.y !== b.y
      if (isOpposite) score += 35
      if (isAdjacent) score += gapReduction > 0 ? 4 : -20
      if (isDiagonal) score -= 10
    }
  }

  // Prefer placements closer to top-left (tie-breaker)
  score -= (x + y) * 0.1

  return score
}

function findPlacement(
  table: Table,
  group: Group,
  existing: AssignedGroup[],
  occupied: Set<string>
): { x: number; y: number; rotation: number } | null {
  const dbg = typeof window !== 'undefined' ? localStorage.getItem('debugPlacement') : null
  const debugLevel = dbg === '2' ? 2 : (dbg === '1' ? 1 : 0)
  let bestPlacement: { x: number; y: number; rotation: number } | null = null
  let bestScore = -Infinity
  const rotSummaries: Array<{ rot: number; bestScore: number; x: number; y: number }> = []

  // Test all 8 rotations (0-3 normal, 4-7 mirrored)
  for (let rot = 0; rot < 8; rot++) {
    const positions = getPositionsForSize(group.size, rot, table.width, table.height, table.rotation)
    const maxX = Math.max(...positions.map(p => p.x))
    const maxY = Math.max(...positions.map(p => p.y))
    let bestRotScore = -Infinity
    let bestRotX = -1
    let bestRotY = -1

    for (let y = 0; y <= table.height - 1 - maxY; y++) {
      for (let x = 0; x <= table.width - 1 - maxX; x++) {
        let collision = false
        for (const pos of positions) {
          const key = `${x + pos.x},${y + pos.y}`
          if (occupied.has(key)) { collision = true; break }
        }
        
        if (!collision) {
          const score = scorePlacement(table, positions, x, y, occupied, group, existing)
          if (score > bestRotScore) {
            bestRotScore = score
            bestRotX = x
            bestRotY = y
          }
          if (score > bestScore) {
            bestScore = score
            bestPlacement = { x, y, rotation: rot }
          }
        }
      }
    }
    if (bestRotScore > -Infinity) {
      rotSummaries.push({ rot, bestScore: bestRotScore, x: bestRotX, y: bestRotY })
    }
  }
  if (debugLevel === 2 && rotSummaries.length) {
    for (const s of rotSummaries) {
      console.debug('[findPlacement:rotation-summary]', { table: table.id, group: group.size, rot: s.rot, bestScore: s.bestScore, x: s.x, y: s.y })
    }
  } else if (debugLevel === 1 && rotSummaries.length) {
    const top = [...rotSummaries].sort((a, b) => b.bestScore - a.bestScore).slice(0, 3)
    console.debug('[findPlacement:top3]', { table: table.id, group: group.size, candidates: top })
  }
  if (debugLevel > 0 && bestPlacement) {
    console.debug('[findPlacement:chosen]', { table: table.id, group: group.size, rot: bestPlacement.rotation, x: bestPlacement.x, y: bestPlacement.y, score: bestScore })
  }
  return bestPlacement
}

export function placeGroupsOnTable(table: Table, groups: Group[], seedPlaced: AssignedGroup[] = []): { placed: AssignedGroup[]; unplaced: Group[] } {
  const placed: AssignedGroup[] = [...seedPlaced]
  const unplaced: Group[] = []
  const occupied = new Set<string>()

  for (const ag of seedPlaced) {
    const positions = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
    addPositionsToSet(occupied, positions, ag.x, ag.y)
  }

  for (const g of groups) {
    const placement = findPlacement(table, g, placed, occupied)
    if (placement) {
      const positions = getPositionsForSize(g.size, placement.rotation, table.width, table.height, table.rotation)
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
    const cells = getPositionsForSize(ag.group.size, ag.rotation, table.width, table.height, table.rotation)
    for (const c of cells) occ.add(`${ag.x + c.x},${ag.y + c.y}`)
  }
  return occ
}

export function tryPlaceOnTable(
  table: Table,
  group: Group,
  occupied: Set<string>,
  existing: AssignedGroup[] = []
): { x: number; y: number; rotation: number } | null {
  const dbg = typeof window !== 'undefined' ? localStorage.getItem('debugPlacement') : null
  const debugLevel = dbg === '2' ? 2 : (dbg === '1' ? 1 : 0)
  let bestPlacement: { x: number; y: number; rotation: number } | null = null
  let bestScore = -Infinity
  const rotSummaries: Array<{ rot: number; bestScore: number; x: number; y: number }> = []

  // Test all 8 rotations (0-3 normal, 4-7 mirrored)
  for (let rot = 0; rot < 8; rot++) {
    const cells = getPositionsForSize(group.size, rot, table.width, table.height, table.rotation)
    const w = Math.max(...cells.map(c => c.x)) + 1
    const h = Math.max(...cells.map(c => c.y)) + 1
    if (w > table.width || h > table.height) continue
    let bestRotScore = -Infinity
    let bestRotX = -1
    let bestRotY = -1

    for (let y = 0; y <= table.height - h; y++) {
      for (let x = 0; x <= table.width - w; x++) {
        let ok = true
        for (const c of cells) {
          const key = `${x + c.x},${y + c.y}`
          if (occupied.has(key)) { ok = false; break }
        }
        
        if (ok) {
          const score = scorePlacement(table, cells, x, y, occupied, group, existing)
          if (score > bestRotScore) {
            bestRotScore = score
            bestRotX = x
            bestRotY = y
          }
          if (score > bestScore) {
            bestScore = score
            bestPlacement = { x, y, rotation: rot }
          }
        }
      }
    }
    if (bestRotScore > -Infinity) {
      rotSummaries.push({ rot, bestScore: bestRotScore, x: bestRotX, y: bestRotY })
    }
  }
  if (debugLevel === 2 && rotSummaries.length) {
    for (const s of rotSummaries) {
      console.debug('[tryPlaceOnTable:rotation-summary]', { table: table.id, group: group.size, rot: s.rot, bestScore: s.bestScore, x: s.x, y: s.y })
    }
  } else if (debugLevel === 1 && rotSummaries.length) {
    const top = [...rotSummaries].sort((a, b) => b.bestScore - a.bestScore).slice(0, 3)
    console.debug('[tryPlaceOnTable:top3]', { table: table.id, group: group.size, candidates: top })
  }
  if (debugLevel > 0 && bestPlacement) {
    console.debug('[tryPlaceOnTable:chosen]', { table: table.id, group: group.size, rot: bestPlacement.rotation, x: bestPlacement.x, y: bestPlacement.y, score: bestScore })
  }
  return bestPlacement
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
      const pos = tryPlaceOnTable(t, g, occByTable[t.id], nextByTable[t.id])
      if (!pos) continue
      const cells = getPositionsForSize(g.size, pos.rotation, t.width, t.height, t.rotation)
      const placementScore = scorePlacement(t, cells, pos.x, pos.y, occByTable[t.id], g, nextByTable[t.id])
      const usedCellsNow = nextByTable[t.id].reduce((acc, ag) => acc + ag.group.size, 0)
      const capacityScore = (t.width * t.height) - (usedCellsNow + g.size)
      const combinedScore = placementScore * 1000 + capacityScore // prioritize placement quality
      if (!best || combinedScore > best.score || (combinedScore === best.score && t.id < best.table.id)) {
        best = { table: t, pos, score: combinedScore }
      }
    }
    if (best) {
      const ag: AssignedGroup = { group: g, rotation: best.pos.rotation, locked: false, x: best.pos.x, y: best.pos.y, color: '' }
      nextByTable[best.table.id].push(ag)
      const cells = getPositionsForSize(g.size, ag.rotation, best.table.width, best.table.height, best.table.rotation)
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
      const pos = tryPlaceOnTable(t, g, occByTable[t.id], nextByTable[t.id])
      if (!pos) continue
      const ag: AssignedGroup = { group: g, rotation: pos.rotation, locked: false, x: pos.x, y: pos.y, color: '' }
      nextByTable[t.id].push(ag)
      const cells = getPositionsForSize(g.size, ag.rotation, t.width, t.height, t.rotation)
      for (const c of cells) occByTable[t.id].add(`${ag.x + c.x},${ag.y + c.y}`)
      placed = true
      break
    }
    if (!placed) remaining.push(g)
  }

  return { nextByTable, notPlaced: remaining }
}
