import React, { useState, useCallback, useMemo } from 'react'
import { useDeviceType } from '../../utils/useDeviceType'
import type { ChecklistItem, EventChecklistData } from '../../types/event'

interface Props {
  data: EventChecklistData
  onSave: (data: EventChecklistData) => Promise<void>
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: '#fee2e2', text: '#dc2626', label: 'Hoch' },
  medium: { bg: '#fef3c7', text: '#d97706', label: 'Mittel' },
  low: { bg: '#e0e7ff', text: '#4f46e5', label: 'Niedrig' },
}

const HOCHZEIT_TEMPLATE: Omit<ChecklistItem, 'id'>[] = [
  { text: 'Budget festlegen', done: false, priority: 'high', category: 'Planung' },
  { text: 'Gästeliste erstellen', done: false, priority: 'high', category: 'Gäste' },
  { text: 'Location besichtigen & buchen', done: false, priority: 'high', category: 'Location' },
  { text: 'Catering / Menü auswählen', done: false, priority: 'high', category: 'Essen & Trinken' },
  { text: 'DJ / Band buchen', done: false, priority: 'medium', category: 'Unterhaltung' },
  { text: 'Fotograf buchen', done: false, priority: 'medium', category: 'Dienstleister' },
  { text: 'Einladungen versenden', done: false, priority: 'high', category: 'Gäste' },
  { text: 'Tischordnung planen', done: false, priority: 'medium', category: 'Planung' },
  { text: 'Dekoration planen', done: false, priority: 'medium', category: 'Dekoration' },
  { text: 'Brautkleid / Anzug', done: false, priority: 'high', category: 'Outfit' },
  { text: 'Trauringe besorgen', done: false, priority: 'high', category: 'Outfit' },
  { text: 'Blumenschmuck bestellen', done: false, priority: 'medium', category: 'Dekoration' },
  { text: 'Hochzeitstorte bestellen', done: false, priority: 'medium', category: 'Essen & Trinken' },
  { text: 'Standesamt Termin vereinbaren', done: false, priority: 'high', category: 'Planung' },
  { text: 'Trauzeugen bestimmen', done: false, priority: 'medium', category: 'Planung' },
  { text: 'RSVP-Frist setzen', done: false, priority: 'medium', category: 'Gäste' },
  { text: 'Sitzplan finalisieren', done: false, priority: 'low', category: 'Planung' },
  { text: 'Gastgeschenke besorgen', done: false, priority: 'low', category: 'Dekoration' },
  { text: 'Musik-Wunschliste erstellen', done: false, priority: 'low', category: 'Unterhaltung' },
  { text: 'Letzte Details mit Location besprechen', done: false, priority: 'medium', category: 'Location' },
]

const GEBURTSTAG_TEMPLATE: Omit<ChecklistItem, 'id'>[] = [
  { text: 'Motto / Thema festlegen', done: false, priority: 'medium', category: 'Planung' },
  { text: 'Gästeliste erstellen', done: false, priority: 'high', category: 'Gäste' },
  { text: 'Location buchen', done: false, priority: 'high', category: 'Location' },
  { text: 'Einladungen versenden', done: false, priority: 'high', category: 'Gäste' },
  { text: 'Essen & Getränke planen', done: false, priority: 'high', category: 'Essen & Trinken' },
  { text: 'Kuchen / Torte bestellen', done: false, priority: 'medium', category: 'Essen & Trinken' },
  { text: 'Dekoration besorgen', done: false, priority: 'medium', category: 'Dekoration' },
  { text: 'Musik / Unterhaltung planen', done: false, priority: 'low', category: 'Unterhaltung' },
  { text: 'Geschenke-Wunschliste', done: false, priority: 'low', category: 'Planung' },
]

