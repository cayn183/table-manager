import { generateOptimalSeating, canFit } from './layoutUtils'

export type Group = { name: string; size: number; time?: string; toGo?: boolean }
export type Table = { id: string; capacity: number; width: number; height: number; rotation?: number }

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
      if (rem >= g.size && canFit(g.size, t.width, t.height, t.rotation ?? 0)) {
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
