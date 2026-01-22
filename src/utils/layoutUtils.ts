/**
 * ============================================================================
 * SEATING ARRANGEMENT LOGIC - ANFORDERUNGEN & PROBLEME
 * ============================================================================
 * 
 * ANFORDERUNGEN:
 * 1. Tische haben VARIABLE Dimensionen (festgelegt im RoomEditor)
 *    - Breite × Höhe können beliebig sein (z.B. 2×20, 4×6, 10×10, etc.)
 *    - Können beliebig rotiert werden (0-3 Rotationen)
 * 
 * 2. ROTATIONSRICHTUNG-LOGIK:
 *    - Rotation 0 (Ost →):   Personen sitzen Nord/Süd (2 Spalten verteilt)
 *    - Rotation 1 (Süd ↓):   Personen sitzen Ost/West (2 Reihen verteilt)
 *    - Rotation 2 (West ←):  Personen sitzen Nord/Süd (2 Spalten verteilt)
 *    - Rotation 3 (Nord ↑):  Personen sitzen Ost/West (2 Reihen verteilt)
 * 
 * 3. Ziel: Familienmitglieder auf BEIDEN perpendkularen Seiten verteilen
 *    - Nicht in einer langen Reihe
 *    - Balanced zwischen beiden Seiten wenn möglich
 *    - Respektiert Tischgrenzen (nicht über Kanten hinaus)
 * 
 * 4. Platzierungslogik:
 *    a) Prüfe Tischrotation → bestimmt perpendkulare Richtung
 *    b) Generiere Layout für N Personen mit max 2 "Spalten/Reihen" in perpendkularer Richtung
 *    c) Respektiere Tischgrenzen vollständig
 * 
 * 5. Varianten pro Größe (Gruppe Rotationen 0-7 für Selection):
 *    - Rotation 0-3: verschiedene Anordnungsmuster (balanced, left/top-heavy, right/bottom-heavy)
 *    - Rotation 4-7: Gespiegelte Varianten
 * 
 * ============================================================================
 */

// Cache for generated layouts
const layoutCache: Map<string, { x: number; y: number }[][]> = new Map()

/**
 * Determine perpendicular orientation based on table rotation
 * 
 * Rotation 0 (Ost →):   → Perpendkulare Richtung ist Vertikal (Nord/Süd)
 * Rotation 1 (Süd ↓):   → Perpendkulare Richtung ist Horizontal (Ost/West)
 * Rotation 2 (West ←):  → Perpendkulare Richtung ist Vertikal (Nord/Süd)
 * Rotation 3 (Nord ↑):  → Perpendkulare Richtung ist Horizontal (Ost/West)
 */
export function getPerpendicularOrientation(tableRotation: number): 'VERTICAL' | 'HORIZONTAL' {
  const normalizedRotation = tableRotation % 4
  return normalizedRotation === 0 || normalizedRotation === 2 ? 'VERTICAL' : 'HORIZONTAL'
}

/**
 * Generate optimal seating layout respecting table rotation
 * 
 * VERTICAL (Rotation 0/2):
 *   - 2 Spalten perpendikular (Nord/Süd)
 *   - Höhe = ceil(size/2)
 *   - Muss passen in: breite >= 2, höhe >= ceil(size/2)
 * 
 * HORIZONTAL (Rotation 1/3):
 *   - 2 Reihen perpendikular (Ost/West)
 *   - Breite = ceil(size/2)
 *   - Muss passen in: breite >= ceil(size/2), höhe >= 2
 */
export function generateOptimalSeating(
  size: number,
  tableWidth: number,
  tableHeight: number,
  tableRotation: number = 0
): { x: number; y: number }[] {
  const isVertical = getPerpendicularOrientation(tableRotation) === 'VERTICAL'

  if (isVertical) {
    // VERTICAL: 2 Spalten, variable Reihen
    const neededHeight = Math.ceil(size / 2)

    // Grenzenprüfung
    if (neededHeight > tableHeight || 2 > tableWidth) {
      return [] // Passt nicht
    }

    const layout: { x: number; y: number }[] = []
    for (let i = 0; i < size; i++) {
      const col = i % 2
      const row = Math.floor(i / 2)
      layout.push({ x: col, y: row })
    }
    return layout
  } else {
    // HORIZONTAL: 2 Reihen, variable Spalten
    const neededWidth = Math.ceil(size / 2)

    // Grenzenprüfung
    if (neededWidth > tableWidth || 2 > tableHeight) {
      return [] // Passt nicht
    }

    const layout: { x: number; y: number }[] = []
    for (let i = 0; i < size; i++) {
      const row = i % 2
      const col = Math.floor(i / 2)
      layout.push({ x: col, y: row })
    }
    return layout
  }
}

