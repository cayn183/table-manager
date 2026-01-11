export type Group = { name: string; size: number; time?: string; toGo?: boolean }
export type Table = { id: string; capacity: number; width: number; height: number }

// Generate layouts that fit inside the table grid (e.g., 2x3 + 1), deduped by coordinates
function generatePossibleLayouts(size: number, maxWidth: number, maxHeight: number): { x: number; y: number }[][] {
  const layouts: { x: number; y: number }[][] = []
  const seen = new Set<string>()

  for (let cols = 1; cols <= maxWidth; cols++) {
    for (let rows = 1; rows <= maxHeight; rows++) {
      const mainBlock = cols * rows
      if (mainBlock >= size) {
        const pos: { x: number; y: number }[] = []
        for (let i = 0; i < size; i++) pos.push({ x: i % cols, y: Math.floor(i / cols) })
        const maxX = Math.max(...pos.map(p => p.x))
        const maxY = Math.max(...pos.map(p => p.y))
        if (maxX < maxWidth && maxY < maxHeight) {
          const key = pos.map(p => `${p.x},${p.y}`).sort().join('|')
          if (!seen.has(key)) {
            seen.add(key)
            layouts.push(pos)
          }
        }
      } else if (mainBlock < size && rows < maxHeight) {
        const pos: { x: number; y: number }[] = []
        for (let i = 0; i < mainBlock; i++) pos.push({ x: i % cols, y: Math.floor(i / cols) })
        const remaining = size - mainBlock
        for (let i = 0; i < Math.min(remaining, cols); i++) pos.push({ x: i, y: rows })
        if (pos.length === size) {
          const maxX = Math.max(...pos.map(p => p.x))
          const maxY = Math.max(...pos.map(p => p.y))
          if (maxX < maxWidth && maxY < maxHeight) {
            const key = pos.map(p => `${p.x},${p.y}`).sort().join('|')
            if (!seen.has(key)) {
              seen.add(key)
              layouts.push(pos)
            }
          }
        }
      }
    }
  }

  // keep layouts with minimal bounding-box area for each key shape
  return layouts.sort((a, b) => {
    const aArea = (Math.max(...a.map(p => p.x)) + 1) * (Math.max(...a.map(p => p.y)) + 1)
    const bArea = (Math.max(...b.map(p => p.x)) + 1) * (Math.max(...b.map(p => p.y)) + 1)
    return aArea - bArea
  })
}

// Quick check whether a group can fit the table grid respecting width/height
function canFit(size: number, tableWidth: number, tableHeight: number): boolean {
  if (size <= 0) return false
  if (size > tableWidth * tableHeight) return false
  // Simple rectangle packing
  for (let w = 1; w <= tableWidth; w++) {
    for (let h = 1; h <= tableHeight; h++) {
      if (w * h >= size) return true
    }
  }
  // Adaptive shapes (e.g., 2x3 + 1)
  return generatePossibleLayouts(size, tableWidth, tableHeight).length > 0
}

// Best-Fit Decreasing: sort groups desc, place in table with smallest remaining capacity that fits grid constraints
export function bestFitAssign(tables: Table[], groups: Group[]) {
  const remaining = new Map<string, number>()
  const assigned = Object.create(null) as Record<string, Group[]>
  for (const t of tables) {
    remaining.set(t.id, t.capacity)
    assigned[t.id] = []
  }

  const sorted = [...groups].sort((a, b) => b.size - a.size)

  for (const g of sorted) {
    let bestId: string | null = null
    let bestRem = Infinity
    let bestArea = Infinity

    for (const t of tables) {
      const rem = remaining.get(t.id) ?? 0
      if (rem >= g.size && canFit(g.size, t.width, t.height)) {
        const after = rem - g.size
        const area = t.width * t.height
        if (
          after < bestRem ||
          (after === bestRem && area < bestArea) ||
          (after === bestRem && area === bestArea && (bestId === null || t.id < bestId))
        ) {
          bestRem = after
          bestArea = area
          bestId = t.id
        }
      }
    }

    if (bestId) {
      assigned[bestId].push(g)
      remaining.set(bestId, (remaining.get(bestId) || 0) - g.size)
    } else {
      // not fit anywhere — place into special overflow bucket ("UNASSIGNED")
      if (!assigned['UNASSIGNED']) assigned['UNASSIGNED'] = []
      assigned['UNASSIGNED'].push(g)
    }
  }

  return assigned
}