const FIRMEN_TEMPLATE: Omit<ChecklistItem, 'id'>[] = [
  { text: 'Budget genehmigen lassen', done: false, priority: 'high', category: 'Planung' },
  { text: 'Teilnehmerliste erstellen', done: false, priority: 'high', category: 'Gäste' },
  { text: 'Raum / Location buchen', done: false, priority: 'high', category: 'Location' },
  { text: 'Catering bestellen', done: false, priority: 'high', category: 'Essen & Trinken' },
  { text: 'Technik organisieren (Beamer, Mikrofon)', done: false, priority: 'medium', category: 'Technik' },
  { text: 'Programm / Agenda erstellen', done: false, priority: 'medium', category: 'Planung' },
  { text: 'Einladungen versenden', done: false, priority: 'medium', category: 'Gäste' },
  { text: 'Name-Tags / Tischkarten drucken', done: false, priority: 'low', category: 'Dekoration' },
  { text: 'Feedback-Formulare vorbereiten', done: false, priority: 'low', category: 'Planung' },
]

function genId() { return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

export default function EventChecklist({ data, onSave }: Props) {
  const isMobile = useDeviceType() === 'mobile'
  const [list, setList] = useState<ChecklistItem[]>(data.items ?? [])
  const [categories, setCategories] = useState<string[]>(data.categories ?? [])
  const [newText, setNewText] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newCategory, setNewCategory] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'done'>('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [editId, setEditId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateModal, setTemplateModal] = useState<{ label: string; items: Omit<ChecklistItem, 'id'>[] } | null>(null)
  const [selectedTemplateItems, setSelectedTemplateItems] = useState<Set<number>>(new Set())
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const persist = useCallback(async (updated: ChecklistItem[], cats?: string[]) => {
    setList(updated)
    const c = cats ?? categories
    setCategories(c)
    await onSave({ items: updated, categories: c })
  }, [onSave, categories])

  // Derive categories from items
  const allCategories = useMemo(() => {
    const fromItems = new Set(list.map(i => i.category).filter(Boolean) as string[])
    categories.forEach(c => fromItems.add(c))
    return Array.from(fromItems).sort((a, b) => a.localeCompare(b, 'de'))
  }, [list, categories])

  const filtered = useMemo(() => {
    let result = [...list]
    if (filterStatus === 'todo') result = result.filter(i => !i.done)
    if (filterStatus === 'done') result = result.filter(i => i.done)
    if (filterCategory !== 'all') result = result.filter(i => (i.category ?? '') === filterCategory)
    if (filterPriority !== 'all') result = result.filter(i => i.priority === filterPriority)
    // Sort: undone first, then by priority (high > medium > low), then by due date
    const pOrder = { high: 0, medium: 1, low: 2 }
    result.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const pa = pOrder[a.priority ?? 'medium'] ?? 1
      const pb = pOrder[b.priority ?? 'medium'] ?? 1
      if (pa !== pb) return pa - pb
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })
    return result
  }, [list, filterStatus, filterCategory, filterPriority])

  const stats = useMemo(() => {
    const total = list.length
    const done = list.filter(i => i.done).length
    const overdue = list.filter(i => !i.done && i.dueDate && i.dueDate < new Date().toISOString().slice(0, 10)).length
    const highOpen = list.filter(i => !i.done && i.priority === 'high').length
    const progress = total > 0 ? Math.round((done / total) * 100) : 0
    const byCategory: Record<string, { total: number; done: number }> = {}
    list.forEach(i => {
      const cat = i.category || 'Ohne Kategorie'
      if (!byCategory[cat]) byCategory[cat] = { total: 0, done: 0 }
      byCategory[cat].total++
      if (i.done) byCategory[cat].done++
    })
    return { total, done, overdue, highOpen, progress, byCategory }
  }, [list])

  function resetForm() {
    setNewText(''); setNewPriority('medium'); setNewCategory(''); setNewDueDate('')
    setEditId(null); setShowForm(false)
  }

  async function handleSave() {
    if (!newText.trim()) return
    const item: ChecklistItem = {
      id: editId || genId(), text: newText.trim(), done: editId ? (list.find(i => i.id === editId)?.done ?? false) : false,
      priority: newPriority, category: newCategory || undefined, dueDate: newDueDate || undefined,
    }
    const updated = editId ? list.map(i => i.id === editId ? item : i) : [...list, item]
    resetForm()
    await persist(updated)
  }

  function startEdit(item: ChecklistItem) {
    setEditId(item.id); setNewText(item.text); setNewPriority(item.priority ?? 'medium')
    setNewCategory(item.category ?? ''); setNewDueDate(item.dueDate ?? '')
    setShowForm(true)
  }

  async function toggleItem(id: string) { await persist(list.map(i => i.id === id ? { ...i, done: !i.done } : i)) }
  async function deleteItem(id: string) { await persist(list.filter(i => i.id !== id)) }

  async function applyTemplate(template: Omit<ChecklistItem, 'id'>[]) {
    const newItems = template.map(t => ({ ...t, id: genId() }))
    const merged = [...list, ...newItems]
    const newCats = Array.from(new Set(template.map(t => t.category).filter(Boolean) as string[]))
    const mergedCats = Array.from(new Set([...categories, ...newCats]))
    setShowTemplates(false)
    setTemplateModal(null)
    await persist(merged, mergedCats)
  }

  function openTemplateModal(label: string, items: Omit<ChecklistItem, 'id'>[]) {
    setTemplateModal({ label, items })
    setSelectedTemplateItems(new Set(items.map((_, i) => i)))
  }

  function toggleTemplateItem(idx: number) {
    setSelectedTemplateItems(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function toggleAllTemplateItems() {
    if (!templateModal) return
    if (selectedTemplateItems.size === templateModal.items.length) {
      setSelectedTemplateItems(new Set())
    } else {
      setSelectedTemplateItems(new Set(templateModal.items.map((_, i) => i)))
    }
  }

  function applySelectedTemplateItems() {
    if (!templateModal) return
    const selected = templateModal.items.filter((_, i) => selectedTemplateItems.has(i))
    if (selected.length > 0) applyTemplate(selected)
    else setTemplateModal(null)
  }

  const today = new Date().toISOString().slice(0, 10)
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }
  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
    background: active ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f1f5f9', color: active ? 'white' : '#475569',
  })

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>✅ Checkliste</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Aufgaben planen, priorisieren und abhaken</p>
      </div>

      {/* Progress & Stats */}
      {list.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: '#1e293b' }}>Fortschritt</span>
            <span style={{ fontSize: isMobile ? 12 : 13, color: '#64748b' }}>{stats.done} / {stats.total} erledigt ({stats.progress}%)</span>
          </div>
          <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: `${stats.progress}%`, background: stats.progress === 100 ? '#10b981' : 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 5, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#475569' }}>
            {stats.highOpen > 0 && <span style={{ color: '#dc2626' }}>🔴 {stats.highOpen} wichtig offen</span>}
            {stats.overdue > 0 && <span style={{ color: '#dc2626' }}>⚠️ {stats.overdue} überfällig</span>}
            {stats.progress === 100 && <span style={{ color: '#10b981' }}>🎉 Alles erledigt!</span>}
          </div>
          {/* Category progress – desktop only */}
          {!isMobile && Object.keys(stats.byCategory).length > 1 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {Object.entries(stats.byCategory).map(([cat, c]) => (
                <div key={cat} style={{ fontSize: 11, color: '#64748b' }}>
                  <strong>{cat}</strong> {c.done}/{c.total}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >+ Aufgabe</button>
        <button onClick={() => setShowTemplates(!showTemplates)}
          style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}
        >📋 Vorlagen</button>

        <div style={{ flex: 1 }} />

        {isMobile ? (
          <button onClick={() => setShowMobileFilters(!showMobileFilters)}
            style={{ padding: '6px 12px', background: (filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all') ? '#e0e7ff' : '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: (filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all') ? '#4f46e5' : '#475569' }}
          >🔽 Filter{(filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all') ? ' ●' : ''}</button>
        ) : (
          <>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>Filter:</span>
            {(['all', 'todo', 'done'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={pillBtn(filterStatus === s)}>
                {{ all: 'Alle', todo: 'Offen', done: 'Erledigt' }[s]}
              </button>
            ))}
            {(['all', 'high', 'medium', 'low'] as const).map(p => (
              <button key={p} onClick={() => setFilterPriority(p)} style={pillBtn(filterPriority === p)}>
                {{ all: '⬛', high: '🔴', medium: '🟡', low: '🔵' }[p]}
              </button>
            ))}
            {allCategories.length > 0 && (
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', background: 'white' }}>
                <option value="all">Alle Kategorien</option>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </>
        )}
      </div>

      {/* Mobile filters (collapsible) */}
      {isMobile && showMobileFilters && (
        <div style={{ ...cardStyle, marginBottom: 16, padding: '12px 14px' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Status</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'todo', 'done'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} style={pillBtn(filterStatus === s)}>
                  {{ all: 'Alle', todo: 'Offen', done: 'Erledigt' }[s]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: allCategories.length > 0 ? 10 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Priorität</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'high', 'medium', 'low'] as const).map(p => (
                <button key={p} onClick={() => setFilterPriority(p)} style={pillBtn(filterPriority === p)}>
                  {{ all: 'Alle', high: '🔴 Hoch', medium: '🟡 Mittel', low: '🔵 Niedrig' }[p]}
                </button>
              ))}
            </div>
          </div>
          {allCategories.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Kategorie</div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', background: 'white', width: '100%' }}>
                <option value="all">Alle Kategorien</option>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Templates */}
      {showTemplates && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>📋 Checklisten-Vorlagen</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>Wähle eine Vorlage, um die enthaltenen Aufgaben auszuwählen.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: '💍 Hochzeit', items: HOCHZEIT_TEMPLATE, count: HOCHZEIT_TEMPLATE.length },
              { label: '🎂 Geburtstag', items: GEBURTSTAG_TEMPLATE, count: GEBURTSTAG_TEMPLATE.length },
              { label: '💼 Firmenfeier', items: FIRMEN_TEMPLATE, count: FIRMEN_TEMPLATE.length },
            ].map(t => (
              <button key={t.label} onClick={() => openTemplateModal(t.label, t.items)}
                style={{ padding: '10px 18px', background: 'white', border: '2px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1e293b', transition: 'all 0.15s', textAlign: 'left' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#667eea'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <div>{t.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginTop: 2 }}>{t.count} Aufgaben</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {templateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setTemplateModal(null) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 28px', maxWidth: 520, width: '100%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{templateModal.label}</h3>
              <button onClick={() => setTemplateModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>{selectedTemplateItems.size} von {templateModal.items.length} ausgewählt</span>
              <button onClick={toggleAllTemplateItems}
                style={{ padding: '4px 12px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                {selectedTemplateItems.size === templateModal.items.length ? 'Alle abwählen' : 'Alle auswählen'}
              </button>
            </div>

            {(() => {
              const grouped: Record<string, { item: Omit<ChecklistItem, 'id'>; idx: number }[]> = {}
              templateModal.items.forEach((item, idx) => {
                const cat = item.category || 'Sonstiges'
                if (!grouped[cat]) grouped[cat] = []
                grouped[cat].push({ item, idx })
              })
              return Object.entries(grouped).map(([cat, entries]) => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#667eea', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat}</div>
                  {entries.map(({ item, idx }) => {
                    const checked = selectedTemplateItems.has(idx)
                    const pc = PRIORITY_COLORS[item.priority ?? 'medium']
                    return (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s', background: checked ? '#f8fafc' : 'transparent' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseOut={e => e.currentTarget.style.background = checked ? '#f8fafc' : 'transparent'}>
                        <input type="checkbox" checked={checked} onChange={() => toggleTemplateItem(idx)}
                          style={{ width: 16, height: 16, accentColor: '#667eea', cursor: 'pointer', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#1e293b', flex: 1 }}>{item.text}</span>
                        {item.priority && item.priority !== 'medium' && (
                          <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600, background: pc.bg, color: pc.text }}>{pc.label}</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              ))
            })()}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <button onClick={() => setTemplateModal(null)}
                style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', flex: 1 }}>
                Abbrechen
              </button>
              <button onClick={applySelectedTemplateItems} disabled={selectedTemplateItems.size === 0}
                style={{ padding: '10px 18px', background: selectedTemplateItems.size > 0 ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0', color: selectedTemplateItems.size > 0 ? 'white' : '#94a3b8', border: 'none', borderRadius: 8, cursor: selectedTemplateItems.size > 0 ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, flex: 1 }}>
                {selectedTemplateItems.size > 0 ? `${selectedTemplateItems.size} Aufgaben hinzufügen` : 'Auswahl treffen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{editId ? '✏️ Aufgabe bearbeiten' : '+ Neue Aufgabe'}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={labelStyle}>Aufgabe *</label>
              <input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Was muss erledigt werden?"
                autoFocus style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleSave()} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: isMobile ? '1 1 100%' : '1 1 120px' }}>
                <label style={labelStyle}>Priorität</label>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)} style={{ ...inputStyle, appearance: 'auto' }}>
                  <option value="high">🔴 Hoch</option>
                  <option value="medium">🟡 Mittel</option>
                  <option value="low">🔵 Niedrig</option>
                </select>
              </div>
              <div style={{ flex: isMobile ? '1 1 100%' : '1 1 140px' }}>
                <label style={labelStyle}>Kategorie</label>
                <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  placeholder="z.B. Dekoration" style={inputStyle} list="checklist-cats" />
                <datalist id="checklist-cats">{allCategories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div style={{ flex: isMobile ? '1 1 100%' : '0 1 160px' }}>
                <label style={labelStyle}>Fällig bis</label>
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={resetForm}
              style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}
            >Abbrechen</button>
            <button onClick={handleSave} disabled={!newText.trim()}
              style={{ padding: '8px 16px', background: newText.trim() ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0', color: newText.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: 8, cursor: newText.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600 }}
            >{editId ? '✓ Aktualisieren' : '✓ Hinzufügen'}</button>
          </div>
        </div>
      )}

      {/* Task list */}
      {list.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', ...cardStyle }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
          <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 8px' }}>Noch keine Aufgaben</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.5 }}>
            Füge Aufgaben manuell hinzu oder nutze eine Vorlage für typische Eventplanungs-Aufgaben.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => setShowForm(true)}
              style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >+ Aufgabe hinzufügen</button>
            <button onClick={() => setShowTemplates(true)}
              style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}
            >📋 Vorlage nutzen</button>
          </div>
        </div>
      ) : filtered.length === 0 && list.length > 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', ...cardStyle }}>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>🔍 Keine Aufgaben für diesen Filter</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {filtered.map(item => {
            const isOverdue = !item.done && item.dueDate && item.dueDate < today
            const pc = PRIORITY_COLORS[item.priority ?? 'medium']
            return (
              <div key={item.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'white', borderRadius: 10, border: `1px solid ${isOverdue ? '#fca5a5' : '#e2e8f0'}`, transition: 'all 0.15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#667eea'}
                onMouseOut={e => e.currentTarget.style.borderColor = isOverdue ? '#fca5a5' : '#e2e8f0'}
              >
                <button onClick={() => toggleItem(item.id)}
                  style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: item.done ? '2px solid #10b981' : '2px solid #cbd5e1', background: item.done ? '#10b981' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {item.done && <span style={{ color: 'white', fontSize: 14, lineHeight: 1 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: item.done ? '#94a3b8' : '#1e293b', textDecoration: item.done ? 'line-through' : 'none', transition: 'all 0.2s' }}>{item.text}</span>
                    {item.priority && item.priority !== 'medium' && (
                      <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600, background: pc.bg, color: pc.text }}>{pc.label}</span>
                    )}
                    {item.category && (
                      <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600, background: '#e0e7ff', color: '#4338ca' }}>{item.category}</span>
                    )}
                  </div>
                  {item.dueDate && (
                    <div style={{ fontSize: 11, color: isOverdue ? '#dc2626' : '#94a3b8', marginTop: 2 }}>
                      {isOverdue ? '⚠️ ' : '📅 '}{new Date(item.dueDate + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                    </div>
                  )}
                </div>
                <button onClick={() => startEdit(item)} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 13, padding: 4, flexShrink: 0 }}>✏️</button>
                <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
