import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { GuestInvitation, EventGuestInviteData, EventMenuData, EventTimelineData } from '../../types/event'
import { useDeviceType } from '../../utils/useDeviceType'

interface Props {
  data: EventGuestInviteData
  eventName: string
  eventDate?: string
  eventFrom?: string
  eventTo?: string
  menuData?: EventMenuData | null
  timelineData?: EventTimelineData | null
  onSave: (data: EventGuestInviteData) => Promise<void>
}

function genId() { return `gi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
function genToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let t = ''
  for (let i = 0; i < 24; i++) t += chars[Math.floor(Math.random() * chars.length)]
  return t
}

const DEFAULT_CATEGORIES = ['Familie Braut', 'Familie Bräutigam', 'Freunde', 'Arbeitskollegen', 'Nachbarn', 'Sonstige']

type SectionKey = 'share' | 'guests' | 'settings'
type SortKey = 'name' | 'status' | 'category' | 'groupSize'
type SortDir = 'asc' | 'desc'

export default function EventGuestInvite({ data, eventName, eventDate, eventFrom, eventTo, menuData, timelineData, onSave }: Props) {
  const [invitations, setInvitations] = useState<GuestInvitation[]>(data.invitations ?? [])
  const [shareToken] = useState(data.shareToken || genToken())
  const [shareMode, setShareMode] = useState<'open' | 'invite-only'>(data.shareMode ?? 'open')
  const [categories, setCategories] = useState<string[]>(data.categories ?? DEFAULT_CATEGORIES)
  const [settings, setSettings] = useState({
    eventDescription: data.eventDescription ?? '',
    locationName: data.locationName ?? '',
    locationAddress: data.locationAddress ?? '',
    rsvpDeadline: data.rsvpDeadline ?? '',
    allowMenuSelection: data.allowMenuSelection ?? false,
    showTimeline: data.showTimeline ?? false,
    allowPlusOne: data.allowPlusOne ?? false,
    maxGuests: data.maxGuests,
    emailSubject: data.emailSubject ?? '',
    emailBody: data.emailBody ?? '',
  })
  const [activeSection, setActiveSection] = useState<SectionKey>('guests')
  const [copiedWhat, setCopiedWhat] = useState<string | null>(null)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [emailPreview, setEmailPreview] = useState(false)
  const [printMode, setPrintMode] = useState(false)

  // Add form
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addGroupSize, setAddGroupSize] = useState(1)
  const [addChildren, setAddChildren] = useState(0)
  const [addCategoryField, setAddCategoryField] = useState('')
  const [addNotes, setAddNotes] = useState('')

  // Search, filter, sort
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Category manager
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Mobile
  const device = useDeviceType()
  const isMobile = device === 'mobile'
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState(false)

  // CSV import
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInvitations(data.invitations ?? [])
    setShareMode(data.shareMode ?? 'open')
    setCategories(data.categories ?? DEFAULT_CATEGORIES)
    setSettings({
      eventDescription: data.eventDescription ?? '',
      locationName: data.locationName ?? '',
      locationAddress: data.locationAddress ?? '',
      rsvpDeadline: data.rsvpDeadline ?? '',
      allowMenuSelection: data.allowMenuSelection ?? false,
      showTimeline: data.showTimeline ?? false,
      allowPlusOne: data.allowPlusOne ?? false,
      maxGuests: data.maxGuests,
      emailSubject: data.emailSubject ?? '',
      emailBody: data.emailBody ?? '',
    })
  }, [data])

  async function persist(invs?: GuestInvitation[], s?: typeof settings, mode?: 'open' | 'invite-only', cats?: string[]) {
    const d: EventGuestInviteData = {
      shareToken,
      shareMode: mode ?? shareMode,
      invitations: invs ?? invitations,
      categories: cats ?? categories,
      ...(s ?? settings),
    }
    await onSave(d)
  }

  // ── Stats ──
  const stats = useMemo(() => {
    const total = invitations.length
    const accepted = invitations.filter(i => i.status === 'accepted').length
    const declined = invitations.filter(i => i.status === 'declined').length
    const pending = invitations.filter(i => i.status === 'pending').length
    const totalAdults = invitations.filter(i => i.status === 'accepted').reduce((s, i) => s + (i.confirmedCount ?? i.groupSize) - (i.children ?? 0), 0)
    const totalChildren = invitations.filter(i => i.status === 'accepted').reduce((s, i) => s + (i.children ?? 0), 0)
    const totalGuests = totalAdults + totalChildren
    const needAccommodation = invitations.filter(i => i.accommodation === 'needed').length
    const byCategory: Record<string, { total: number; accepted: number }> = {}
    invitations.forEach(i => {
      const cat = i.category || 'Ohne Kategorie'
      if (!byCategory[cat]) byCategory[cat] = { total: 0, accepted: 0 }
      byCategory[cat].total++
      if (i.status === 'accepted') byCategory[cat].accepted++
    })
    return { total, accepted, declined, pending, totalGuests, totalAdults, totalChildren, needAccommodation, byCategory }
  }, [invitations])

  // ── Filtered & sorted list ──
  const filteredGuests = useMemo(() => {
    let list = [...invitations]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.email?.toLowerCase().includes(q) ||
        i.phone?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q) ||
        i.dietaryNotes?.toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus)
    if (filterCategory !== 'all') {
      if (filterCategory === '_none') list = list.filter(i => !i.category)
      else list = list.filter(i => i.category === filterCategory)
    }
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name, 'de'); break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'category': cmp = (a.category ?? '').localeCompare(b.category ?? '', 'de'); break
        case 'groupSize': cmp = a.groupSize - b.groupSize; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [invitations, searchQuery, filterStatus, filterCategory, sortKey, sortDir])

  const generalLink = `${window.location.origin}/event/${shareToken}`

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedWhat(label)
      setTimeout(() => setCopiedWhat(null), 2000)
    })
  }

  function shareWhatsApp(link: string, personal?: string) {
    const dateStr = eventDate ? new Date(eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''
    const timeStr = eventFrom ? ` um ${eventFrom} Uhr` : ''
    let msg = personal ? `${personal}\n\n` : `Du bist eingeladen! 🎉\n\n`
    msg += `📅 *${eventName}*`
    if (dateStr) msg += `\n🗓 ${dateStr}${timeStr}`
    if (settings.locationName) msg += `\n📍 ${settings.locationName}`
    msg += `\n\n👉 ${link}`
    if (settings.rsvpDeadline) msg += `\n\nBitte sage bis zum ${new Date(settings.rsvpDeadline + 'T00:00:00').toLocaleDateString('de-DE')} zu oder ab.`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function getEmailContent(link: string, guestName?: string) {
    const subject = settings.emailSubject || `Einladung: ${eventName}`
    const dateStr = eventDate ? new Date(eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''
    const body = settings.emailBody || [
      guestName ? `Hallo ${guestName},` : 'Hallo,',
      '', `wir möchten dich herzlich zu "${eventName}" einladen!`, '',
      dateStr ? `📅 Datum: ${dateStr}` : '',
      eventFrom ? `🕐 Uhrzeit: ${eventFrom}${eventTo ? ` – ${eventTo}` : ''} Uhr` : '',
      settings.locationName ? `📍 Ort: ${settings.locationName}${settings.locationAddress ? `, ${settings.locationAddress}` : ''}` : '',
      '', `Hier kannst du zu- oder absagen:`, link, '',
      settings.rsvpDeadline ? `Bitte antworte bis zum ${new Date(settings.rsvpDeadline + 'T00:00:00').toLocaleDateString('de-DE')}.` : '',
      '', 'Wir freuen uns auf dich!',
    ].filter(Boolean).join('\n')
    return { subject, body }
  }

  function openEmailClient(link: string, guestName?: string, email?: string) {
    const { subject, body } = getEmailContent(link, guestName)
    window.open(`mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  // ── CRUD ──
  function addGuest() {
    if (!addName.trim()) return
    const inv: GuestInvitation = {
      id: genId(), name: addName.trim(), email: addEmail.trim() || undefined, phone: addPhone.trim() || undefined,
      groupSize: addGroupSize, children: addChildren || undefined, category: addCategoryField || undefined,
      notes: addNotes.trim() || undefined, token: genToken(), status: 'pending',
    }
    const next = [...invitations, inv]
    setInvitations(next)
    persist(next)
    setAddName(''); setAddEmail(''); setAddPhone(''); setAddGroupSize(1); setAddChildren(0); setAddCategoryField(''); setAddNotes('')
    setShowAddGuest(false)
  }

  function removeGuest(id: string) {
    const next = invitations.filter(i => i.id !== id)
    setInvitations(next); persist(next)
    if (selectedId === id) setSelectedId(null)
  }

  function updateGuest(id: string, updates: Partial<GuestInvitation>) {
    const next = invitations.map(i => i.id === id ? { ...i, ...updates } : i)
    setInvitations(next); persist(next)
  }

  function updateGuestStatus(id: string, status: GuestInvitation['status']) {
    updateGuest(id, { status, respondedAt: new Date().toISOString() })
  }

  function changeShareMode(mode: 'open' | 'invite-only') {
    setShareMode(mode); persist(undefined, undefined, mode)
  }

  function updateSettings(partial: Partial<typeof settings>) {
    const s = { ...settings, ...partial }; setSettings(s); persist(undefined, s)
  }

  // ── Categories ──
  function addCategory(name: string) {
    if (!name.trim() || categories.includes(name.trim())) return
    const next = [...categories, name.trim()]
    setCategories(next); persist(undefined, undefined, undefined, next); setNewCategoryName('')
  }

  function removeCategory(name: string) {
    const next = categories.filter(c => c !== name)
    setCategories(next)
    // Clear category from guests that had it
    const updatedInvs = invitations.map(i => i.category === name ? { ...i, category: undefined } : i)
    setInvitations(updatedInvs)
    persist(updatedInvs, undefined, undefined, next)
  }

  // ── CSV Export ──
  function exportCSV() {
    const headers = ['Name', 'E-Mail', 'Telefon', 'Personen', 'davon Kinder', 'Kategorie', 'Status', 'Bestätigt', 'Ernährung', 'Anmerkungen', 'Unterkunft', 'Tisch']
    const rows = invitations.map(i => [
      i.name, i.email ?? '', i.phone ?? '', String(i.groupSize), String(i.children ?? 0),
      i.category ?? '', i.status === 'accepted' ? 'Zugesagt' : i.status === 'declined' ? 'Abgesagt' : 'Ausstehend',
      String(i.confirmedCount ?? ''), i.dietaryNotes ?? '', i.notes ?? '',
      i.accommodation === 'needed' ? 'Benötigt' : i.accommodation === 'arranged' ? 'Organisiert' : '',
      i.tableAssignment ?? '',
    ])
    const BOM = '\uFEFF'
    const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `gästeliste-${eventName.replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── CSV Import ──
  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) return
      // Detect separator
      const sep = lines[0].includes(';') ? ';' : ','
      const parseRow = (line: string) => {
        const fields: string[] = []
        let current = '', inQuote = false
        for (const ch of line) {
          if (ch === '"') { inQuote = !inQuote; continue }
          if (ch === sep && !inQuote) { fields.push(current.trim()); current = ''; continue }
          current += ch
        }
        fields.push(current.trim())
        return fields
      }
      const headerRow = parseRow(lines[0]).map(h => h.toLowerCase().replace(/^[\uFEFF]/, ''))
      const nameIdx = headerRow.findIndex(h => h.includes('name'))
      const emailIdx = headerRow.findIndex(h => h.includes('mail') || h.includes('e-mail'))
      const phoneIdx = headerRow.findIndex(h => h.includes('telefon') || h.includes('phone') || h.includes('tel'))
      const sizeIdx = headerRow.findIndex(h => h.includes('person') || h.includes('größe') || h.includes('size') || h.includes('anzahl'))
      const catIdx = headerRow.findIndex(h => h.includes('kategorie') || h.includes('category') || h.includes('gruppe'))
      const notesIdx = headerRow.findIndex(h => h.includes('anmerk') || h.includes('notiz') || h.includes('notes'))
      const dietIdx = headerRow.findIndex(h => h.includes('ernähr') || h.includes('diet') || h.includes('essen'))
      if (nameIdx === -1) { alert('CSV muss eine Spalte "Name" enthalten.'); return }
      const newInvs: GuestInvitation[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseRow(lines[i])
        const name = cols[nameIdx]?.trim()
        if (!name) continue
        newInvs.push({
          id: genId(), name, token: genToken(), status: 'pending',
          email: emailIdx >= 0 ? cols[emailIdx]?.trim() || undefined : undefined,
          phone: phoneIdx >= 0 ? cols[phoneIdx]?.trim() || undefined : undefined,
          groupSize: sizeIdx >= 0 ? parseInt(cols[sizeIdx]) || 1 : 1,
          category: catIdx >= 0 ? cols[catIdx]?.trim() || undefined : undefined,
          notes: notesIdx >= 0 ? cols[notesIdx]?.trim() || undefined : undefined,
          dietaryNotes: dietIdx >= 0 ? cols[dietIdx]?.trim() || undefined : undefined,
        })
      }
      if (newInvs.length === 0) { alert('Keine Gäste in der CSV-Datei gefunden.'); return }
      const merged = [...invitations, ...newInvs]
      setInvitations(merged); persist(merged)
      alert(`${newInvs.length} Gäste importiert!`)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const selectedGuest = invitations.find(i => i.id === selectedId)

  const statusColors: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    pending: { bg: '#fef3c7', text: '#92400e', label: 'Ausstehend', icon: '⏳' },
    accepted: { bg: '#d1fae5', text: '#065f46', label: 'Zugesagt', icon: '✓' },
    declined: { bg: '#fee2e2', text: '#991b1b', label: 'Abgesagt', icon: '✕' },
  }

  const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }
  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
    background: active ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f1f5f9', color: active ? 'white' : '#475569',
  })
  const sectionBtn = (key: SectionKey, icon: string, label: string) => (
    <button onClick={() => setActiveSection(key)} style={{
      flex: '1 1 100px', padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
      background: activeSection === key ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'white',
      color: activeSection === key ? 'white' : '#475569',
      fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
      boxShadow: activeSection === key ? '0 4px 12px rgba(102,126,234,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
    }}>{icon} {label}</button>
  )

  // ── Print view ──
  if (printMode) {
    const statusLabel = (s: string) => s === 'accepted' ? '✓' : s === 'declined' ? '✕' : '–'
    return (
      <div style={{ padding: 30, maxWidth: 800, margin: '0 auto', fontFamily: 'serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Gästeliste — {eventName}</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              {eventDate && new Date(eventDate + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              {eventFrom && ` · ${eventFrom} Uhr`}
              {settings.locationName && ` · ${settings.locationName}`}
            </p>
          </div>
          <button onClick={() => setPrintMode(false)} className="no-print"
            style={{ padding: '6px 14px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}
          >← Zurück</button>
        </div>

        {/* Stats summary */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 13, color: '#374151' }}>
          <span><strong>{stats.total}</strong> Eingeladen</span>
          <span style={{ color: '#059669' }}><strong>{stats.accepted}</strong> Zugesagt</span>
          <span style={{ color: '#dc2626' }}><strong>{stats.declined}</strong> Abgesagt</span>
          <span style={{ color: '#d97706' }}><strong>{stats.pending}</strong> Offen</span>
          <span>|</span>
          <span><strong>{stats.totalAdults}</strong> Erw.</span>
          <span><strong>{stats.totalChildren}</strong> Kinder</span>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1e293b' }}>
              {['Nr.', 'Name', 'Kategorie', 'Pers.', 'Kinder', 'Status', 'Ernährung', 'Tisch', 'Unterkunft'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, fontSize: 11, color: '#374151' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv, idx) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 8px', color: '#94a3b8', fontSize: 11 }}>{idx + 1}</td>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{inv.name}</td>
                <td style={{ padding: '6px 8px', color: '#64748b' }}>{inv.category ?? '–'}</td>
                <td style={{ padding: '6px 8px' }}>{inv.confirmedCount ?? inv.groupSize}</td>
                <td style={{ padding: '6px 8px' }}>{inv.children ?? 0}</td>
                <td style={{ padding: '6px 8px' }}>{statusLabel(inv.status)}</td>
                <td style={{ padding: '6px 8px', color: '#64748b', fontSize: 12 }}>{inv.dietaryNotes ?? ''}</td>
                <td style={{ padding: '6px 8px', color: '#64748b' }}>{inv.tableAssignment ?? ''}</td>
                <td style={{ padding: '6px 8px', color: '#64748b' }}>{inv.accommodation === 'needed' ? '!' : inv.accommodation === 'arranged' ? '✓' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Category breakdown */}
        {Object.keys(stats.byCategory).length > 1 && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Nach Kategorie</h4>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#475569' }}>
              {Object.entries(stats.byCategory).map(([cat, c]) => (
                <span key={cat}>{cat}: <strong>{c.accepted}/{c.total}</strong></span>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => window.print()} className="no-print"
          style={{ marginTop: 24, padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >🖨️ Drucken</button>

        <style>{`@media print { .no-print { display: none !important; } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>💌 Gästeliste & Einladungen</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Gäste verwalten, einladen und Rückmeldungen tracken</p>
      </div>

      {/* ── Stats bar ── */}
      {isMobile ? (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            { label: 'Eingeladen', value: stats.total, color: '#667eea', bg: '#e0e7ff' },
            { label: 'Zugesagt', value: stats.accepted, color: '#059669', bg: '#d1fae5' },
            { label: 'Abgesagt', value: stats.declined, color: '#dc2626', bg: '#fee2e2' },
            { label: 'Offen', value: stats.pending, color: '#d97706', bg: '#fef3c7' },
          ].map(s => (
            <div key={s.label} style={{ padding: '6px 0', borderRadius: 8, background: s.bg, flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: s.color, opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Eingeladen', value: stats.total, color: '#667eea', bg: '#e0e7ff' },
            { label: 'Zugesagt', value: stats.accepted, color: '#059669', bg: '#d1fae5' },
            { label: 'Abgesagt', value: stats.declined, color: '#dc2626', bg: '#fee2e2' },
            { label: 'Offen', value: stats.pending, color: '#d97706', bg: '#fef3c7' },
            { label: 'Erwachsene', value: stats.totalAdults, color: '#7c3aed', bg: '#ede9fe' },
            { label: 'Kinder', value: stats.totalChildren, color: '#ec4899', bg: '#fce7f3' },
          ].map(s => (
            <div key={s.label} style={{ padding: '7px 12px', borderRadius: 10, background: s.bg, flex: '1 1 80px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: s.color, opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Category breakdown (desktop only) */}
      {!isMobile && Object.keys(stats.byCategory).length > 1 && (
        <div style={{ ...cardStyle, padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Kategorien:</span>
          {Object.entries(stats.byCategory).map(([cat, c]) => (
            <span key={cat} style={{ fontSize: 11, color: '#475569' }}>
              <strong>{cat}</strong> {c.accepted}/{c.total}
            </span>
          ))}
          {stats.needAccommodation > 0 && (
            <span style={{ fontSize: 11, color: '#d97706', marginLeft: 'auto' }}>🏨 {stats.needAccommodation} Unterkunft benötigt</span>
          )}
        </div>
      )}

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: isMobile ? 6 : 8, marginBottom: isMobile ? 12 : 20, flexWrap: 'wrap' }}>
        {sectionBtn('guests', '👥', isMobile ? `Gäste (${stats.total})` : `Gästeliste (${stats.total})`)}
        {sectionBtn('share', '🔗', isMobile ? 'Teilen' : 'Teilen & Einladen')}
        {sectionBtn('settings', '⚙️', isMobile ? 'Optionen' : 'Einstellungen')}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ SECTION: Gästeliste ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {activeSection === 'guests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Hidden file input for CSV import */}
          <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCSVImport} />

          {/* Toolbar: search, filter, actions */}
          <div style={{ ...cardStyle, padding: isMobile ? '10px 12px' : '12px 16px' }}>
            {/* Row 1: Search + Add Guest + Desktop action buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: isMobile && !showMobileFilters && !showMobileActions ? 0 : 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="🔍 Gäste suchen..." style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} />
              </div>
              <button onClick={() => setShowAddGuest(!showAddGuest)}
                style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
              >+ Gast</button>
              {!isMobile && (
                <>
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}
                  >📥 CSV Import</button>
                  <button onClick={exportCSV} disabled={invitations.length === 0}
                    style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: invitations.length ? '#475569' : '#cbd5e1', whiteSpace: 'nowrap' }}
                  >📤 Export</button>
                  <button onClick={() => setPrintMode(true)} disabled={invitations.length === 0}
                    style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: invitations.length ? '#475569' : '#cbd5e1', whiteSpace: 'nowrap' }}
                  >🖨️</button>
                </>
              )}
            </div>

            {/* Mobile: compact toggle buttons for filters/actions */}
            {isMobile && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => { setShowMobileFilters(!showMobileFilters); setShowMobileActions(false) }}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid ' + (showMobileFilters ? '#667eea' : '#e2e8f0'),
                    background: showMobileFilters ? '#e0e7ff' : '#f8fafc',
                    color: showMobileFilters ? '#667eea' : '#64748b',
                  }}
                >
                  🔽 Filter {filterStatus !== 'all' || filterCategory !== 'all' ? '●' : ''}
                </button>
                <button onClick={() => { setShowMobileActions(!showMobileActions); setShowMobileFilters(false) }}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid ' + (showMobileActions ? '#667eea' : '#e2e8f0'),
                    background: showMobileActions ? '#e0e7ff' : '#f8fafc',
                    color: showMobileActions ? '#667eea' : '#64748b',
                  }}
                >⚡ Aktionen</button>
              </div>
            )}

            {/* Filters — always visible on desktop, collapsible on mobile */}
            {(!isMobile || showMobileFilters) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', ...(isMobile ? { marginTop: 10 } : {}) }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginRight: 2 }}>Status:</span>
                {[
                  { key: 'all', label: 'Alle' },
                  { key: 'pending', label: '⏳ Offen' },
                  { key: 'accepted', label: '✓ Zugesagt' },
                  { key: 'declined', label: '✕ Abgesagt' },
                ].map(f => (
                  <button key={f.key} onClick={() => setFilterStatus(f.key)} style={pillBtn(filterStatus === f.key)}>{f.label}</button>
                ))}

                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', margin: '0 4px 0 10px' }}>Kategorie:</span>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', background: 'white' }}
                >
                  <option value="all">Alle</option>
                  <option value="_none">Ohne Kategorie</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <button onClick={() => setShowCategoryManager(!showCategoryManager)}
                  style={{ marginLeft: isMobile ? 0 : 'auto', padding: '4px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600, color: '#64748b' }}
                >🏷️ Kategorien</button>

                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', margin: '0 4px 0 8px' }}>Sort:</span>
                {[
                  { key: 'name' as SortKey, label: 'Name' },
                  { key: 'status' as SortKey, label: 'Status' },
                  { key: 'category' as SortKey, label: 'Kategorie' },
                  { key: 'groupSize' as SortKey, label: 'Größe' },
                ].map(s => (
                  <button key={s.key} onClick={() => toggleSort(s.key)}
                    style={{ ...pillBtn(sortKey === s.key), fontSize: 10 }}
                  >{s.label} {sortKey === s.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                ))}
              </div>
            )}

            {/* Mobile actions — collapsible */}
            {isMobile && showMobileActions && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ flex: 1, padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}
                >📥 CSV Import</button>
                <button onClick={exportCSV} disabled={invitations.length === 0}
                  style={{ flex: 1, padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: invitations.length ? '#475569' : '#cbd5e1', whiteSpace: 'nowrap' }}
                >📤 Export</button>
                <button onClick={() => setPrintMode(true)} disabled={invitations.length === 0}
                  style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: invitations.length ? '#475569' : '#cbd5e1', whiteSpace: 'nowrap' }}
                >🖨️ Drucken</button>
              </div>
            )}
          </div>

          {/* Category manager */}
          {showCategoryManager && (
            <div style={cardStyle}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>🏷️ Kategorien verwalten</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {categories.map(cat => (
                  <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 16, background: '#e0e7ff', fontSize: 12, color: '#4338ca', fontWeight: 500 }}>
                    {cat}
                    <button onClick={() => removeCategory(cat)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Neue Kategorie..." style={{ ...inputStyle, padding: '6px 10px', fontSize: 12, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') { addCategory(newCategoryName); } }} />
                <button onClick={() => addCategory(newCategoryName)} disabled={!newCategoryName.trim()}
                  style={{ padding: '6px 14px', background: newCategoryName.trim() ? '#667eea' : '#e2e8f0', color: newCategoryName.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: 8, cursor: newCategoryName.trim() ? 'pointer' : 'default', fontSize: 12, fontWeight: 600 }}
                >+</button>
              </div>
            </div>
          )}

          {/* Add guest form */}
          {showAddGuest && (
            <div style={cardStyle}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>+ Gast hinzufügen</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '2 1 200px' }}>
                    <label style={labelStyle}>Name *</label>
                    <input type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="z.B. Familie Müller"
                      autoFocus style={inputStyle} onKeyDown={e => e.key === 'Enter' && addGuest()} />
                  </div>
                  <div style={{ flex: '1 1 120px' }}>
                    <label style={labelStyle}>Kategorie</label>
                    <select value={addCategoryField} onChange={e => setAddCategoryField(e.target.value)}
                      style={{ ...inputStyle, appearance: 'auto' }}>
                      <option value="">– Wählen –</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={labelStyle}>E-Mail</label>
                    <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="optional" style={inputStyle} />
                  </div>
                  <div style={{ flex: '1 1 130px' }}>
                    <label style={labelStyle}>Telefon</label>
                    <input type="tel" value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="optional" style={inputStyle} />
                  </div>
                  <div style={{ flex: '0 1 80px' }}>
                    <label style={labelStyle}>Personen</label>
                    <input type="number" min={1} max={20} value={addGroupSize} onChange={e => setAddGroupSize(parseInt(e.target.value) || 1)} style={inputStyle} />
                  </div>
                  <div style={{ flex: '0 1 80px' }}>
                    <label style={labelStyle}>Kinder</label>
                    <input type="number" min={0} max={20} value={addChildren} onChange={e => setAddChildren(parseInt(e.target.value) || 0)} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Anmerkungen</label>
                  <input type="text" value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="z.B. Keine Stufen am Eingang, Rollstuhl" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => setShowAddGuest(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}
                >Abbrechen</button>
                <button onClick={addGuest} disabled={!addName.trim()}
                  style={{ padding: '8px 16px', background: addName.trim() ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0', color: addName.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: 8, cursor: addName.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600 }}
                >✓ Hinzufügen</button>
              </div>
            </div>
          )}

          {/* Guest detail view */}
          {selectedId && selectedGuest ? (
            <div style={cardStyle}>
              <button onClick={() => setSelectedId(null)}
                style={{ marginBottom: 10, padding: '4px 10px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#475569' }}
              >← Zur Liste</button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{selectedGuest.name}</h4>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: statusColors[selectedGuest.status].bg, color: statusColors[selectedGuest.status].text }}>
                      {statusColors[selectedGuest.status].label}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{selectedGuest.groupSize} {selectedGuest.groupSize === 1 ? 'Person' : 'Personen'}</span>
                    {selectedGuest.category && (
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: '#e0e7ff', color: '#4338ca' }}>{selectedGuest.category}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['accepted', 'declined', 'pending'] as const).filter(s => s !== selectedGuest.status).map(s => (
                    <button key={s} onClick={() => updateGuestStatus(selectedGuest.id, s)}
                      style={{ padding: '5px 10px', background: statusColors[s].bg, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: statusColors[s].text }}
                    >{statusColors[s].label}</button>
                  ))}
                </div>
              </div>

              {/* Personal invite link */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>🔗 Persönlicher Link</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                  <code style={{ flex: 1, padding: '8px 10px', background: 'white', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', wordBreak: 'break-all' }}>
                    {window.location.origin}/invite/{selectedGuest.token}
                  </code>
                  <button onClick={() => copyText(`${window.location.origin}/invite/${selectedGuest.token}`, selectedGuest.id)}
                    style={{ padding: '6px 10px', background: copiedWhat === selectedGuest.id ? '#059669' : '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}
                  >{copiedWhat === selectedGuest.id ? '✓' : '📋'}</button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => shareWhatsApp(`${window.location.origin}/invite/${selectedGuest.token}`, `Hallo ${selectedGuest.name}!`)}
                    style={{ padding: '5px 10px', background: '#25d366', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>📱 WhatsApp</button>
                  <button onClick={() => openEmailClient(`${window.location.origin}/invite/${selectedGuest.token}`, selectedGuest.name, selectedGuest.email)}
                    style={{ padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>📧 E-Mail</button>
                  <button onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/invite/${selectedGuest.token}`)}`, '_blank')}
                    style={{ padding: '5px 10px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>📷 QR</button>
                </div>
              </div>

              {/* Detail fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={labelStyle}>E-Mail</label>
                    <input type="email" value={selectedGuest.email ?? ''} onChange={e => updateGuest(selectedGuest.id, { email: e.target.value || undefined })}
                      placeholder="optional" style={inputStyle} />
                  </div>
                  <div style={{ flex: '1 1 130px' }}>
                    <label style={labelStyle}>Telefon</label>
                    <input type="tel" value={selectedGuest.phone ?? ''} onChange={e => updateGuest(selectedGuest.id, { phone: e.target.value || undefined })}
                      placeholder="optional" style={inputStyle} />
                  </div>
                  <div style={{ flex: '0 1 90px' }}>
                    <label style={labelStyle}>Bestätigt</label>
                    <input type="number" min={0} value={selectedGuest.confirmedCount ?? ''} onChange={e => updateGuest(selectedGuest.id, { confirmedCount: parseInt(e.target.value) || 0 })}
                      placeholder={String(selectedGuest.groupSize)} style={inputStyle} />
                  </div>
                  <div style={{ flex: '0 1 80px' }}>
                    <label style={labelStyle}>Kinder</label>
                    <input type="number" min={0} value={selectedGuest.children ?? 0} onChange={e => updateGuest(selectedGuest.id, { children: parseInt(e.target.value) || 0 })}
                      style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={labelStyle}>Kategorie</label>
                    <select value={selectedGuest.category ?? ''} onChange={e => updateGuest(selectedGuest.id, { category: e.target.value || undefined })}
                      style={{ ...inputStyle, appearance: 'auto' }}>
                      <option value="">– Keine –</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={labelStyle}>Unterkunft</label>
                    <select value={selectedGuest.accommodation ?? 'none'} onChange={e => updateGuest(selectedGuest.id, { accommodation: e.target.value as GuestInvitation['accommodation'] })}
                      style={{ ...inputStyle, appearance: 'auto' }}>
                      <option value="none">Nicht nötig</option>
                      <option value="needed">Benötigt</option>
                      <option value="arranged">Organisiert</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 120px' }}>
                    <label style={labelStyle}>Tischzuweisung</label>
                    <input type="text" value={selectedGuest.tableAssignment ?? ''} onChange={e => updateGuest(selectedGuest.id, { tableAssignment: e.target.value || undefined })}
                      placeholder="z.B. Tisch 3" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Ernährung / Unverträglichkeiten</label>
                  <input type="text" value={selectedGuest.dietaryNotes ?? ''} onChange={e => updateGuest(selectedGuest.id, { dietaryNotes: e.target.value })}
                    placeholder="z.B. vegetarisch, Laktoseintolerant" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Anmerkungen</label>
                  <textarea value={selectedGuest.notes ?? ''} onChange={e => updateGuest(selectedGuest.id, { notes: e.target.value })}
                    placeholder="Sonstige Anmerkungen..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ marginTop: 14, borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => { if (confirm(`"${selectedGuest.name}" wirklich entfernen?`)) removeGuest(selectedGuest.id) }}
                  style={{ padding: '6px 12px', background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#dc2626' }}
                >🗑️ Entfernen</button>
                {selectedGuest.respondedAt && (
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Antwort: {new Date(selectedGuest.respondedAt).toLocaleDateString('de-DE')}</span>
                )}
              </div>
            </div>
          ) : (
            /* Guest list */
            filteredGuests.length === 0 && invitations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', ...cardStyle }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>👥</div>
                <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 8px' }}>Noch keine Gäste auf der Liste</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Füge Gäste manuell hinzu oder importiere eine CSV-Datei mit deiner Gästeliste.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => setShowAddGuest(true)}
                    style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >+ Gast hinzufügen</button>
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}
                  >📥 CSV importieren</button>
                </div>
              </div>
            ) : filteredGuests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', ...cardStyle }}>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>🔍 Keine Gäste gefunden für diesen Filter</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {filteredGuests.map(inv => {
                  const sc = statusColors[inv.status]
                  return (
                    <div key={inv.id} onClick={() => setSelectedId(inv.id)}
                      style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', transition: 'all 0.15s' }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, color: sc.text }}>
                        {sc.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{inv.name}</span>
                          {inv.category && (
                            <span style={{ padding: '1px 7px', borderRadius: 8, fontSize: 9, fontWeight: 600, background: '#e0e7ff', color: '#4338ca' }}>{inv.category}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span>{inv.status === 'accepted' ? (inv.confirmedCount ?? inv.groupSize) : inv.groupSize} Pers.{(inv.children ?? 0) > 0 && ` (${inv.children} Ki.)`}</span>
                          {inv.email && <span>📧 {inv.email}</span>}
                          {inv.phone && <span>📞 {inv.phone}</span>}
                          {inv.dietaryNotes && <span>🍽️ {inv.dietaryNotes}</span>}
                          {inv.accommodation === 'needed' && <span>🏨</span>}
                          {inv.tableAssignment && <span>🪑 {inv.tableAssignment}</span>}
                        </div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.text, flexShrink: 0 }}>
                        {sc.label}
                      </span>
                      <button onClick={e => { e.stopPropagation(); copyText(`${window.location.origin}/invite/${inv.token}`, inv.id) }}
                        style={{ padding: '4px 7px', background: copiedWhat === inv.id ? '#059669' : '#f1f5f9', color: copiedWhat === inv.id ? 'white' : '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600, flexShrink: 0 }}
                      >{copiedWhat === inv.id ? '✓' : '🔗'}</button>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ SECTION: Teilen & Einladen ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {activeSection === 'share' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Share mode toggle */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>📋 Einladungsmodus</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { mode: 'open' as const, label: 'Offene Einladung', desc: 'Jeder mit dem Link kann sich anmelden', icon: '🌐' },
                { mode: 'invite-only' as const, label: 'Persönliche Einladung', desc: 'Nur eingeladene Gäste können antworten', icon: '🔒' },
              ]).map(opt => (
                <button key={opt.mode} onClick={() => changeShareMode(opt.mode)}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                    border: shareMode === opt.mode ? '2px solid #667eea' : '2px solid #e2e8f0',
                    background: shareMode === opt.mode ? 'linear-gradient(135deg, rgba(102,126,234,0.06), rgba(118,75,162,0.06))' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 15, marginBottom: 4 }}>{opt.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: shareMode === opt.mode ? '#667eea' : '#1e293b' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* General Link & QR — only shown in open mode */}
          {shareMode === 'open' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>🔗 Allgemeiner Event-Link</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Teile diesen Link — jeder kann sich damit anmelden
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <code style={{ flex: 1, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {generalLink}
              </code>
              <button onClick={() => copyText(generalLink, 'link')}
                style={{ padding: '10px 14px', background: copiedWhat === 'link' ? '#059669' : '#667eea', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
              >{copiedWhat === 'link' ? '✓ Kopiert!' : '📋 Kopieren'}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => shareWhatsApp(generalLink)}
                style={{ padding: '8px 16px', background: '#25d366', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📱 WhatsApp teilen</button>
              <button onClick={() => openEmailClient(generalLink)}
                style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📧 Per E-Mail senden</button>
              <button onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generalLink)}`, '_blank')}
                style={{ padding: '8px 16px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📷 QR-Code anzeigen</button>
            </div>
          </div>
          )}

          {/* Personal invitations — only in invite-only mode */}
          {shareMode === 'invite-only' && (
            invitations.length === 0 ? (
              <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(102,126,234,0.04), rgba(118,75,162,0.04))' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>💌 Persönliche Einladungen</div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  Im Modus "Persönliche Einladung" bekommt jeder Gast einen eigenen Link.
                  Füge Gäste in der Gästeliste hinzu und teile dann ihre persönlichen Links.
                </p>
                <button onClick={() => { setActiveSection('guests'); setShowAddGuest(true) }}
                  style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >+ Gäste hinzufügen</button>
              </div>
            ) : (
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>💌 Persönliche Einladungslinks</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Jeder Gast hat einen eigenen Link zum Antworten</div>
                  </div>
                  <button onClick={() => { setActiveSection('guests'); setShowAddGuest(true) }}
                    style={{ padding: '5px 12px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#475569' }}
                  >+ Gast</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {invitations.map(inv => {
                    const sc = statusColors[inv.status]
                    const invLink = `${window.location.origin}/invite/${inv.token}`
                    return (
                      <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.text, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{inv.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invLink}</div>
                        </div>
                        <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 600, background: sc.bg, color: sc.text, flexShrink: 0 }}>
                          {sc.label}
                        </span>
                        <button onClick={() => copyText(invLink, `share-${inv.id}`)}
                          style={{ padding: '4px 8px', background: copiedWhat === `share-${inv.id}` ? '#059669' : '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600, flexShrink: 0 }}
                        >{copiedWhat === `share-${inv.id}` ? '✓' : '📋'}</button>
                        <button onClick={() => shareWhatsApp(invLink, `Hallo ${inv.name}!`)}
                          style={{ padding: '4px 8px', background: '#25d366', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600, flexShrink: 0 }}
                        >📱</button>
                        {inv.email && (
                          <button onClick={() => openEmailClient(invLink, inv.name, inv.email)}
                            style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600, flexShrink: 0 }}
                          >📧</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          )}

          {/* Email template — collapsible */}
          <div style={cardStyle}>
            <button onClick={() => setEmailPreview(!emailPreview)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📧 E-Mail-Vorlage</div>
              <span style={{ fontSize: 11, color: '#64748b' }}>{emailPreview ? '▲ Einklappen' : '▼ Bearbeiten'}</span>
            </button>
            {emailPreview && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Betreff</label>
                  <input type="text" value={settings.emailSubject} onChange={e => updateSettings({ emailSubject: e.target.value })}
                    placeholder={`Einladung: ${eventName}`} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nachricht (leer = Standardtext)</label>
                  <textarea value={settings.emailBody} onChange={e => updateSettings({ emailBody: e.target.value })}
                    placeholder="Leer lassen für automatisch generierten Text mit Event-Details, Link und Frist..."
                    rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Vorschau:</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Betreff: {settings.emailSubject || `Einladung: ${eventName}`}</div>
                  <pre style={{ margin: 0, fontSize: 12, color: '#475569', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.5 }}>
                    {getEmailContent(generalLink).body}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ SECTION: Einstellungen ═══ */}
      {/* ═══════════════════════════════════════════ */}
      {activeSection === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>📋 Event-Seite Inhalt</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Beschreibung</label>
                <textarea value={settings.eventDescription} onChange={e => updateSettings({ eventDescription: e.target.value })}
                  placeholder="Beschreibe dein Event für die Gäste..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Location</label>
                  <input type="text" value={settings.locationName} onChange={e => updateSettings({ locationName: e.target.value })}
                    placeholder="z.B. Schloss Bellevue" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Adresse</label>
                  <input type="text" value={settings.locationAddress} onChange={e => updateSettings({ locationAddress: e.target.value })}
                    placeholder="z.B. Musterstraße 1, 12345 Berlin" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>RSVP-Frist</label>
                <input type="date" value={settings.rsvpDeadline} onChange={e => updateSettings({ rsvpDeadline: e.target.value })}
                  style={{ ...inputStyle, maxWidth: 220 }} />
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>🎛️ RSVP-Optionen</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                <input type="checkbox" checked={settings.allowPlusOne} onChange={e => updateSettings({ allowPlusOne: e.target.checked })} style={{ width: 16, height: 16 }} />
                Begleitpersonen erlauben (+1)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                <input type="checkbox" checked={settings.allowMenuSelection} onChange={e => updateSettings({ allowMenuSelection: e.target.checked })}
                  disabled={!menuData?.courses?.length} style={{ width: 16, height: 16 }} />
                Menüauswahl bei Rückmeldung
                {!menuData?.courses?.length && <span style={{ fontSize: 11, color: '#94a3b8' }}>(Menü-Modul fehlt)</span>}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                <input type="checkbox" checked={settings.showTimeline} onChange={e => updateSettings({ showTimeline: e.target.checked })}
                  disabled={!timelineData?.entries?.length} style={{ width: 16, height: 16 }} />
                Ablaufplan auf Event-Seite anzeigen
                {!timelineData?.entries?.length && <span style={{ fontSize: 11, color: '#94a3b8' }}>(Ablaufplan fehlt)</span>}
              </label>
              <div>
                <label style={labelStyle}>Maximale Gästezahl (optional)</label>
                <input type="number" min={0} value={settings.maxGuests ?? ''} onChange={e => updateSettings({ maxGuests: parseInt(e.target.value) || undefined })}
                  placeholder="unbegrenzt" style={{ ...inputStyle, maxWidth: 150 }} />
              </div>
            </div>
          </div>

          <div style={{ padding: '14px 18px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd', fontSize: 13, color: '#0369a1', lineHeight: 1.6 }}>
            💡 <strong>Tipp:</strong> Im Modus "Offene Einladung" eignet sich der allgemeine Link für WhatsApp-Gruppen,
            Social Media oder gedruckte Einladungen mit QR-Code. Für formellere Anlässe wie Hochzeiten
            nutze "Persönliche Einladung" — so behältst du die volle Kontrolle über die Gästeliste.
          </div>
        </div>
      )}
    </div>
  )
}
