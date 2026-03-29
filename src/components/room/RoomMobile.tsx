// ============================================================================
// RoomMobile: Simplified seating planner for mobile devices
// Uses tap-to-assign instead of drag-and-drop
// ============================================================================
import React, { useState, useCallback } from 'react'
import type { Table, AssignedGroup } from '../../types/room'
import type { Group } from './Importer'
import MiniMap from './MiniMap'
import TablePickerSheet from './TablePickerSheet'
import BottomSheet from '../layout/BottomSheet'
import {
  PALETTE,
  TOGO_COLOR,
  paletteColor,
  groupKey,
  buildOccupied,
  getPositionsForSize,
  isValidPosition,
  greedyReLayout,
  fillOnly,
  ensureToGoBucket,
  generateUUID,
  tryPlaceOnTable,
} from '../../utils/roomUtils'
import type { Room as RoomType } from '../../types/room'

interface RoomMobileProps {
  room: RoomType
  groups: Group[]
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>
  assignedGroups: Record<string, AssignedGroup[]>
  setAssignedGroups: React.Dispatch<React.SetStateAction<Record<string, AssignedGroup[]>>>
  onSave: () => void
  onAutoAssign: () => void
  isDirty: boolean
  lastSaveTime: string | null
  readOnly?: boolean
  onAddGroup?: (group: Group) => void
  onEditGroup?: (group: Group, oldKey: string) => void
  onDeleteGroup?: (key: string) => void
}

