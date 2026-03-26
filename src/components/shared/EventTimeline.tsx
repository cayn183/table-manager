import React, { useState, useCallback, useMemo } from 'react'
import type { TimelineEntry, EventTimelineData } from '../../types/event'

interface Props {
  data: EventTimelineData
  eventDate?: string
  timeFrom?: string
  timeTo?: string
  onSave: (data: EventTimelineData) => Promise<void>
}

const ICONS = ['🎉', '🍽️', '🎵', '💍', '📸', '🎤', '🥂', '🎂', '💃', '🚗', '⛪', '🏛️', '🎁', '🎯', '📋', '☕']

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, outline: 'none', boxSizing: 'border-box', marginTop: 4,
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569' }

function genId() { return `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function durationStr(from: string, to: string): string {
  const [h1, m1] = from.split(':').map(Number)
  const [h2, m2] = to.split(':').map(Number)
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (diff < 0) diff += 24 * 60
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

export default function EventTimeline({ data, eventDate, timeFrom, timeTo, onSave }: Props) {
  const [list, setList] = useState<TimelineEntry[]>([...(data.entries ?? [])].sort((a, b) => a.time.localeCompare(b.time)))
  const [timelineTitle, setTimelineTitle] = useState(data.title ?? '')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [time, setTime] = useState(timeFrom || '')
  const [endTime, setEndTime] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [responsible, setResponsible] = useState('')
  const [icon, setIcon] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [editTitle, setEditTitle] = useState(false)

  function resetForm() {
    setTime(timeFrom || ''); setEndTime(''); setTitle(''); setDescription('')
    setLocation(''); setResponsible(''); setIcon('')
    setEditId(null); setShowForm(false)
  }

  const persist = useCallback(async (updated: TimelineEntry[], newTitle?: string) => {
    const sorted = [...updated].sort((a, b) => a.time.localeCompare(b.time))
    setList(sorted)
    const t = newTitle ?? timelineTitle
    await onSave({ entries: sorted, title: t || undefined })
  }, [onSave, timelineTitle])

  async function handleSaveEntry() {
    if (!time || !title.trim()) return
    const entry: TimelineEntry = {
      id: editId || genId(), time, endTime: endTime || undefined,
      title: title.trim(), description: description.trim() || undefined,
      location: location.trim() || undefined, responsible: responsible.trim() || undefined,
      icon: icon || undefined,
    }
    const updated = editId ? list.map(e => e.id === editId ? entry : e) : [...list, entry]
    resetForm()
    await persist(updated)
  }

  function startEdit(entry: TimelineEntry) {
    setEditId(entry.id); setTime(entry.time); setEndTime(entry.endTime || '')
    setTitle(entry.title); setDescription(entry.description || '')
    setLocation(entry.location || ''); setResponsible(entry.responsible || '')
    setIcon(entry.icon || ''); setShowForm(true); setPreviewMode(false)
  }

  async function deleteEntry(id: string) { await persist(list.filter(e => e.id !== id)) }

  async function saveTitle() {
    setEditTitle(false)
    await persist(list, timelineTitle)
  }

  const totalDuration = useMemo(() => {
    if (list.length === 0) return null
    const first = list[0].time
    const lastEntry = list[list.length - 1]
    const last = lastEntry.endTime || lastEntry.time
    return durationStr(first, last)
  }, [list])

  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }

  // Preview mode
  if (previewMode && list.length > 0) {
    return (
      <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
            {timelineTitle || '⏱️ Ablaufplan'}
          </h2>
          {eventDate && (
            <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
              {new Date(eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              {timeFrom && timeTo && ` · ${timeFrom} – ${timeTo} Uhr`}
            </p>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 78, top: 0, bottom: 0, width: 3, background: 'linear-gradient(to bottom, #667eea, #764ba2)', borderRadius: 2 }} />
          {list.map((entry, idx) => (
            <div key={entry.id} style={{ display: 'flex', gap: 16, position: 'relative', marginBottom: idx < list.length - 1 ? 4 : 0 }}>
              <div style={{ width: 64, textAlign: 'right', paddingTop: 16, flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#667eea' }}>{entry.time}</div>
                {entry.endTime && <div style={{ fontSize: 11, color: '#94a3b8' }}>– {entry.endTime}</div>}
              </div>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12, flexShrink: 0, zIndex: 1, boxShadow: '0 2px 6px rgba(102,126,234,0.3)' }}>
                <span style={{ fontSize: 13, lineHeight: 1 }}>{entry.icon || '•'}</span>
              </div>
              <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0', marginBottom: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{entry.title}</div>
                {entry.description && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{entry.description}</div>}
                <div style={{ display: 'flex', gap: 12, marginTop: entry.location || entry.responsible || entry.endTime ? 6 : 0, flexWrap: 'wrap' }}>
                  {entry.location && <span style={{ fontSize: 11, color: '#94a3b8' }}>📍 {entry.location}</span>}
                  {entry.responsible && <span style={{ fontSize: 11, color: '#94a3b8' }}>👤 {entry.responsible}</span>}
                  {entry.endTime && <span style={{ fontSize: 11, color: '#94a3b8' }}>⏱️ {durationStr(entry.time, entry.endTime)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalDuration && (
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
            Gesamtdauer: ca. {totalDuration}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={() => setPreviewMode(false)}
            style={{ padding: '8px 20px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
            ← Zurück zum Bearbeiten
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          {editTitle ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="text" value={timelineTitle} onChange={e => setTimelineTitle(e.target.value)}
                placeholder="Ablaufplan-Titel" style={{ ...inputStyle, marginTop: 0, width: 200 }}
                autoFocus onKeyDown={e => e.key === 'Enter' && saveTitle()} />
              <button onClick={saveTitle} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '6px 10px', fontSize: 12 }}>✓</button>
            </div>
          ) : (
            <h3 onClick={() => setEditTitle(true)} style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
              ⏱️ {timelineTitle || 'Ablaufplan'}
            </h3>
          )}
          {eventDate && (
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              {new Date(eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              {timeFrom && timeTo && ` · ${timeFrom} – ${timeTo} Uhr`}
            </p>
          )}
        </div>
        {list.length > 0 && (
          <button onClick={() => setPreviewMode(true)}
            style={{ padding: '6px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
            👁️ Vorschau
          </button>
        )}
      </div>

      {/* Stats bar */}
      {list.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 12, color: '#64748b' }}>
          <span>📋 {list.length} Programmpunkte</span>
          {totalDuration && <span>⏱️ Gesamtdauer: ca. {totalDuration}</span>}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >+ Programmpunkt</button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
            {editId ? '✏️ Programmpunkt bearbeiten' : '+ Neuer Programmpunkt'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Von *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Bis</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Titel *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="z.B. Empfang" autoFocus />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label style={labelStyle}>Ort</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} placeholder="z.B. Festsaal" />
            </div>
            <div>
              <label style={labelStyle}>Verantwortlich</label>
              <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)} style={inputStyle} placeholder="z.B. DJ Marco" />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Beschreibung</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} placeholder="Optional" />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Icon</label>
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setIcon('')}
                style={{ width: 32, height: 32, borderRadius: 6, border: !icon ? '2px solid #667eea' : '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12 }}>–</button>
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)}
                  style={{ width: 32, height: 32, borderRadius: 6, border: icon === ic ? '2px solid #667eea' : '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={resetForm}
              style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}>
              Abbrechen
            </button>
            <button onClick={handleSaveEntry} disabled={!time || !title.trim()}
              style={{ padding: '8px 16px', background: time && title.trim() ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0', color: time && title.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: 8, cursor: time && title.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600 }}>
              {editId ? '✓ Aktualisieren' : '✓ Hinzufügen'}
            </button>
          </div>
        </div>
      )}

      {/* Timeline visualization */}
      {list.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', ...cardStyle }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>⏱️</div>
          <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 8px' }}>Noch keine Programmpunkte</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px' }}>Plane den zeitlichen Ablauf deines Events Schritt für Schritt.</p>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >+ Ersten Programmpunkt hinzufügen</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {list.length > 0 && (
            <div style={{ position: 'absolute', left: 30, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, #667eea, #764ba2)', borderRadius: 1 }} />
          )}
          {list.map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
              <div style={{ width: 48, textAlign: 'right', paddingTop: 14, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#667eea' }}>{entry.time}</span>
                {entry.endTime && <div style={{ fontSize: 10, color: '#94a3b8' }}>– {entry.endTime}</div>}
              </div>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 14, flexShrink: 0, zIndex: 1, boxShadow: '0 1px 4px rgba(102,126,234,0.3)' }}>
                <span style={{ fontSize: 11, lineHeight: 1 }}>{entry.icon || '•'}</span>
              </div>
              <div style={{ flex: 1, background: 'white', borderRadius: 10, padding: '12px 16px', border: '1px solid #e2e8f0', marginBottom: 6, transition: 'all 0.15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#667eea'} onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{entry.title}</span>
                      {entry.endTime && (
                        <span style={{ fontSize: 10, padding: '1px 6px', background: '#f1f5f9', borderRadius: 6, color: '#94a3b8' }}>
                          {durationStr(entry.time, entry.endTime)}
                        </span>
                      )}
                    </div>
                    {entry.description && <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>{entry.description}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: entry.location || entry.responsible ? 4 : 0, flexWrap: 'wrap' }}>
                      {entry.location && <span style={{ fontSize: 11, color: '#94a3b8' }}>📍 {entry.location}</span>}
                      {entry.responsible && <span style={{ fontSize: 11, color: '#94a3b8' }}>👤 {entry.responsible}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => startEdit(entry)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667eea', fontSize: 13, padding: 4 }}>✏️</button>
                    <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13, padding: 4 }}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
