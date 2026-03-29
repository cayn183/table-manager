import React from 'react'
import type { Table, AssignedGroup } from '../../types/room'

interface MiniMapProps {
  tables: Table[]
  assignedGroups: Record<string, AssignedGroup[]>
  selectedTableId?: string | null
  onTableTap?: (tableId: string) => void
}

/**
 * Simplified table overview for mobile.
 * Shows tables as colored blocks with capacity fill indicators.
 */
export default function MiniMap({ tables, assignedGroups, selectedTableId, onTableTap }: MiniMapProps) {
  if (tables.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
        Kein Raum geladen
      </div>
    )
  }

  // Compute bounding box of all tables
  const minX = Math.min(...tables.map(t => t.x))
  const minY = Math.min(...tables.map(t => t.y))
  const maxX = Math.max(...tables.map(t => t.x + t.width))
  const maxY = Math.max(...tables.map(t => t.y + t.height))
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: `${rangeX}/${rangeY}`, maxHeight: '35vh', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {tables.map(table => {
        const assigned = assignedGroups[table.id] || []
        const usedSeats = assigned.reduce((sum, ag) => sum + ag.group.size, 0)
        const fillRatio = usedSeats / table.capacity
        const isSelected = selectedTableId === table.id
        const isLocked = table.locked

        // Color: green=free, yellow=partial, red=full, gray=locked
        let bgColor = '#dcfce7' // green
        let borderColor = '#86efac'
        if (isLocked) {
          bgColor = '#f1f5f9'; borderColor = '#cbd5e1'
        } else if (fillRatio >= 1) {
          bgColor = '#fecaca'; borderColor = '#f87171'
        } else if (fillRatio > 0) {
          bgColor = '#fef3c7'; borderColor = '#fbbf24'
        }

        if (isSelected) {
          borderColor = '#667eea'
        }

        // Position as percentage
        const left = `${((table.x - minX) / rangeX) * 100}%`
        const top = `${((table.y - minY) / rangeY) * 100}%`
        const width = `${(table.width / rangeX) * 100}%`
        const height = `${(table.height / rangeY) * 100}%`

        return (
          <button
            key={table.id}
            onClick={() => onTableTap?.(table.id)}
            style={{
              position: 'absolute',
              left, top, width, height,
              minWidth: 36,
              minHeight: 28,
              background: bgColor,
              border: `2px solid ${borderColor}`,
              borderRadius: 6,
              cursor: isLocked ? 'default' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: '#334155',
              padding: 2,
              boxShadow: isSelected ? '0 0 0 2px #667eea' : 'none',
              transition: 'box-shadow 0.15s',
              overflow: 'hidden',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 10, opacity: 0.7 }}>T{table.id}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {usedSeats}/{table.capacity}
            </span>
            {/* Fill bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: '#e2e8f0',
            }}>
              <div style={{
                width: `${Math.min(fillRatio, 1) * 100}%`,
                height: '100%',
                background: fillRatio >= 1 ? '#ef4444' : fillRatio > 0 ? '#f59e0b' : '#22c55e',
                transition: 'width 0.2s',
              }} />
            </div>
          </button>
        )
      })}
    </div>
  )
}
