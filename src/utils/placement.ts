export type Group = { name: string; size: number }
export type Table = { id: string; capacity: number }

// Best-Fit Decreasing: sort groups desc, place in table with smallest remaining capacity that fits
export function bestFitAssign(tables: Table[], groups: Group[]) {
  const remaining = new Map<string, number>()
  const assigned = Object.create(null) as Record<string, Group[]>
  for (const t of tables) {
    remaining.set(t.id, t.capacity)
    assigned[t.id] = []
  }

  const sorted = [...groups].sort((a, b) => b.size - a.size)

  for (const g of sorted) {
    // find best-fit table: smallest remaining capacity >= g.size
    let bestId: string | null = null
    let bestRem = Infinity
    for (const [id, rem] of remaining.entries()) {
      if (rem >= g.size && rem - g.size < bestRem) {
        bestRem = rem - g.size
        bestId = id
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