/**
 * Get multiple layout variations for same size, considering table rotation
 * Unterschiedliche Anordnungsmuster mit gleicher Größe
 * 
 * Rotation 0-3 von der Gruppe wählen verschiedene Varianten:
 * - Rotation 0: Balanced (alternating)
 * - Rotation 1: Left/Top heavy
 * - Rotation 2: Right/Bottom heavy
 * - Rotation 3: Alternative pattern
 */
export function getLayoutVariations(
  size: number,
  tableWidth: number,
  tableHeight: number,
  tableRotation: number = 0
): { x: number; y: number }[][] {
  const cacheKey = `${size}-${tableWidth}x${tableHeight}-${tableRotation % 4}`

  if (layoutCache.has(cacheKey)) {
    return layoutCache.get(cacheKey)!
  }

  const variations: { x: number; y: number }[][] = []
  const isVertical = getPerpendicularOrientation(tableRotation) === 'VERTICAL'

  if (isVertical) {
    // VERTICAL: 2 Spalten (Nord/Süd), variable Reihen
    const neededHeight = Math.ceil(size / 2)

    if (neededHeight <= tableHeight && 2 <= tableWidth) {
      // Variation 0: Balanced (alternating left/right)
      const balanced: { x: number; y: number }[] = []
      for (let i = 0; i < size; i++) {
        balanced.push({ x: i % 2, y: Math.floor(i / 2) })
      }
      variations.push(balanced)

      // Variation 1: Left-heavy (fill left column first)
      if (size > 2) {
        const leftHeavy: { x: number; y: number }[] = []
        let count = 0
        for (let row = 0; row < neededHeight && count < size; row++) {
          leftHeavy.push({ x: 0, y: row })
          count++
        }
        for (let row = 0; row < neededHeight && count < size; row++) {
          leftHeavy.push({ x: 1, y: row })
          count++
        }
        variations.push(leftHeavy)
      }

      // Variation 2: Right-heavy (fill right column first)
      if (size > 2) {
        const rightHeavy: { x: number; y: number }[] = []
        let count = 0
        for (let row = 0; row < neededHeight && count < size; row++) {
          rightHeavy.push({ x: 1, y: row })
          count++
        }
        for (let row = 0; row < neededHeight && count < size; row++) {
          rightHeavy.push({ x: 0, y: row })
          count++
        }
        variations.push(rightHeavy)
      }

      // Variation 3: Alternating blocks
      if (size > 4) {
        const blocks: { x: number; y: number }[] = []
        let count = 0
        for (let row = 0; row < neededHeight && count < size; row += 2) {
          blocks.push({ x: 0, y: row })
          count++
          if (count < size && row + 1 < neededHeight) {
            blocks.push({ x: 0, y: row + 1 })
            count++
          }
        }
        for (let row = 0; row < neededHeight && count < size; row += 2) {
          blocks.push({ x: 1, y: row })
          count++
          if (count < size && row + 1 < neededHeight) {
            blocks.push({ x: 1, y: row + 1 })
            count++
          }
        }
        if (blocks.length === size) {
          variations.push(blocks)
        }
      }

      // Variation 4: Staggered (right column offset by +1)
      {
        const staggerR: { x: number; y: number }[] = []
        for (let i = 0; i < size; i++) {
          const col = i % 2
          const row = Math.floor(i / 2) + (col === 1 ? 1 : 0)
          staggerR.push({ x: col, y: row })
        }
        const maxY = Math.max(...staggerR.map(p => p.y))
        const maxX = Math.max(...staggerR.map(p => p.x))
        if (maxY + 1 <= tableHeight && maxX + 1 <= tableWidth) {
          variations.push(staggerR)
        }
      }

      // Variation 5: Staggered (left column offset by +1)
      {
        const staggerL: { x: number; y: number }[] = []
        for (let i = 0; i < size; i++) {
          const col = i % 2
          const row = Math.floor(i / 2) + (col === 0 ? 1 : 0)
          staggerL.push({ x: col, y: row })
        }
        const maxY = Math.max(...staggerL.map(p => p.y))
        const maxX = Math.max(...staggerL.map(p => p.x))
        if (maxY + 1 <= tableHeight && maxX + 1 <= tableWidth) {
          variations.push(staggerL)
        }
      }
    }
  } else {
    // HORIZONTAL: 2 Reihen (Ost/West), variable Spalten
    const neededWidth = Math.ceil(size / 2)

    if (neededWidth <= tableWidth && 2 <= tableHeight) {
      // Variation 0: Balanced (alternating top/bottom)
      const balanced: { x: number; y: number }[] = []
      for (let i = 0; i < size; i++) {
        balanced.push({ x: Math.floor(i / 2), y: i % 2 })
      }
      variations.push(balanced)

      // Variation 1: Top-heavy (fill top row first)
      if (size > 2) {
        const topHeavy: { x: number; y: number }[] = []
        let count = 0
        for (let col = 0; col < neededWidth && count < size; col++) {
          topHeavy.push({ x: col, y: 0 })
          count++
        }
        for (let col = 0; col < neededWidth && count < size; col++) {
          topHeavy.push({ x: col, y: 1 })
          count++
        }
        variations.push(topHeavy)
      }

      // Variation 2: Bottom-heavy (fill bottom row first)
      if (size > 2) {
        const bottomHeavy: { x: number; y: number }[] = []
        let count = 0
        for (let col = 0; col < neededWidth && count < size; col++) {
          bottomHeavy.push({ x: col, y: 1 })
          count++
        }
        for (let col = 0; col < neededWidth && count < size; col++) {
          bottomHeavy.push({ x: col, y: 0 })
          count++
        }
        variations.push(bottomHeavy)
      }

      // Variation 3: Alternating blocks
      if (size > 4) {
        const blocks: { x: number; y: number }[] = []
        let count = 0
        for (let col = 0; col < neededWidth && count < size; col += 2) {
          blocks.push({ x: col, y: 0 })
          count++
          if (count < size && col + 1 < neededWidth) {
            blocks.push({ x: col + 1, y: 0 })
            count++
          }
        }
        for (let col = 0; col < neededWidth && count < size; col += 2) {
          blocks.push({ x: col, y: 1 })
          count++
          if (count < size && col + 1 < neededWidth) {
            blocks.push({ x: col + 1, y: 1 })
            count++
          }
        }
        if (blocks.length === size) {
          variations.push(blocks)
        }
      }

      // Variation 4: Staggered (bottom row offset by +1)
      {
        const staggerB: { x: number; y: number }[] = []
        for (let i = 0; i < size; i++) {
          const row = i % 2
          const col = Math.floor(i / 2) + (row === 1 ? 1 : 0)
          staggerB.push({ x: col, y: row })
        }
        const maxX = Math.max(...staggerB.map(p => p.x))
        const maxY = Math.max(...staggerB.map(p => p.y))
        if (maxX + 1 <= tableWidth && maxY + 1 <= tableHeight) {
          variations.push(staggerB)
        }
      }

      // Variation 5: Staggered (top row offset by +1)
      {
        const staggerT: { x: number; y: number }[] = []
        for (let i = 0; i < size; i++) {
          const row = i % 2
          const col = Math.floor(i / 2) + (row === 0 ? 1 : 0)
          staggerT.push({ x: col, y: row })
        }
        const maxX = Math.max(...staggerT.map(p => p.x))
        const maxY = Math.max(...staggerT.map(p => p.y))
        if (maxX + 1 <= tableWidth && maxY + 1 <= tableHeight) {
          variations.push(staggerT)
        }
      }
    }
  }

  layoutCache.set(cacheKey, variations)
  return variations
}