export default function RoomMobile({
  room,
  groups,
  setGroups,
  assignedGroups,
  setAssignedGroups,
  onSave,
  onAutoAssign,
  isDirty,
  lastSaveTime,
  readOnly,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
}: RoomMobileProps) {
  const [listView, setListView] = useState<'available' | 'assigned'>('available')
  const [pickerGroup, setPickerGroup] = useState<{ group: Group; index: number } | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [tableDetailSheet, setTableDetailSheet] = useState(false)
  const [addGroupSheet, setAddGroupSheet] = useState(false)
  const [actionSheet, setActionSheet] = useState<{ group: Group; key: string; isAssigned: boolean; tableId?: string } | null>(null)
  // Add group form
  const [newName, setNewName] = useState('')
  const [newSalutation, setNewSalutation] = useState<'Fam' | 'Frau' | 'Herr'>('Fam')
  const [newSize, setNewSize] = useState('4')
  const [newTime, setNewTime] = useState('')
  const [newToGo, setNewToGo] = useState(false)
  const [newAccessible, setNewAccessible] = useState(false)
  const [newNote, setNewNote] = useState('')

  const tables = room.tables

  // --- Stats ---
  const totalSeats = tables.reduce((s, t) => s + t.capacity, 0)
  const usedSeats = Object.values(assignedGroups).flat().reduce((s, ag) => s + ag.group.size, 0)
  const totalGroups = groups.length + Object.values(assignedGroups).flat().length

  // --- Assign group to table (auto best-fit placement) ---
  const handleAssignToTable = useCallback((tableId: string) => {
    if (!pickerGroup) return
    const { group } = pickerGroup
    const table = tables.find(t => t.id === tableId)
    if (!table) return

    // Build occupied cell set for this table
    const existing = assignedGroups[tableId] || []
    const occupied = buildOccupied(table, existing)
    const result = tryPlaceOnTable(table, group, occupied, existing)
    if (!result) return

    const colorIdx = Object.values(assignedGroups).flat().length % PALETTE.length
    const newAg: AssignedGroup = {
      group: { ...group, salutation: group.salutation || 'Fam' },
      rotation: result.rotation,
      locked: false,
      x: result.x,
      y: result.y,
      color: paletteColor(PALETTE[colorIdx]),
    }

    setAssignedGroups(prev => ({
      ...prev,
      [tableId]: [...(prev[tableId] || []), newAg],
    }))
    setGroups(prev => prev.filter((_, i) => i !== pickerGroup.index))
    setPickerGroup(null)
  }, [pickerGroup, tables, assignedGroups, setAssignedGroups, setGroups])

  // --- Remove assignment (move back to available) ---
  const handleUnassign = useCallback((tableId: string, agIdx: number) => {
    const ag = assignedGroups[tableId]?.[agIdx]
    if (!ag) return
    setGroups(prev => [...prev, ag.group])
    setAssignedGroups(prev => ({
      ...prev,
      [tableId]: (prev[tableId] || []).filter((_, i) => i !== agIdx),
    }))
    setActionSheet(null)
  }, [assignedGroups, setGroups, setAssignedGroups])

  // --- Delete group ---
  const handleDelete = useCallback((key: string, isAssigned: boolean, tableId?: string) => {
    if (isAssigned && tableId !== undefined) {
      // Find the group in assigned and remove
      setAssignedGroups(prev => {
        const list = prev[tableId] || []
        return { ...prev, [tableId]: list.filter(ag => groupKey(ag.group) !== key) }
      })
    } else {
      setGroups(prev => prev.filter(g => groupKey(g) !== key))
    }
    setActionSheet(null)
    onDeleteGroup?.(key)
  }, [setAssignedGroups, setGroups, onDeleteGroup])

  // --- Add group ---
  const handleAddGroup = useCallback(() => {
    const name = newName.trim()
    if (!name) return
    const group: Group = {
      id: generateUUID(),
      name,
      salutation: newSalutation,
      size: Math.max(1, parseInt(newSize) || 1),
      time: newTime || undefined,
      toGo: newToGo,
      accessible: newAccessible,
      note: newNote || undefined,
    }
    setGroups(prev => [...prev, group])
    onAddGroup?.(group)
    // Reset form
    setNewName(''); setNewSize('4'); setNewTime(''); setNewToGo(false); setNewAccessible(false); setNewNote('')
    setAddGroupSheet(false)
  }, [newName, newSalutation, newSize, newTime, newToGo, newAccessible, newNote, setGroups, onAddGroup])

  // --- Tap on MiniMap table ---
  const handleTableTap = useCallback((tableId: string) => {
    setSelectedTableId(tableId)
    setTableDetailSheet(true)
  }, [])

  // --- Long-press handler for group items ---
  const handleGroupLongPress = useCallback((group: Group, isAssigned: boolean, tableId?: string) => {
    setActionSheet({ group, key: groupKey(group), isAssigned, tableId })
  }, [])

  // All assigned groups flat
  const allAssigned: Array<{ ag: AssignedGroup; tableId: string; idx: number }> = []
  for (const [tid, ags] of Object.entries(assignedGroups)) {
    ags.forEach((ag, i) => allAssigned.push({ ag, tableId: tid, idx: i }))
  }

  // Table detail info
  const detailTable = tables.find(t => t.id === selectedTableId)
  const detailAssigned = selectedTableId ? (assignedGroups[selectedTableId] || []) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc' }}>
      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 12, padding: '8px 12px',
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        fontSize: 12, color: '#64748b', flexWrap: 'wrap',
      }}>
        <span>🪑 {tables.length} Tische</span>
        <span>👤 {usedSeats}/{totalSeats}</span>
        <span>📋 {groups.length} offen</span>
        {isDirty && <span style={{ color: '#f59e0b' }}>● Ungespeichert</span>}
      </div>

      {/* MiniMap */}
      <div style={{ padding: '8px 12px', flexShrink: 0 }}>
        <MiniMap
          tables={tables}
          assignedGroups={assignedGroups}
          selectedTableId={selectedTableId}
          onTableTap={handleTableTap}
        />
      </div>

      {/* Tab toggle: Unzugewiesen / Zugewiesen */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #e2e8f0',
        background: '#fff', flexShrink: 0,
      }}>
        <button
          onClick={() => setListView('available')}
          style={{
            flex: 1, padding: '10px 0', border: 'none', background: 'none',
            fontWeight: listView === 'available' ? 700 : 400,
            color: listView === 'available' ? '#667eea' : '#64748b',
            borderBottom: listView === 'available' ? '2px solid #667eea' : '2px solid transparent',
            fontSize: 13, cursor: 'pointer',
          }}
        >
          📋 Offen ({groups.length})
        </button>
        <button
          onClick={() => setListView('assigned')}
          style={{
            flex: 1, padding: '10px 0', border: 'none', background: 'none',
            fontWeight: listView === 'assigned' ? 700 : 400,
            color: listView === 'assigned' ? '#667eea' : '#64748b',
            borderBottom: listView === 'assigned' ? '2px solid #667eea' : '2px solid transparent',
            fontSize: 13, cursor: 'pointer',
          }}
        >
          🪑 Zugewiesen ({allAssigned.length})
        </button>
      </div>

      {/* Group list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 12px' }}>
        {listView === 'available' ? (
          groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 14 }}>
              Keine offenen Gruppen
            </div>
          ) : (
            groups.map((g, i) => (
              <GroupCard
                key={groupKey(g)}
                group={g}
                onTap={() => !readOnly && setPickerGroup({ group: g, index: i })}
                onLongPress={() => handleGroupLongPress(g, false)}
                subtitle="Tippen zum Zuweisen"
                readOnly={readOnly}
              />
            ))
          )
        ) : (
          allAssigned.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 14 }}>
              Noch niemand zugewiesen
            </div>
          ) : (
            allAssigned.map(({ ag, tableId, idx }) => (
              <GroupCard
                key={`${tableId}-${idx}`}
                group={ag.group}
                onTap={() => handleGroupLongPress(ag.group, true, tableId)}
                onLongPress={() => handleGroupLongPress(ag.group, true, tableId)}
                subtitle={tableId === 'TOGO' ? '🥡 To-Go' : `🪑 Tisch ${tableId}`}
                assigned
                readOnly={readOnly}
              />
            ))
          )
        )}
      </div>

      {/* Action bar */}
      {!readOnly && (
        <div style={{
          display: 'flex', gap: 8, padding: '10px 12px',
          background: '#fff', borderTop: '1px solid #e2e8f0',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setAddGroupSheet(true)}
            style={{
              flex: 1, padding: '12px 8px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            + Anlegen
          </button>
          <button
            onClick={onAutoAssign}
            style={{
              flex: 1, padding: '12px 8px', background: '#f0f0ff',
              color: '#667eea', border: '1px solid #667eea', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            ✨ Auto
          </button>
          <button
            onClick={onSave}
            style={{
              padding: '12px 16px',
              background: isDirty ? '#22c55e' : '#e2e8f0',
              color: isDirty ? '#fff' : '#94a3b8',
              border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14,
              cursor: isDirty ? 'pointer' : 'default',
            }}
          >
            💾
          </button>
        </div>
      )}

      {/* Table Picker Sheet (for tap-to-assign) */}
      <TablePickerSheet
        open={!!pickerGroup}
        onClose={() => setPickerGroup(null)}
        tables={tables.filter(t => !t.locked)}
        assignedGroups={assignedGroups}
        onSelect={handleAssignToTable}
        groupName={pickerGroup?.group.name}
      />

      {/* Table Detail Sheet (tapped from MiniMap) */}
      <BottomSheet
        open={tableDetailSheet}
        onClose={() => setTableDetailSheet(false)}
        title={detailTable ? `Tisch ${detailTable.id} (${detailAssigned.reduce((s, ag) => s + ag.group.size, 0)}/${detailTable.capacity})` : ''}
      >
        {detailAssigned.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>Keine Gäste an diesem Tisch</div>
        ) : (
          detailAssigned.map((ag, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px solid #f1f5f9',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {ag.group.salutation} {ag.group.name}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {ag.group.size} Pers. {ag.group.time && `· ${ag.group.time}`}
                </div>
              </div>
              {!readOnly && (
                <button
                  onClick={() => { handleUnassign(selectedTableId!, i); setTableDetailSheet(false) }}
                  style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  ↩ Entfernen
                </button>
              )}
            </div>
          ))
        )}
      </BottomSheet>

      {/* Action Sheet (long-press on group) */}
      <BottomSheet open={!!actionSheet} onClose={() => setActionSheet(null)} title={actionSheet?.group.name || ''}>
        {actionSheet && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actionSheet.isAssigned && actionSheet.tableId && (
              <button
                onClick={() => {
                  const idx = (assignedGroups[actionSheet.tableId!] || []).findIndex(ag => groupKey(ag.group) === actionSheet.key)
                  if (idx >= 0) handleUnassign(actionSheet.tableId!, idx)
                }}
                style={sheetBtnStyle}
              >
                ↩️ Zuweisung aufheben
              </button>
            )}
            {!actionSheet.isAssigned && (
              <button
                onClick={() => { setPickerGroup({ group: actionSheet.group, index: groups.findIndex(g => groupKey(g) === actionSheet.key) }); setActionSheet(null) }}
                style={sheetBtnStyle}
              >
                📌 Tisch zuweisen
              </button>
            )}
            <button
              onClick={() => handleDelete(actionSheet.key, actionSheet.isAssigned, actionSheet.tableId)}
              style={{ ...sheetBtnStyle, color: '#dc2626', borderColor: '#fca5a5' }}
            >
              🗑️ Löschen
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Add Group Sheet */}
      <BottomSheet open={addGroupSheet} onClose={() => setAddGroupSheet(false)} title="Familie anlegen">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Anrede</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['Fam', 'Frau', 'Herr'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setNewSalutation(s)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                    background: newSalutation === s ? '#667eea' : '#f1f5f9',
                    color: newSalutation === s ? '#fff' : '#334155',
                    border: newSalutation === s ? '1px solid #667eea' : '1px solid #e2e8f0',
                    fontWeight: 600, fontSize: 14,
                  }}
                >{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="z. B. Müller"
              style={inputStyle}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Personen</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setNewSize(String(Math.max(1, (parseInt(newSize) || 1) - 1)))} style={stepperBtn}>−</button>
                <span style={{ fontSize: 18, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>{newSize}</span>
                <button onClick={() => setNewSize(String((parseInt(newSize) || 1) + 1))} style={stepperBtn}>+</button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Uhrzeit</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} placeholder="14:30" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '10px 12px', background: newToGo ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: newToGo ? '1px solid #86efac' : '1px solid #e2e8f0', cursor: 'pointer' }}>
              <input type="checkbox" checked={newToGo} onChange={e => setNewToGo(e.target.checked)} style={{ width: 20, height: 20 }} /> 🥡 To-Go
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '10px 12px', background: newAccessible ? '#eff6ff' : '#f8fafc', borderRadius: 8, border: newAccessible ? '1px solid #93c5fd' : '1px solid #e2e8f0', cursor: 'pointer' }}>
              <input type="checkbox" checked={newAccessible} onChange={e => setNewAccessible(e.target.checked)} style={{ width: 20, height: 20 }} /> ♿ Barrierefrei
            </label>
          </div>
          <div>
            <label style={labelStyle}>Notiz</label>
            <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Optional" style={inputStyle} />
          </div>
          <button
            onClick={handleAddGroup}
            disabled={!newName.trim()}
            style={{
              padding: '14px 0', background: newName.trim() ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0',
              color: newName.trim() ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: 16, cursor: newName.trim() ? 'pointer' : 'default',
              marginTop: 4,
            }}
          >
            Anlegen
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

