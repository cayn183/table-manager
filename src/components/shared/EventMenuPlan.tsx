import React, { useState, useEffect } from 'react'
import type { MenuCourse, MenuChoice, EventMenuData } from '../../types/event'

interface Props {
  data: EventMenuData
  onSave: (data: EventMenuData) => Promise<void>
}

const DIETARY_TAGS = ['vegetarisch', 'vegan', 'glutenfrei', 'laktosefrei', 'nussfrei']

const COURSE_PRESETS = ['Vorspeise', 'Suppe', 'Zwischengang', 'Hauptgang', 'Dessert', 'Getränke']

function genId() { return `mc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

export default function EventMenuPlan({ data, onSave }: Props) {
  const [menuTitle, setMenuTitle] = useState(data.title ?? '')
  const [notes, setNotes] = useState(data.notes ?? '')
  const [courses, setCourses] = useState<MenuCourse[]>(data.courses ?? [])
  const [editingChoiceId, setEditingChoiceId] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  // Sync on data change
  useEffect(() => {
    setMenuTitle(data.title ?? '')
    setNotes(data.notes ?? '')
    setCourses(data.courses ?? [])
  }, [data])

  async function persist(newCourses: MenuCourse[], title?: string, n?: string) {
    const updated: EventMenuData = {
      title: title ?? menuTitle,
      courses: newCourses,
      notes: n ?? notes,
    }
    await onSave(updated)
  }

  function addCourse(name?: string) {
    const c: MenuCourse = {
      id: genId(),
      name: name || 'Neuer Gang',
      sortOrder: courses.length,
      choices: [],
    }
    const next = [...courses, c]
    setCourses(next)
    persist(next)
  }

  function removeCourse(id: string) {
    const next = courses.filter(c => c.id !== id)
    setCourses(next)
    persist(next)
  }

  function updateCourseName(id: string, name: string) {
    const next = courses.map(c => c.id === id ? { ...c, name } : c)
    setCourses(next)
    persist(next)
  }

  function moveCourse(idx: number, dir: -1 | 1) {
    if (idx + dir < 0 || idx + dir >= courses.length) return
    const next = [...courses]
    const tmp = next[idx]
    next[idx] = next[idx + dir]
    next[idx + dir] = tmp
    next.forEach((c, i) => c.sortOrder = i)
    setCourses(next)
    persist(next)
  }

  function addChoice(courseId: string) {
    const choice: MenuChoice = { id: genId(), name: '', tags: [] }
    const next = courses.map(c =>
      c.id === courseId ? { ...c, choices: [...c.choices, choice] } : c
    )
    setCourses(next)
    setEditingChoiceId(choice.id)
    persist(next)
  }

  function updateChoice(courseId: string, choiceId: string, updates: Partial<MenuChoice>) {
    const next = courses.map(c =>
      c.id === courseId
        ? { ...c, choices: c.choices.map(ch => ch.id === choiceId ? { ...ch, ...updates } : ch) }
        : c
    )
    setCourses(next)
    persist(next)
  }

  function removeChoice(courseId: string, choiceId: string) {
    const next = courses.map(c =>
      c.id === courseId ? { ...c, choices: c.choices.filter(ch => ch.id !== choiceId) } : c
    )
    setCourses(next)
    persist(next)
  }

  function toggleTag(courseId: string, choiceId: string, tag: string) {
    const course = courses.find(c => c.id === courseId)
    const choice = course?.choices.find(ch => ch.id === choiceId)
    if (!choice) return
    const tags = choice.tags ?? []
    const newTags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
    updateChoice(courseId, choiceId, { tags: newTags })
  }

  function handleTitleBlur() { persist(courses, menuTitle) }
  function handleNotesBlur() { persist(courses, undefined, notes) }

  // ── Preview mode ──
  if (preview) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <button onClick={() => setPreview(false)}
          style={{ marginBottom: 20, padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}
        >← Zurück zur Bearbeitung</button>

        <div style={{ background: 'white', borderRadius: 16, padding: '40px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          {menuTitle && <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#1e293b', fontFamily: 'Georgia, serif' }}>{menuTitle}</h2>}
          <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg, #667eea, #764ba2)', margin: '16px auto 24px', borderRadius: 2 }} />

          {courses.sort((a, b) => a.sortOrder - b.sortOrder).map((course, i) => (
            <div key={course.id} style={{ marginBottom: i < courses.length - 1 ? 28 : 0 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#667eea', textTransform: 'uppercase', letterSpacing: 1.5 }}>{course.name}</h3>
              {course.choices.map(choice => (
                <div key={choice.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{choice.name || '—'}</span>
                  </div>
                  {choice.description && <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>{choice.description}</div>}
                  {choice.tags && choice.tags.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                      {choice.tags.map(t => (
                        <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', fontWeight: 500 }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {course.choices.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Noch keine Gerichte</div>}
            </div>
          ))}

          {notes && (
            <>
              <div style={{ width: 40, height: 1, background: '#e2e8f0', margin: '24px auto 16px' }} />
              <p style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', margin: 0 }}>{notes}</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Edit mode ──
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>🍽️ Menüplanung</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Gestalte dein Menü mit Gängen und Auswahl</p>
        </div>
        <button onClick={() => setPreview(true)}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >👁️ Vorschau</button>
      </div>

      {/* Menu title & notes */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Menütitel</label>
          <input type="text" value={menuTitle} onChange={e => setMenuTitle(e.target.value)} onBlur={handleTitleBlur}
            placeholder="z.B. Hochzeitsmenü"
            style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#667eea'} />
        </div>
        <div style={{ flex: 3 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Hinweis</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNotesBlur}
            placeholder="z.B. Bitte Allergien bei der Einladung angeben"
            style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#667eea'} />
        </div>
      </div>

      {/* Courses */}
      {courses.sort((a, b) => a.sortOrder - b.sortOrder).map((course, i) => (
        <div key={course.id} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {/* Course header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => moveCourse(i, -1)} disabled={i === 0}
                style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', fontSize: 10, opacity: i === 0 ? 0.3 : 1, padding: 0, lineHeight: 1 }}>▲</button>
              <button onClick={() => moveCourse(i, 1)} disabled={i === courses.length - 1}
                style={{ background: 'none', border: 'none', cursor: i === courses.length - 1 ? 'default' : 'pointer', fontSize: 10, opacity: i === courses.length - 1 ? 0.3 : 1, padding: 0, lineHeight: 1 }}>▼</button>
            </div>
            <input type="text" value={course.name}
              onChange={e => updateCourseName(course.id, e.target.value)}
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 15, fontWeight: 700, color: '#1e293b', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#667eea'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            <button onClick={() => removeCourse(course.id)}
              style={{ background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#dc2626', padding: '4px 10px', fontWeight: 500 }}
            >✕</button>
          </div>

          {/* Choices */}
          {course.choices.map(choice => (
            <div key={choice.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', marginBottom: 6, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" value={choice.name} placeholder="Gerichtname"
                  onChange={e => updateChoice(course.id, choice.id, { name: e.target.value })}
                  autoFocus={editingChoiceId === choice.id}
                  onFocus={() => setEditingChoiceId(null)}
                  style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontWeight: 600, outline: 'none', background: 'white' }} />
                <button onClick={() => removeChoice(course.id, choice.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94a3b8', padding: '2px 4px' }}>✕</button>
              </div>
              <input type="text" value={choice.description ?? ''} placeholder="Beschreibung (optional)"
                onChange={e => updateChoice(course.id, choice.id, { description: e.target.value })}
                style={{ padding: '4px 10px', border: '1px solid #f1f5f9', borderRadius: 6, fontSize: 12, color: '#475569', outline: 'none', background: 'white' }} />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {DIETARY_TAGS.map(tag => {
                  const active = choice.tags?.includes(tag)
                  return (
                    <button key={tag} onClick={() => toggleTag(course.id, choice.id, tag)}
                      style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                        border: active ? '1px solid #16a34a' : '1px solid #e2e8f0',
                        background: active ? '#f0fdf4' : 'white',
                        color: active ? '#16a34a' : '#94a3b8',
                      }}
                    >{tag}</button>
                  )
                })}
              </div>
            </div>
          ))}

          <button onClick={() => addChoice(course.id)}
            style={{ padding: '6px 14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 500, width: '100%', marginTop: 4 }}
          >+ Gericht hinzufügen</button>
        </div>
      ))}

      {/* Add course */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button onClick={() => addCourse()}
          style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >+ Gang hinzufügen</button>
        <div style={{ width: 1, background: '#e2e8f0' }} />
        {COURSE_PRESETS.filter(p => !courses.some(c => c.name === p)).map(preset => (
          <button key={preset} onClick={() => addCourse(preset)}
            style={{ padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#475569', fontWeight: 500 }}
          >{preset}</button>
        ))}
      </div>

      {/* Summary */}
      {courses.length > 0 && (() => {
        const totalChoices = courses.reduce((s, c) => s + c.choices.length, 0)
        const allTags = new Set(courses.flatMap(c => c.choices.flatMap(ch => ch.tags ?? [])))
        return (
          <div style={{ marginTop: 20, padding: '14px 18px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
            <div style={{ fontSize: 13, color: '#0369a1', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>📊 {courses.length} {courses.length === 1 ? 'Gang' : 'Gänge'} · {totalChoices} Gerichte</span>
            </div>
            {allTags.size > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {Array.from(allTags).map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', fontWeight: 500 }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
