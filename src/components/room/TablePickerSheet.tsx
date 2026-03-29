import React from 'react'
import type { Table, AssignedGroup } from '../../types/room'
import BottomSheet from '../layout/BottomSheet'

interface TablePickerSheetProps {
  open: boolean
  onClose: () => void
  tables: Table[]
  assignedGroups: Record<string, AssignedGroup[]>
  onSelect: (tableId: string) => void
  /** Group name being assigned (for title) */
  groupName?: string
}

/**
 * Bottom-sheet table selector for mobile tap-to-assign workflow.
 * Shows all tables as large tappable cards with capacity info.
 */
export default function TablePickerSheet({ open, onClose, tables, assignedGroups, onSelect, groupName }: TablePickerSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={groupName ? `Tisch für "${groupName}" wählen` : 'Tisch wählen'} height="half">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {tables.map(table => {
          const assigned = assignedGroups[table.id] || []
          const usedSeats = assigned.reduce((sum, ag) => sum + ag.group.size, 0)
          const freeSeats = table.capacity - usedSeats
          const isFull = freeSeats <= 0
          const isLocked = table.locked

          let bg = '#f0fdf4'
          let borderCol = '#86efac'
          if (isLocked) {
            bg = '#f1f5f9'; borderCol = '#cbd5e1'
          } else if (isFull) {
            bg = '#fef2f2'; borderCol = '#fca5a5'
          } else if (usedSeats > 0) {
            bg = '#fffbeb'; borderCol = '#fcd34d'
          }

          return (
            <button
              key={table.id}
              disabled={isFull || isLocked}
              onClick={() => { onSelect(table.id); onClose() }}
              style={{
                padding: '16px 12px',
                background: bg,
                border: `2px solid ${borderCol}`,
                borderRadius: 12,
                cursor: isFull || isLocked ? 'not-allowed' : 'pointer',
                opacity: isFull || isLocked ? 0.5 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minHeight: 80,
                transition: 'transform 0.1s',
              }}
            >
              <span style={{ fontSize: 20 }}>🪑</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Tisch {table.id}</span>
              <span style={{ fontSize: 12, color: isFull ? '#dc2626' : '#64748b' }}>
                {isFull ? 'Voll' : isLocked ? 'Gesperrt' : `${freeSeats} frei / ${table.capacity}`}
              </span>
              {/* Names of existing guests */}
              {assigned.length > 0 && (
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: 'center', lineHeight: 1.3 }}>
                  {assigned.slice(0, 3).map(ag => ag.group.name).join(', ')}
                  {assigned.length > 3 && ` +${assigned.length - 3}`}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