// --- Sub-components ---

interface GroupCardProps {
  group: Group
  onTap: () => void
  onLongPress: () => void
  subtitle?: string
  assigned?: boolean
  readOnly?: boolean
}

function GroupCard({ group, onTap, onLongPress, subtitle, assigned, readOnly }: GroupCardProps) {
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = React.useRef(false)

  const startPress = () => {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      onLongPress()
    }, 500)
  }
  const endPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (!didLongPress.current) onTap()
  }
  const cancelPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  return (
    <div
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={cancelPress}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={cancelPress}
      style={{
        padding: '12px 14px',
        background: '#fff',
        borderRadius: 10,
        marginBottom: 8,
        border: assigned ? '1px solid #e2e8f0' : '1px solid #c7d2fe',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        cursor: readOnly ? 'default' : 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transition: 'background 0.1s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>
            {group.salutation || 'Fam'} {group.name}
            {group.accessible && ' ♿'}
            {group.toGo && ' 🥡'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {group.size} Pers.{group.time ? ` · ${group.time}` : ''}
            {group.note ? ` · ${group.note}` : ''}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
          {subtitle}
        </div>
      </div>
    </div>
  )
}

// --- Shared styles ---
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16, boxSizing: 'border-box' }
const stepperBtn: React.CSSProperties = { width: 40, height: 40, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const sheetBtnStyle: React.CSSProperties = { padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }
