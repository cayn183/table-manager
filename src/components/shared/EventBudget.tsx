import React, { useState, useCallback, useMemo } from 'react'
import type { BudgetItem, EventBudgetData } from '../../types/event'

interface Props {
  data: EventBudgetData
  onSave: (data: EventBudgetData) => Promise<void>
}

const CATEGORIES = ['Location', 'Essen & Trinken', 'Dekoration', 'Musik & Unterhaltung', 'Personal', 'Transport', 'Einladungen', 'Sonstiges']

const CAT_COLORS: Record<string, string> = {
  'Location': '#667eea', 'Essen & Trinken': '#f59e0b', 'Dekoration': '#ec4899', 'Musik & Unterhaltung': '#8b5cf6',
  'Personal': '#06b6d4', 'Transport': '#10b981', 'Einladungen': '#f97316', 'Sonstiges': '#94a3b8',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, outline: 'none', boxSizing: 'border-box', marginTop: 4,
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569' }

function genId() { return `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

export default function EventBudget({ data, onSave }: Props) {
  const currency = data.currency || 'EUR'
  const [list, setList] = useState<BudgetItem[]>(data.items ?? [])
  const [totalBudget, setTotalBudget] = useState<number>(data.totalBudget ?? 0)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [estimated, setEstimated] = useState('')
  const [actual, setActual] = useState('')
  const [paid, setPaid] = useState(false)
  const [note, setNote] = useState('')
  const [vendor, setVendor] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [editBudget, setEditBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const fmt = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency })

  const persist = useCallback(async (updated: BudgetItem[], budget?: number) => {
    setList(updated)
    const tb = budget ?? totalBudget
    if (budget !== undefined) setTotalBudget(tb)
    await onSave({ items: updated, currency, totalBudget: tb || undefined })
  }, [onSave, currency, totalBudget])

  const stats = useMemo(() => {
    const totalEstimated = list.reduce((s, i) => s + i.estimated, 0)
    const totalActual = list.reduce((s, i) => s + (i.actual ?? 0), 0)
    const totalPaid = list.filter(i => i.paid).reduce((s, i) => s + (i.actual ?? i.estimated), 0)
    const diff = totalEstimated - totalActual
    const remaining = totalBudget > 0 ? totalBudget - totalEstimated : 0
    const usedPercent = totalBudget > 0 ? Math.min(100, Math.round((totalEstimated / totalBudget) * 100)) : 0
    // By category
    const byCat: Record<string, { estimated: number; actual: number; count: number }> = {}
    list.forEach(i => {
      if (!byCat[i.category]) byCat[i.category] = { estimated: 0, actual: 0, count: 0 }
      byCat[i.category].estimated += i.estimated
      byCat[i.category].actual += i.actual ?? 0
      byCat[i.category].count++
    })
    return { totalEstimated, totalActual, totalPaid, diff, remaining, usedPercent, byCat }
  }, [list, totalBudget])

  const filtered = useMemo(() => {
    let result = [...list]
    if (filterCategory !== 'all') result = result.filter(i => i.category === filterCategory)
    if (filterPaid === 'paid') result = result.filter(i => i.paid)
    if (filterPaid === 'unpaid') result = result.filter(i => !i.paid)
    return result
  }, [list, filterCategory, filterPaid])

  function resetForm() {
    setName(''); setCategory(CATEGORIES[0]); setEstimated(''); setActual(''); setPaid(false); setNote(''); setVendor('')
    setEditId(null); setShowForm(false)
  }

  async function handleSaveItem() {
    if (!name.trim() || !estimated) return
    const item: BudgetItem = {
      id: editId || genId(), name: name.trim(), category,
      estimated: parseFloat(estimated) || 0, actual: actual ? parseFloat(actual) : undefined,
      paid, note: note.trim() || undefined, vendor: vendor.trim() || undefined,
    }
    const updated = editId ? list.map(i => i.id === editId ? item : i) : [...list, item]
    resetForm()
    await persist(updated)
  }

  function startEdit(item: BudgetItem) {
    setEditId(item.id); setName(item.name); setCategory(item.category)
    setEstimated(String(item.estimated)); setActual(item.actual != null ? String(item.actual) : '')
    setPaid(item.paid ?? false); setNote(item.note || ''); setVendor(item.vendor || ''); setShowForm(true)
  }

  async function deleteItem(id: string) { await persist(list.filter(i => i.id !== id)) }

  async function togglePaid(id: string) {
    await persist(list.map(i => i.id === id ? { ...i, paid: !i.paid } : i))
  }

  async function saveBudget() {
    const val = parseFloat(budgetInput) || 0
    setEditBudget(false)
    await persist(list, val)
  }

  const usedCategories = useMemo(() => Array.from(new Set(list.map(i => i.category))).sort(), [list])
  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
    background: active ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f1f5f9', color: active ? 'white' : '#475569', transition: 'all 0.15s',
  })

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>💰 Budgetplanung</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Kosten planen, verfolgen und im Blick behalten</p>
      </div>

      {/* Total Budget Bar */}
      {totalBudget > 0 && !editBudget && (
        <div style={{ ...cardStyle, marginBottom: 12, cursor: 'pointer' }} onClick={() => { setBudgetInput(String(totalBudget)); setEditBudget(true) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Gesamtbudget</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: stats.remaining >= 0 ? '#1e293b' : '#dc2626' }}>
              {fmt(totalBudget)}
            </span>
          </div>
          <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${stats.usedPercent}%`, background: stats.usedPercent > 90 ? '#dc2626' : stats.usedPercent > 70 ? '#f59e0b' : 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 5, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
            <span>{stats.usedPercent}% verplant ({fmt(stats.totalEstimated)})</span>
            <span style={{ color: stats.remaining >= 0 ? '#16a34a' : '#dc2626' }}>
              {stats.remaining >= 0 ? `${fmt(stats.remaining)} frei` : `${fmt(Math.abs(stats.remaining))} über Budget`}
            </span>
          </div>
        </div>
      )}

      {/* Edit budget or set budget */}
      {(editBudget || totalBudget === 0) && (
        <div style={{ ...cardStyle, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Gesamtbudget (€)</label>
            <input type="number" min="0" step="100" value={editBudget ? budgetInput : ''} placeholder="z.B. 5000"
              onChange={e => { setBudgetInput(e.target.value); if (!editBudget) setEditBudget(true) }}
              style={inputStyle} onKeyDown={e => e.key === 'Enter' && saveBudget()} />
          </div>
          {editBudget && (
            <button onClick={saveBudget}
              style={{ padding: '10px 16px', marginTop: 4, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              ✓
            </button>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Geplant</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{fmt(stats.totalEstimated)}</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tatsächlich</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{fmt(stats.totalActual)}</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center', borderColor: stats.diff >= 0 ? '#bbf7d0' : '#fecaca' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Differenz</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: stats.diff >= 0 ? '#16a34a' : '#dc2626' }}>
            {stats.diff >= 0 ? '+' : ''}{fmt(stats.diff)}
          </div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Bezahlt</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{fmt(stats.totalPaid)}</div>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(stats.byCat).length > 1 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>Aufschlüsselung nach Kategorie</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(stats.byCat).sort(([, a], [, b]) => b.estimated - a.estimated).map(([cat, c]) => {
              const pct = stats.totalEstimated > 0 ? Math.round((c.estimated / stats.totalEstimated) * 100) : 0
              const color = CAT_COLORS[cat] || '#94a3b8'
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: '#475569' }}>{cat} ({c.count})</span>
                    <span style={{ color: '#64748b' }}>{fmt(c.estimated)} — {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >+ Neue Position</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>Filter:</span>
        {(['all', 'paid', 'unpaid'] as const).map(p => (
          <button key={p} onClick={() => setFilterPaid(p)} style={pillBtn(filterPaid === p)}>
            {{ all: 'Alle', paid: '✓ Bezahlt', unpaid: '○ Offen' }[p]}
          </button>
        ))}
        {usedCategories.length > 1 && (
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', background: 'white' }}>
            <option value="all">Alle Kategorien</option>
            {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{editId ? '✏️ Position bearbeiten' : '+ Neue Position'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Bezeichnung *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="z.B. Catering" autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Kategorie</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Geplant (€) *</label>
              <input type="number" min="0" step="0.01" value={estimated} onChange={e => setEstimated(e.target.value)} style={inputStyle} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>Tatsächlich (€)</label>
              <input type="number" min="0" step="0.01" value={actual} onChange={e => setActual(e.target.value)} style={inputStyle} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>Dienstleister / Anbieter</label>
              <input value={vendor} onChange={e => setVendor(e.target.value)} style={inputStyle} placeholder="z.B. Gasthaus Müller" />
            </div>
            <div>
              <label style={labelStyle}>Notiz</label>
              <input value={note} onChange={e => setNote(e.target.value)} style={inputStyle} placeholder="Optional" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#475569' }}>
              <input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} /> Bezahlt
            </label>
            <div style={{ flex: 1 }} />
            <button onClick={resetForm}
              style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}
            >Abbrechen</button>
            <button onClick={handleSaveItem} disabled={!name.trim() || !estimated}
              style={{ padding: '8px 16px', background: name.trim() && estimated ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0', color: name.trim() && estimated ? 'white' : '#94a3b8', border: 'none', borderRadius: 8, cursor: name.trim() && estimated ? 'pointer' : 'default', fontSize: 13, fontWeight: 600 }}
            >{editId ? '✓ Aktualisieren' : '✓ Hinzufügen'}</button>
          </div>
        </div>
      )}

      {/* Item list */}
      {list.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', ...cardStyle }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>💰</div>
          <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 8px' }}>Noch keine Budgetpositionen</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px' }}>Plane deine Ausgaben und behalte den Überblick über dein Eventbudget.</p>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >+ Erste Position hinzufügen</button>
        </div>
      ) : filtered.length === 0 && list.length > 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', ...cardStyle }}>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>🔍 Keine Positionen für diesen Filter</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(item => {
            const catColor = CAT_COLORS[item.category] || '#94a3b8'
            const overBudget = item.actual != null && item.actual > item.estimated
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', borderLeft: `4px solid ${catColor}`, transition: 'all 0.15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#667eea'} onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.borderLeftColor = catColor }}>
                <button onClick={() => togglePaid(item.id)} title={item.paid ? 'Als offen markieren' : 'Als bezahlt markieren'}
                  style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: item.paid ? '2px solid #10b981' : '2px solid #cbd5e1', background: item.paid ? '#10b981' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {item.paid && <span style={{ color: 'white', fontSize: 12, lineHeight: 1 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.name}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', background: '#f1f5f9', borderRadius: 6, color: '#64748b' }}>{item.category}</span>
                    {item.paid && <span style={{ fontSize: 10, padding: '1px 6px', background: '#dcfce7', borderRadius: 6, color: '#16a34a' }}>Bezahlt</span>}
                    {overBudget && <span style={{ fontSize: 10, padding: '1px 6px', background: '#fee2e2', borderRadius: 6, color: '#dc2626' }}>Über Plan</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#94a3b8', marginTop: 3, flexWrap: 'wrap' }}>
                    {item.vendor && <span>🏢 {item.vendor}</span>}
                    {item.note && <span>📝 {item.note}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{fmt(item.estimated)}</div>
                  {item.actual != null && (
                    <div style={{ fontSize: 11, color: overBudget ? '#dc2626' : '#16a34a' }}>Ist: {fmt(item.actual)}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => startEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667eea', fontSize: 13, padding: 4 }}>✏️</button>
                  <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: 4 }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