/**
 * Quick check: Kann eine Gruppe von N Personen auf den Tisch passen
 * respektierend der Tischrotation?
 */
export function canFit(
  size: number,
  tableWidth: number,
  tableHeight: number,
  tableRotation: number = 0
): boolean {
  if (size <= 0) return false
  if (size > tableWidth * tableHeight) return false

  const isVertical = getPerpendicularOrientation(tableRotation) === 'VERTICAL'

  if (isVertical) {
    // Vertical: 2 Spalten, variable Reihen
    const neededHeight = Math.ceil(size / 2)
    return neededHeight <= tableHeight && 2 <= tableWidth
  } else {
    // Horizontal: variable Spalten, 2 Reihen
    const neededWidth = Math.ceil(size / 2)
    return neededWidth <= tableWidth && 2 <= tableHeight
  }
}

/**
 * Get a specific layout from variations based on group rotation
 */
export function getLayoutByRotation(
  size: number,
  groupRotation: number,
  tableWidth: number,
  tableHeight: number,
  tableRotation: number = 0
): { x: number; y: number }[] {
  const variations = getLayoutVariations(size, tableWidth, tableHeight, tableRotation)

  if (variations.length === 0) {
    return [] // Kein Layout passt
  }

  // Group rotation 0-3 wählen verschiedene Variationen
  const normalizedGroupRotation = groupRotation % 4
  const variationIndex = Math.min(normalizedGroupRotation, variations.length - 1)

  let layout = [...variations[variationIndex]]

  // Apply mirroring for group rotation 4-7 based on perpendicular orientation
  if (groupRotation >= 4) {
    const isVertical = getPerpendicularOrientation(tableRotation) === 'VERTICAL'
    const maxX = Math.max(...layout.map(p => p.x))
    const maxY = Math.max(...layout.map(p => p.y))

    if (isVertical) {
      // Vertical seating (2 columns): mirror across X (left/right)
      layout = layout.map(p => ({ x: maxX - p.x, y: p.y }))
    } else {
      // Horizontal seating (2 rows): mirror across Y (top/bottom)
      layout = layout.map(p => ({ x: p.x, y: maxY - p.y }))
    }
  }

  return layout
}

