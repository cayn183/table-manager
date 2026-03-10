// ============================================================================
// ClubToGo – ToGo/Food management for club events
// Derived from ToGo.tsx, but uses props + callback instead of localStorage.
// ============================================================================
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import Papa from 'papaparse'
import type { MenuItem, ToGoOrder, ToGoEventConfig, OrderItem } from '../../types/togo'
import { calculateOrderTotal, formatPrice, generateToGoId } from '../../types/togo'
import { formatDateLong } from '../../utils/dateFormatting'

// ── Props ──────────────────────────────────────────────────────────
export interface ClubToGoProps {
  /** Event title (for print/export) */
  eventTitle: string
  /** Event date string (YYYY-MM-DD) */
  eventDate?: string
  /** Start time HH:MM */
  timeFrom?: string
  /** End time HH:MM */
  timeTo?: string
  /** Initial menu items */
  initialMenuItems: MenuItem[]
  /** Initial orders */
  initialOrders: ToGoOrder[]
  /** Called to persist – parent calls updateClubEvent API */
  onSave: (menuItems: MenuItem[], orders: ToGoOrder[]) => Promise<void>
  /** Whether user has edit rights */
  readOnly?: boolean
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ClubToGo({
  eventTitle, eventDate, timeFrom, timeTo,
  initialMenuItems, initialOrders,
  onSave, readOnly,
}: ClubToGoProps) {

  // ── State ──────────────────────────────────────────────────────
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems)
  const [orders, setOrders] = useState<ToGoOrder[]>(initialOrders)
  const [isDirty, setIsDirty] = useState(false)
  const [saveToast, setSaveToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [editingOrder, setEditingOrder] = useState<ToGoOrder | null>(null)

  // Menu Item Form
  const [menuItemName, setMenuItemName] = useState('')
  const [menuItemPrice, setMenuItemPrice] = useState('')
  const [menuItemDescription, setMenuItemDescription] = useState('')
  const [menuItemCategory, setMenuItemCategory] = useState('')

  const [showHelpModal, setShowHelpModal] = useState(false)

  // Order Form
  const [orderFamilyName, setOrderFamilyName] = useState('')
  const [orderTime, setOrderTime] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  // CSV Import
  const [showCsvImportModal, setShowCsvImportModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvFileEncoding, setCsvFileEncoding] = useState<string | null>(null)
  const [csvPreview, setCsvPreview] = useState<ToGoOrder[]>([])
  const [csvRawText, setCsvRawText] = useState<string | null>(null)
  const [csvDetectedDelimiter, setCsvDetectedDelimiter] = useState<string | null>(null)
  const [csvDelimiterWarning, setCsvDelimiterWarning] = useState<string | null>(null)
  const [showMenuMismatchModal, setShowMenuMismatchModal] = useState(false)
  const [menuMismatchInfo, setMenuMismatchInfo] = useState<{
    missingInMenu: string[]
    missingInCsv: string[]
    orderMismatch: boolean
    csvMenuOrder: string[]
    suggestions: Array<{ csvName: string; menuName: string; score: number }>
  } | null>(null)

  // Sorting
  const [sortBy, setSortBy] = useState<'time' | 'name'>('time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // ── Sync when parent re-mounts with new data ────────────────────
  useEffect(() => {
    setMenuItems(initialMenuItems)
    setOrders(initialOrders)
  }, [initialMenuItems, initialOrders])

  // ── Auto-Save ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty || readOnly) return
    const timer = setTimeout(() => { saveData() }, 2000)
    return () => clearTimeout(timer)
  }, [menuItems, orders, isDirty, readOnly])

  const saveData = useCallback(async () => {
    if (readOnly) return
    try {
      await onSave(menuItems, orders)
      setIsDirty(false)
      setSaveToast({ type: 'success', message: 'Gespeichert' })
      setTimeout(() => setSaveToast(null), 2000)
    } catch (e: any) {
      setSaveToast({ type: 'error', message: e?.message || 'Speichern fehlgeschlagen' })
      setTimeout(() => setSaveToast(null), 2000)
    }
  }, [menuItems, orders, onSave, readOnly])

  // ── Menu Item Handlers ─────────────────────────────────────────
  const openMenuModal = (item?: MenuItem) => {
    if (item) {
      setEditingMenuItem(item)
      setMenuItemName(item.name)
      setMenuItemPrice((item.price / 100).toFixed(2).replace('.', ','))
      setMenuItemDescription(item.description || '')
      setMenuItemCategory(item.category || '')
    } else {
      setEditingMenuItem(null)
      setMenuItemName('')
      setMenuItemPrice('')
      setMenuItemDescription('')
      setMenuItemCategory('')
    }
    setShowMenuModal(true)
  }

  const saveMenuItem = () => {
    const priceNum = parseFloat(menuItemPrice.replace(',', '.')) * 100
    if (!menuItemName || isNaN(priceNum)) return
    const item: MenuItem = {
      id: editingMenuItem?.id || generateToGoId('mi'),
      name: menuItemName.trim(),
      price: Math.round(priceNum),
      description: menuItemDescription.trim() || undefined,
      category: menuItemCategory.trim() || undefined,
      available: editingMenuItem?.available ?? true,
    }
    if (editingMenuItem) {
      setMenuItems(prev => prev.map(m => m.id === item.id ? item : m))
    } else {
      setMenuItems(prev => [...prev, item])
    }
    setShowMenuModal(false)
    setIsDirty(true)
  }

  const deleteMenuItem = (id: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== id))
    setOrders(prev => prev.map(o => ({ ...o, items: o.items.filter(i => i.menuItemId !== id) })))
    setIsDirty(true)
  }

  const toggleMenuItemAvailable = (id: string) => {
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, available: !m.available } : m))
    setIsDirty(true)
  }

  // ── Order Handlers ─────────────────────────────────────────────
  const openOrderModal = (order?: ToGoOrder) => {
    if (order) {
      setEditingOrder(order)
      setOrderFamilyName(order.familyName)
      setOrderTime(order.time)
      setOrderNote(order.note || '')
      setOrderItems([...order.items])
    } else {
      setEditingOrder(null)
      setOrderFamilyName('')
      setOrderTime(timeFrom || '')
      setOrderNote('')
      setOrderItems(menuItems.filter(m => m.available).map(m => ({ menuItemId: m.id, quantity: 0 })))
    }
    setShowOrderModal(true)
  }

  const saveOrder = () => {
    if (!orderFamilyName.trim()) return
    const order: ToGoOrder = {
      id: editingOrder?.id || generateToGoId('o'),
      familyName: orderFamilyName.trim(),
      time: orderTime,
      items: orderItems.filter(i => i.quantity > 0),
      note: orderNote.trim() || undefined,
      createdAt: editingOrder?.createdAt || new Date().toISOString(),
    }
    if (editingOrder) {
      setOrders(prev => prev.map(o => o.id === order.id ? order : o))
    } else {
      setOrders(prev => [...prev, order])
    }
    setShowOrderModal(false)
    setIsDirty(true)
  }

  const deleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id))
    setIsDirty(true)
  }

  const updateOrderItemQuantity = (menuItemId: string, delta: number) => {
    setOrderItems(prev => {
      const existing = prev.find(i => i.menuItemId === menuItemId)
      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta)
        return prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity: newQty } : i)
      } else if (delta > 0) {
        return [...prev, { menuItemId, quantity: delta }]
      }
      return prev
    })
  }

  // ── CSV Import ─────────────────────────────────────────────────
  const handleCsvImportClick = () => {
    setCsvPreview([]); setCsvFile(null); setCsvFileEncoding(null)
    setCsvDetectedDelimiter(null); setCsvDelimiterWarning(null)
    setShowCsvImportModal(true)
  }

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0])
      setCsvFileEncoding(null); setCsvPreview([])
      setCsvDetectedDelimiter(null); setCsvDelimiterWarning(null)
    }
  }

  const detectCsvEncoding = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return 'utf-16le'
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return 'utf-16be'
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return 'utf-8'
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true })
      decoder.decode(buffer)
      return 'utf-8'
    } catch { return 'windows-1252' }
  }

  const detectCsvDelimiter = (text: string): string | null => {
    const firstLine = (text.split(/\r?\n/)[0] || '').trim()
    if (!firstLine) return null
    const candidates = [
      { delimiter: ';', count: (firstLine.match(/;/g) || []).length },
      { delimiter: ',', count: (firstLine.match(/,/g) || []).length },
      { delimiter: '\t', count: (firstLine.match(/\t/g) || []).length },
    ]
    const best = candidates.sort((a, b) => b.count - a.count)[0]
    return best.count > 0 ? best.delimiter : null
  }

  const normalizeMenuName = (value: string) => value.trim().toLowerCase()

  const levenshtein = (a: string, b: string) => {
    const s = a.toLowerCase(); const t = b.toLowerCase()
    const dp = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0))
    for (let i = 0; i <= s.length; i++) dp[i][0] = i
    for (let j = 0; j <= t.length; j++) dp[0][j] = j
    for (let i = 1; i <= s.length; i++) {
      for (let j = 1; j <= t.length; j++) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      }
    }
    return dp[s.length][t.length]
  }

  const suggestMenuMatches = (csvNames: string[], menuNames: string[]) => {
    const suggestions: Array<{ csvName: string; menuName: string; score: number }> = []
    for (const csvName of csvNames) {
      let best: { menuName: string; score: number } | null = null
      for (const menuName of menuNames) {
        const dist = levenshtein(csvName, menuName)
        const maxLen = Math.max(csvName.length, menuName.length) || 1
        const score = Math.round((1 - dist / maxLen) * 100)
        if (!best || score > best.score) best = { menuName, score }
      }
      if (best && best.score >= 60) suggestions.push({ csvName, menuName: best.menuName, score: best.score })
    }
    return suggestions
  }

  const buildMenuFromCsvNames = (names: string[]) => {
    return names.map(name => {
      const existing = menuItems.find(m => normalizeMenuName(m.name) === normalizeMenuName(name))
      if (existing) return { ...existing, name }
      return { id: generateToGoId('mi'), name, price: 0, available: true }
    })
  }

  const parseItemsText = (text: string, available: MenuItem[]): OrderItem[] => {
    const items: OrderItem[] = []
    const tokens = text.split(/[;,]/).map(t => t.trim()).filter(Boolean)
    for (const token of tokens) {
      const matchStart = token.match(/^(\d+)\s*x?\s*(.+)$/i)
      const matchEnd = token.match(/^(.+?)\s+(\d+)$/)
      let qty = 0; let name = ''
      if (matchStart) { qty = parseInt(matchStart[1], 10); name = matchStart[2] }
      else if (matchEnd) { qty = parseInt(matchEnd[2], 10); name = matchEnd[1] }
      if (!qty || !name) continue
      const found = available.find(m => m.name.toLowerCase() === name.trim().toLowerCase())
      if (!found) continue
      items.push({ menuItemId: found.id, quantity: qty })
    }
    return items
  }

  const parseCsvText = (text: string, menuList: MenuItem[], checkMismatch: boolean, delimiter: string) => {
    Papa.parse(text, {
      delimiter,
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rows = results.data as Record<string, any>[]
        const fields = (results.meta?.fields as string[] | undefined) || []
        const knownFields = new Set(['name', 'family', 'familie', 'familienname', 'time', 'zeit', 'uhrzeit', 'note', 'bemerkung', 'kommentar', 'items', 'bestellung'])
        const csvMenuOrder = fields.filter(f => !knownFields.has(normalizeMenuName(f)))
        const noteIndex = fields.findIndex(f => ['note', 'bemerkung', 'kommentar'].includes(normalizeMenuName(f)))
        const suggestions = suggestMenuMatches(csvMenuOrder, menuList.map(m => m.name))

        if (checkMismatch && (csvMenuOrder.length > 0 || (noteIndex >= 0 && noteIndex !== fields.length - 1))) {
          const currentNames = menuList.map(m => normalizeMenuName(m.name))
          const csvNames = csvMenuOrder.map(normalizeMenuName)
          const missingInMenu = csvMenuOrder.filter(n => !currentNames.includes(normalizeMenuName(n)))
          const missingInCsv = menuList.filter(m => !csvNames.includes(normalizeMenuName(m.name))).map(m => m.name)
          const orderMismatch = (csvNames.length === currentNames.length && csvNames.some((n, i) => n !== currentNames[i])) || (noteIndex >= 0 && noteIndex !== fields.length - 1)
          if (missingInMenu.length || missingInCsv.length || orderMismatch) {
            setMenuMismatchInfo({ missingInMenu, missingInCsv, orderMismatch, csvMenuOrder, suggestions })
            setShowMenuMismatchModal(true)
            return
          }
        }

        const parsed: ToGoOrder[] = []

        if (!fields || fields.length === 0) {
          Papa.parse(text, {
            delimiter,
            skipEmptyLines: true,
            complete: (fallback: any) => {
              const rowsArr = fallback.data as any[]
              const startIndex = rowsArr[0] && (String(rowsArr[0][0] || '').toLowerCase() === 'name') ? 1 : 0
              for (let i = startIndex; i < rowsArr.length; i++) {
                const row = rowsArr[i]
                if (!row || row.length < 1) continue
                const name = String(row[0] || '').trim()
                const time = String(row[1] || '').trim()
                const quantities = row.slice(2, 2 + menuList.length)
                const note = String(row[2 + menuList.length] || '').trim()
                const items: OrderItem[] = []
                quantities.forEach((val: any, idx: number) => {
                  const qty = parseInt(val, 10)
                  const menuItem = menuList[idx]
                  if (menuItem && qty > 0) items.push({ menuItemId: menuItem.id, quantity: qty })
                })
                if (!name) continue
                parsed.push({ id: generateToGoId('csv'), familyName: name, time, items, note: note || undefined, createdAt: new Date().toISOString() })
              }
              setCsvPreview(parsed)
            },
          })
          return
        }

        for (const row of rows) {
          const normalizedRow: Record<string, any> = {}
          Object.keys(row || {}).forEach(key => { normalizedRow[normalizeMenuName(key)] = row[key] })
          const name = String(normalizedRow.family || normalizedRow.familie || normalizedRow.name || normalizedRow.familienname || '').trim()
          if (!name) continue
          const time = String(normalizedRow.time || normalizedRow.zeit || normalizedRow.uhrzeit || '').trim()
          const note = String(normalizedRow.note || normalizedRow.bemerkung || normalizedRow.kommentar || '').trim()
          const items: OrderItem[] = []
          for (const menuItem of menuList) {
            const normalized = normalizeMenuName(menuItem.name)
            const rawValue = normalizedRow[normalized]
            if (rawValue === undefined || rawValue === null || rawValue === '') continue
            const qty = parseInt(rawValue, 10)
            if (qty > 0) items.push({ menuItemId: menuItem.id, quantity: qty })
          }
          const itemsText = String(normalizedRow.items || normalizedRow.bestellung || '').trim()
          if (itemsText) parseItemsText(itemsText, menuList).forEach(i => items.push(i))
          parsed.push({ id: generateToGoId('csv'), familyName: name, time, items, note: note || undefined, createdAt: new Date().toISOString() })
        }

        setCsvPreview(parsed)
      },
      error: (error: any) => { alert(`Fehler beim Lesen der CSV-Datei: ${error.message}`) },
    })
  }

  const parseCsvPreview = () => {
    if (!csvFile) { alert('Bitte wähle eine CSV-Datei aus'); return }
    const reader = new FileReader()
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer
      const encoding = detectCsvEncoding(arrayBuffer)
      setCsvFileEncoding(encoding)
      const decoder = new TextDecoder(encoding)
      const text = decoder.decode(arrayBuffer)
      const delimiter = detectCsvDelimiter(text) || ';'
      setCsvDetectedDelimiter(delimiter)
      if (delimiter !== ';') {
        const label = delimiter === ',' ? 'Komma (,)' : delimiter === '\t' ? 'Tabulator' : delimiter
        setCsvDelimiterWarning(`Hinweis: Erkanntes Trennzeichen ist ${label}. Der Import funktioniert, Semikolon (;) bleibt aber das bevorzugte Format.`)
      } else { setCsvDelimiterWarning(null) }
      setCsvRawText(text)
      parseCsvText(text, menuItems, true, delimiter)
    }
    reader.readAsArrayBuffer(csvFile)
  }

  const updateCsvPreviewRow = (idx: number, patch: Partial<ToGoOrder>) => {
    setCsvPreview(prev => prev.map((o, i) => i === idx ? { ...o, ...patch } : o))
  }
  const updateCsvItemQuantity = (idx: number, menuItemId: string, qty: number) => {
    setCsvPreview(prev => prev.map((o, i) => {
      if (i !== idx) return o
      const nextItems = [...o.items]
      if (qty <= 0) return { ...o, items: nextItems.filter(it => it.menuItemId !== menuItemId) }
      const existing = nextItems.find(it => it.menuItemId === menuItemId)
      if (existing) return { ...o, items: nextItems.map(it => it.menuItemId === menuItemId ? { ...it, quantity: qty } : it) }
      return { ...o, items: [...nextItems, { menuItemId, quantity: qty }] }
    }))
  }
  const removeCsvPreviewRow = (idx: number) => { setCsvPreview(prev => prev.filter((_, i) => i !== idx)) }

  const applyCsvPreview = () => {
    if (csvPreview.length === 0) { alert('Bitte zuerst "Einlesen" ausführen und Daten prüfen'); return }
    const sanitized = csvPreview
      .map(o => ({ ...o, id: o.id || generateToGoId('o'), familyName: o.familyName.trim(), items: (o.items || []).filter(i => i.quantity > 0) }))
      .filter(o => o.familyName && o.items.length > 0)
    if (!sanitized.length) { alert('Keine gueltigen Bestellungen gefunden'); return }
    setOrders(prev => [...prev, ...sanitized])
    setIsDirty(true)
    setShowCsvImportModal(false); setCsvFile(null); setCsvFileEncoding(null); setCsvPreview([])
  }

  // ── Sorted orders ──────────────────────────────────────────────
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (sortBy === 'time') {
        const tA = a.time || ''; const tB = b.time || ''
        return sortDirection === 'asc'
          ? tA.localeCompare(tB) || a.familyName.localeCompare(b.familyName)
          : tB.localeCompare(tA) || b.familyName.localeCompare(a.familyName)
      }
      return sortDirection === 'asc' ? a.familyName.localeCompare(b.familyName) : b.familyName.localeCompare(a.familyName)
    })
  }, [orders, sortBy, sortDirection])

  // ── Statistics ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + calculateOrderTotal(o, menuItems), 0)
    const itemCounts: Record<string, number> = {}
    orders.forEach(o => { o.items.forEach(i => { itemCounts[i.menuItemId] = (itemCounts[i.menuItemId] || 0) + i.quantity }) })
    return { totalOrders, totalRevenue, itemCounts }
  }, [orders, menuItems])

  // ── Export CSV ─────────────────────────────────────────────────
  const exportToCsv = useCallback(() => {
    if (sortedOrders.length === 0) return
    const headers = ['Uhrzeit', 'Name', 'Bestellung', 'Menge', 'Einzelpreise', 'Summe', 'Bemerkung']
    const rows: string[][] = []
    sortedOrders.forEach(order => {
      const total = calculateOrderTotal(order, menuItems)
      const itemsStr = order.items.map(i => { const mi = menuItems.find(m => m.id === i.menuItemId); return mi ? `${i.quantity}x ${mi.name}` : '' }).filter(Boolean).join(', ')
      const itemPricesStr = order.items.map(i => { const mi = menuItems.find(m => m.id === i.menuItemId); if (!mi) return ''; return i.quantity > 1 ? `${mi.name} (${i.quantity}x${formatPrice(mi.price)})` : `${mi.name} (${formatPrice(mi.price)})` }).filter(Boolean).join(', ')
      const qtyStr = order.items.map(i => i.quantity).reduce((a, b) => a + b, 0).toString()
      rows.push([order.time || '', order.familyName, itemsStr, qtyStr, itemPricesStr, (total / 100).toFixed(2).replace('.', ','), order.note || ''])
    })
    const csvContent = [headers.join(';'), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${eventTitle || 'togo'}-bestellungen-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [sortedOrders, menuItems, eventTitle])

  const downloadBlankCsv = useCallback(() => {
    const headers = ['Name', 'Zeit', ...menuItems.map(m => m.name), 'Bemerkung']
    const csvContent = headers.join(';') + '\n'
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${eventTitle || 'togo'}-blanko.csv`
    a.click(); URL.revokeObjectURL(url)
  }, [menuItems, eventTitle])

  const downloadExampleCsv = useCallback(() => {
    const menuNames = menuItems.length > 0 ? menuItems.map(m => m.name) : ['Speise 1', 'Speise 2']
    const headers = ['Name', 'Zeit', ...menuNames, 'Bemerkung']
    const quantities = menuNames.map((_, idx) => (idx === 0 ? '1' : '0'))
    const row = ['Mueller, Klaus', '18:30', ...quantities, 'ohne Zwiebeln']
    const csvContent = [headers.join(';'), row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${eventTitle || 'togo'}-beispiel.csv`
    a.click(); URL.revokeObjectURL(url)
  }, [menuItems, eventTitle])

  // ── Print ──────────────────────────────────────────────────────
  const printOrders = useCallback(() => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const formatDateDE = (dateStr?: string | null) => {
      if (!dateStr) return null
      let d: Date | null = null
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) d = new Date(dateStr)
      else if (/^\d{2}\.\d{2}\.\d{4}/.test(dateStr)) { const [day, month, year] = dateStr.split('.'); d = new Date(`${year}-${month}-${day}`) }
      else d = new Date(dateStr)
      if (!d || isNaN(d.getTime())) return dateStr
      return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
    }

    type Slot = { key: string; label: string; sortKey: number; orders: ToGoOrder[]; isNoTime?: boolean }
    type PageSection = { label: string; orders: ToGoOrder[]; isNoTime?: boolean }
    type Page = { sections: PageSection[] }

    const timeInterval = 15
    const slotsMap = new Map<string, Slot>()
    const noTimeOrders: ToGoOrder[] = []
    sortedOrders.forEach(order => {
      if (!order.time) { noTimeOrders.push(order); return }
      const [hours, minutes] = order.time.split(':').map(Number)
      if (Number.isNaN(hours) || Number.isNaN(minutes)) { noTimeOrders.push(order); return }
      const slotMinutes = Math.floor(minutes / timeInterval) * timeInterval
      const slotTime = `${String(hours).padStart(2, '0')}:${String(slotMinutes).padStart(2, '0')}`
      const endMinutesRaw = slotMinutes + timeInterval
      const endHours = hours + Math.floor(endMinutesRaw / 60)
      const endMinutes = endMinutesRaw % 60
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
      const label = `${slotTime} - ${endTime}`
      if (!slotsMap.has(label)) slotsMap.set(label, { key: label, label, sortKey: hours * 60 + slotMinutes, orders: [] })
      slotsMap.get(label)!.orders.push(order)
    })
    const slots = Array.from(slotsMap.values()).sort((a, b) => a.sortKey - b.sortKey)
    if (noTimeOrders.length > 0) slots.push({ key: 'no-time', label: 'Ohne Zeitangabe', sortKey: Number.POSITIVE_INFINITY, orders: noTimeOrders, isNoTime: true })

    const PAGE_HEIGHT = 980; const HEADER_HEIGHT = 110; const FOOTER_HEIGHT = 32; const SLOT_HEADER_HEIGHT = 34
    const ORDER_GAP = 8; const ORDER_BASE_HEIGHT = 32; const ORDER_ITEM_HEIGHT = 14; const ORDER_NOTE_HEIGHT = 16
    const AVAILABLE_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT
    const estimateOrderHeight = (order: ToGoOrder) => ORDER_BASE_HEIGHT + Math.max(1, order.items.length) * ORDER_ITEM_HEIGHT + (order.note ? ORDER_NOTE_HEIGHT : 0)
    const formatCompactPrice = (cents: number) => { const hasCents = cents % 100 !== 0; return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: hasCents ? 2 : 0 }) + '€' }

    const pages: Page[] = []
    let currentPage: Page = { sections: [] }
    let remainingHeight = AVAILABLE_HEIGHT
    const startNewPage = () => { if (currentPage.sections.length > 0) pages.push(currentPage); currentPage = { sections: [] }; remainingHeight = AVAILABLE_HEIGHT }
    slots.forEach(slot => {
      let index = 0; let segmentIndex = 0
      while (index < slot.orders.length) {
        const headerLabel = segmentIndex === 0 ? slot.label : `Fortsetzung (${slot.label})`
        let segmentOrders: ToGoOrder[] = []; let segmentHeight = SLOT_HEADER_HEIGHT
        while (index < slot.orders.length) {
          const order = slot.orders[index]; const orderHeight = ORDER_GAP + estimateOrderHeight(order)
          if (segmentOrders.length === 0 && segmentHeight + orderHeight > remainingHeight) { if (currentPage.sections.length > 0) { startNewPage(); segmentHeight = SLOT_HEADER_HEIGHT; continue } }
          else if (segmentOrders.length > 0 && segmentHeight + orderHeight > remainingHeight) break
          segmentHeight += orderHeight; segmentOrders.push(order); index += 1
        }
        if (segmentOrders.length === 0 && index < slot.orders.length) {
          const order = slot.orders[index]; segmentHeight += ORDER_GAP + estimateOrderHeight(order); segmentOrders.push(order); index += 1
        }
        currentPage.sections.push({ label: headerLabel, orders: segmentOrders, isNoTime: slot.isNoTime })
        remainingHeight -= segmentHeight; if (remainingHeight < 0) remainingHeight = 0; segmentIndex += 1
        if (index < slot.orders.length && remainingHeight < SLOT_HEADER_HEIGHT + ORDER_GAP + estimateOrderHeight(slot.orders[index])) startNewPage()
      }
    })
    if (currentPage.sections.length > 0) pages.push(currentPage)
    if (pages.length === 0) pages.push({ sections: [] })

    const evDate = formatDateDE(eventDate || null)
    const timeRangeRaw = timeFrom || timeTo ? `${timeFrom || ''}${timeFrom && timeTo ? ' – ' : ''}${timeTo || ''}` : ''
    const timeRange = timeRangeRaw ? `${timeRangeRaw} Uhr` : ''
    const headerMeta = [evDate, timeRange].filter(Boolean).join(' • ')
    const printedAt = new Date().toLocaleString('de-DE')
    const evName = escapeHtml(eventTitle || 'ToGo-Bestellungen')

    const renderOrder = (order: ToGoOrder) => {
      const total = calculateOrderTotal(order, menuItems)
      const familyLabel = order.time ? `${order.familyName} (${order.time} Uhr)` : order.familyName
      const itemsLine = order.items.map(item => { const mi = menuItems.find(m => m.id === item.menuItemId); if (!mi) return ''; return `${item.quantity}x ${escapeHtml(mi.name)} (${item.quantity}x${formatCompactPrice(mi.price)})` }).filter(Boolean).join(' | ')
      const noteHTML = order.note ? `<div class="togo-order-note">📝 ${escapeHtml(order.note)}</div>` : ''
      return `<div class="togo-order-card"><div class="togo-order-header"><div><div class="togo-order-name">${escapeHtml(familyLabel)}</div></div><div class="togo-order-total">${formatPrice(total)}</div></div><div class="togo-order-items">${itemsLine || '-'}</div>${noteHTML}</div>`
    }
    const renderSection = (section: PageSection) => {
      const sectionClass = section.isNoTime ? 'togo-slot togo-slot--no-time' : 'togo-slot'
      const headerClass = section.isNoTime ? 'togo-slot-header togo-slot-header--muted' : 'togo-slot-header'
      return `<section class="${sectionClass}"><div class="${headerClass}">${escapeHtml(section.label)}</div>${section.orders.map(renderOrder).join('')}</section>`
    }
    const pagesHTML = pages.map((page, pageIndex) => {
      const sectionsHTML = page.sections.length > 0 ? page.sections.map(renderSection).join('') : '<div class="togo-empty">Keine Bestellungen vorhanden.</div>'
      return `<div class="togo-print-page"><div class="togo-print-header"><div class="togo-header-main"><div class="togo-header-title-block"><h1 class="togo-header-title">${evName}</h1>${headerMeta ? `<div class="togo-header-meta">${escapeHtml(headerMeta)}</div>` : ''}</div><div class="togo-header-stats"><span class="togo-header-stat-pill"><span>Bestellungen:</span><span class="togo-header-stat-value">${stats.totalOrders}</span></span></div></div></div><div class="togo-print-body">${sectionsHTML}</div><div class="togo-print-footer"><span>Stand: ${escapeHtml(printedAt)}</span><span>Seite ${pageIndex + 1} / ${pages.length}</span></div></div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${evName} - Druckansicht</title><style>
@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#0f172a;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.togo-print-page{position:relative;width:210mm;height:297mm;margin:16px auto;padding:12mm 12mm 14mm;background:white;box-shadow:0 6px 24px rgba(15,23,42,0.15);display:flex;flex-direction:column;gap:10px;page-break-after:always;overflow:hidden}
.togo-print-page:last-child{page-break-after:auto}
.togo-print-header{display:flex;flex-direction:column;gap:6px;padding:10px 14px;border-radius:12px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0}
.togo-header-main{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.togo-header-title{margin:0;font-size:20px;font-weight:700;color:#0f172a}.togo-header-meta{font-size:12px;font-weight:600;color:#475569}
.togo-header-stats{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.togo-header-stat-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;font-size:11px;font-weight:600;color:#475569}
.togo-header-stat-value{font-size:14px;font-weight:700;color:#ea580c}
.togo-print-body{flex:1;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.togo-slot{break-inside:avoid}.togo-slot-header{padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#0f172a;background:#fff7ed;border:1px solid #fed7aa;border-left:6px solid #f97316}
.togo-slot-header--muted{background:#f1f5f9;border-color:#e2e8f0;border-left-color:#94a3b8;color:#475569}
.togo-order-card{margin-top:8px;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;background:white;break-inside:avoid}
.togo-order-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px}
.togo-order-name{font-size:12px;font-weight:700;color:#0f172a}.togo-order-total{font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap}
.togo-order-items{font-size:11px;font-weight:600;color:#475569;line-height:1.4;word-break:break-word}
.togo-order-note{margin-top:6px;font-size:10px;font-weight:600;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:6px 8px;border-radius:8px}
.togo-print-footer{margin-top:auto;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;padding-top:4px}
.togo-empty{font-size:12px;color:#94a3b8;padding:12px;border-radius:8px;border:1px dashed #e2e8f0;background:#f8fafc}
@media print{body{background:white}.togo-print-page{width:100%;height:100%;margin:0;padding:8mm 8mm 10mm;box-shadow:none}}
</style></head><body>${pagesHTML}</body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
  }, [eventTitle, eventDate, timeFrom, timeTo, sortedOrders, menuItems, stats])

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', minHeight: 400 }}>
      {/* Header Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        borderRadius: '12px 12px 0 0',
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'white' }}>🥡 {eventTitle}</h3>
          {eventDate && (
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              {eventDate} {timeFrom && `• ${timeFrom}`}{timeTo && ` - ${timeTo}`}
            </p>
          )}
        </div>
        {!readOnly && (
          <>
            <button onClick={() => openMenuModal()}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
            >⚙️ Speisekarte</button>
            <button onClick={() => setShowHelpModal(true)}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              title="Anleitung"
            >📖</button>
            <button onClick={saveData}
              style={{ background: 'white', border: 'none', color: '#f97316', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >💾 Speichern</button>
          </>
        )}
      </div>

      {/* Summary Bar */}
      <div style={{
        background: 'white', padding: '12px 20px', borderBottom: '1px solid #e2e8f0',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '16px', alignItems: 'center',
      }}>
        <div style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Bestellanzahl</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{stats.totalOrders}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {menuItems.filter(m => m.available).length === 0 ? (
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Noch keine Speisen angelegt.</span>
          ) : menuItems.filter(m => m.available).map(item => {
            const count = stats.itemCounts[item.id] || 0
            return (
              <span key={item.id} style={{ padding: '4px 8px', background: count > 0 ? '#fff7ed' : '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 999, fontSize: 12, color: count > 0 ? '#9a3412' : '#1e293b', fontWeight: 600 }}>
                {count}× {item.name} ({formatPrice(item.price)})
              </span>
            )
          })}
        </div>
        <div style={{ padding: '6px 10px', background: '#0f172a', borderRadius: 10, color: 'white', textAlign: 'right' }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>Gesamtumsatz</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatPrice(stats.totalRevenue)}</div>
        </div>
      </div>

      {/* Toolbar */}
      {!readOnly && (
        <div style={{ padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => openOrderModal()} disabled={menuItems.filter(m => m.available).length === 0}
            style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: menuItems.filter(m => m.available).length === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}
          >➕ Neue Bestellung</button>
          <button onClick={handleCsvImportClick}
            style={{ padding: '8px 14px', background: 'white', color: '#ea580c', border: '2px solid #fed7aa', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
          >📥 CSV Import</button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Sortieren:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: 'white' }}
            >
              <option value="time">Uhrzeit</option>
              <option value="name">Name</option>
            </select>
            <button onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 13 }}
            >{sortDirection === 'asc' ? '↑' : '↓'}</button>
            <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
            <button onClick={printOrders} disabled={sortedOrders.length === 0}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: sortedOrders.length > 0 ? 'white' : '#f1f5f9', cursor: sortedOrders.length > 0 ? 'pointer' : 'not-allowed', fontSize: 13, color: sortedOrders.length > 0 ? '#1e293b' : '#94a3b8' }}
              title="Drucken"
            >🖨️ Drucken</button>
            <button onClick={exportToCsv} disabled={sortedOrders.length === 0}
              style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: sortedOrders.length > 0 ? 'white' : '#f1f5f9', cursor: sortedOrders.length > 0 ? 'pointer' : 'not-allowed', fontSize: 13, color: sortedOrders.length > 0 ? '#1e293b' : '#94a3b8' }}
              title="Als CSV exportieren"
            >📥 CSV</button>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
        {sortedOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 48, margin: '0 0 16px' }}>🥡</p>
            <p style={{ fontSize: 18, color: '#64748b', margin: '0 0 8px' }}>Noch keine Bestellungen</p>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
              {menuItems.length === 0 ? 'Lege zuerst Speisen in der Speisekarte an.' : 'Klicke auf "Neue Bestellung" um zu starten.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Zeit</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Familie</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Bestellung</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Summe</th>
                {!readOnly && <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Aktionen</th>}
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map(order => {
                const total = calculateOrderTotal(order, menuItems)
                return (
                  <tr key={order.id} style={{ borderTop: '1px solid #e2e8f0', background: 'white' }}>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{order.time || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{order.familyName}</div>
                      {order.note && <div style={{ fontSize: 12, color: '#f97316', marginTop: 2 }}>📝 {order.note}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {order.items.map(item => {
                          const mi = menuItems.find(m => m.id === item.menuItemId)
                          if (!mi) return null
                          return (
                            <span key={item.menuItemId} style={{ padding: '2px 8px', background: '#e0e7ff', color: '#4f46e5', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#312e81' }}>{item.quantity}x {mi.name}</span>
                              <span style={{ fontSize: 11, color: '#4f46e5', marginLeft: 6 }}>({formatPrice(mi.price)})</span>
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{formatPrice(total)}</td>
                    {!readOnly && (
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button onClick={() => openOrderModal(order)} style={{ padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 4 }}>✏️</button>
                        <button onClick={() => deleteOrder(order.id)} style={{ padding: '4px 8px', background: '#fee2e2', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#ef4444' }}>🗑️</button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Save Toast */}
      {saveToast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', background: saveToast.type === 'success' ? '#22c55e' : '#ef4444', color: 'white', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14, fontWeight: 500, zIndex: 1000 }}>
          {saveToast.type === 'success' ? '✓' : '✗'} {saveToast.message}
        </div>
      )}

      {/* ═══ Menu Items Modal ═══ */}
      {showMenuModal && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 600, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1e293b' }}>🍽️ Speisekarte verwalten</h3>
              <button onClick={() => setShowMenuModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            {/* Add/Edit Form */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                {editingMenuItem ? 'Speise bearbeiten' : 'Neue Speise hinzufügen'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="text" placeholder="Name (z.B. Bratwurst)" value={menuItemName} onChange={e => setMenuItemName(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }} />
                <input type="text" placeholder="Preis (z.B. 4,50)" value={menuItemPrice} onChange={e => setMenuItemPrice(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }} />
                <input type="text" placeholder="Kategorie (optional)" value={menuItemCategory} onChange={e => setMenuItemCategory(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }} />
                <input type="text" placeholder="Beschreibung (optional)" value={menuItemDescription} onChange={e => setMenuItemDescription(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={saveMenuItem} disabled={!menuItemName.trim() || !menuItemPrice.trim()}
                  style={{ padding: '10px 20px', background: menuItemName.trim() && menuItemPrice.trim() ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#e2e8f0', color: menuItemName.trim() && menuItemPrice.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: 6, cursor: menuItemName.trim() && menuItemPrice.trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600 }}
                >{editingMenuItem ? 'Aktualisieren' : 'Hinzufügen'}</button>
                {editingMenuItem && (
                  <button onClick={() => { setEditingMenuItem(null); setMenuItemName(''); setMenuItemPrice(''); setMenuItemDescription(''); setMenuItemCategory('') }}
                    style={{ padding: '10px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
                  >Abbrechen</button>
                )}
              </div>
            </div>

            {/* Menu Items List */}
            <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#64748b' }}>Aktuelle Speisen ({menuItems.length})</h4>
            {menuItems.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 20 }}>Noch keine Speisen angelegt.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {menuItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: item.available ? '#f0fdf4' : '#fef2f2', borderRadius: 8, opacity: item.available ? 1 : 0.7 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>
                        {item.name}
                        {item.category && <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>{item.category}</span>}
                      </div>
                      {item.description && <div style={{ fontSize: 12, color: '#64748b' }}>{item.description}</div>}
                    </div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatPrice(item.price)}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Bestellt: {stats.itemCounts[item.id] || 0}×</div>
                    <button onClick={() => toggleMenuItemAvailable(item.id)}
                      style={{ padding: '4px 8px', background: item.available ? '#22c55e' : '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                    >{item.available ? 'Aktiv' : 'Inaktiv'}</button>
                    <button onClick={() => openMenuModal(item)} style={{ padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => deleteMenuItem(item.id)} style={{ padding: '4px 8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer' }}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ CSV Import Modal ═══ */}
      {showCsvImportModal && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 760, maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1e293b' }}>📥 Bestellungen aus CSV importieren</h3>
              <button onClick={() => setShowCsvImportModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}>
              Erwartetes Format: Spalten für Name/Familie, Zeit, Mengen pro Speise (Spaltenname = Speisename) und <strong>Bemerkung</strong> am Ende.
              <strong> Trennzeichen wird automatisch erkannt</strong> (Semikolon empfohlen).
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} style={{ flex: 1 }} />
              <button onClick={parseCsvPreview} style={{ padding: '10px 14px', background: '#f97316', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Einlesen</button>
              <button onClick={downloadExampleCsv} style={{ padding: '10px 12px', background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Beispiel-CSV</button>
            </div>
            {csvFile && <div style={{ padding: '8px 12px', background: '#fff7ed', borderRadius: 6, marginBottom: 12, color: '#9a3412', fontWeight: 600 }}>Gewählt: {csvFile.name} {csvFileEncoding && `(${csvFileEncoding})`}</div>}
            {csvDelimiterWarning && <div style={{ padding: '8px 12px', background: '#fef9c3', borderRadius: 6, marginBottom: 12, color: '#854d0e', fontWeight: 600 }}>{csvDelimiterWarning}</div>}
            {menuItems.length === 0 && <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 6, marginBottom: 12, color: '#b91c1c', fontWeight: 600 }}>Hinweis: Lege zuerst Speisen an, damit Mengen korrekt zugeordnet werden können.</div>}
            {csvPreview.length > 0 ? (
              <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, padding: 8, marginBottom: 12, background: '#f8fafc' }}>
                {csvPreview.map((row, idx) => (
                  <div key={`csv-row-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 2fr 1.2fr auto', gap: 8, alignItems: 'center', padding: 8, borderBottom: '1px solid #e2e8f0', background: row.items.length > 0 ? 'white' : '#fef9c3' }}>
                    <input value={row.familyName} onChange={e => updateCsvPreviewRow(idx, { familyName: e.target.value })} placeholder="Familienname" style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
                    <input type="time" value={row.time || ''} onChange={e => updateCsvPreviewRow(idx, { time: e.target.value })} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {menuItems.map(item => {
                        const qty = row.items.find(i => i.menuItemId === item.id)?.quantity || 0
                        return (
                          <label key={`${row.id}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, background: qty > 0 ? '#fff7ed' : '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 6px', fontSize: 11, color: '#0f172a' }}>
                            <span>{item.name}</span>
                            <input type="number" min={0} value={qty} onChange={e => updateCsvItemQuantity(idx, item.id, Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 52, padding: 4, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 11 }} />
                          </label>
                        )
                      })}
                    </div>
                    <input type="text" value={row.note || ''} placeholder="Bemerkung" onChange={e => updateCsvPreviewRow(idx, { note: e.target.value.slice(0, 80) })} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      {row.items.length === 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#854d0e' }}>0 Artikel</span>}
                      <button onClick={() => removeCsvPreviewRow(idx)} style={{ padding: '8px 10px', background: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px 12px', background: '#f1f5f9', borderRadius: 8, color: '#475569', marginBottom: 12 }}>
                Noch keine Vorschau. Datei wählen und "Einlesen" klicken.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 }}>
              <span style={{ fontSize: 13, color: '#475569' }}>{csvPreview.length} Zeilen bereit</span>
              <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowCsvImportModal(false); setCsvFile(null); setCsvFileEncoding(null); setCsvPreview([]) }}
                  style={{ padding: '10px 14px', background: 'white', color: '#f97316', border: '2px solid #fed7aa', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >Abbrechen</button>
                <button onClick={applyCsvPreview} disabled={csvPreview.length === 0}
                  style={{ padding: '10px 16px', background: csvPreview.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', border: 'none', borderRadius: 6, cursor: csvPreview.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, minWidth: 160 }}
                >In Liste übernehmen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Menu Mismatch Modal ═══ */}
      {showMenuMismatchModal && menuMismatchInfo && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 640, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: '#1e293b' }}>⚠️ Speisekarte & CSV weichen ab</h3>
            <div style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
              Die CSV enthält Speisen-Spalten, die nicht (oder in anderer Reihenfolge) in der Speisekarte stehen.
            </div>
            <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
              {menuMismatchInfo.missingInMenu.length > 0 && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '10px 12px', borderRadius: 8, color: '#9a3412' }}>
                  <strong>In CSV, aber nicht in Speisekarte:</strong> {menuMismatchInfo.missingInMenu.join(', ')}
                </div>
              )}
              {menuMismatchInfo.missingInCsv.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: 8, color: '#334155' }}>
                  <strong>In Speisekarte, aber nicht in CSV:</strong> {menuMismatchInfo.missingInCsv.join(', ')}
                </div>
              )}
              {menuMismatchInfo.suggestions.length > 0 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 12px', borderRadius: 8, color: '#1e3a8a' }}>
                  <strong>Vorgeschlagene Zuordnung:</strong>
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    {menuMismatchInfo.suggestions.map(s => <div key={`${s.csvName}-${s.menuName}`}>{s.csvName} → {s.menuName} ({s.score}%)</div>)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowMenuMismatchModal(false); setMenuMismatchInfo(null) }}
                style={{ padding: '10px 14px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >Abbrechen</button>
              <button onClick={() => { setShowMenuMismatchModal(false); setMenuMismatchInfo(null); if (csvRawText) parseCsvText(csvRawText, menuItems, false, csvDetectedDelimiter || ';') }}
                style={{ padding: '10px 14px', background: 'white', color: '#ea580c', border: '2px solid #fed7aa', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
              >Ohne Anpassung fortfahren</button>
              <button onClick={() => {
                if (!menuMismatchInfo.csvMenuOrder.length) return
                const nextMenu = buildMenuFromCsvNames(menuMismatchInfo.csvMenuOrder)
                setMenuItems(nextMenu)
                setShowMenuMismatchModal(false); setMenuMismatchInfo(null)
                if (csvRawText) parseCsvText(csvRawText, nextMenu, false, csvDetectedDelimiter || ';')
              }}
                style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
              >Speisekarte anpassen</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Help Modal ═══ */}
      {showHelpModal && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 720, maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1e293b' }}>📖 Anleitung: Speiseplanung</h3>
              <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 6 }}>1. Speisekarte anlegen</div>
                <div style={{ color: '#1e293b', fontSize: 14 }}>Über <strong>⚙️ Speisekarte</strong> Speisen mit Preis anlegen.</div>
              </div>
              <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 6 }}>2. Bestellungen erfassen</div>
                <div style={{ color: '#1e293b', fontSize: 14 }}>Bestellungen manuell über <strong>Neue Bestellung</strong> oder per CSV-Import erfassen.</div>
              </div>
              <div style={{ padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#9a3412', fontWeight: 700, marginBottom: 6 }}>3. CSV-Import (optional)</div>
                <div style={{ color: '#7c2d12', fontSize: 14, marginBottom: 8 }}>
                  CSV mit Spalten: <strong>Name</strong>, <strong>Zeit</strong>, Mengen pro Speise, <strong>Bemerkung</strong>.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={downloadBlankCsv} style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>📥 Blanko-CSV</button>
                  <button onClick={downloadExampleCsv} style={{ padding: '10px 14px', background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>📥 Beispiel-CSV</button>
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 6 }}>4. Drucken & Export</div>
                <div style={{ color: '#1e293b', fontSize: 14 }}>Liste drucken oder als CSV exportieren.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Order Modal ═══ */}
      {showOrderModal && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 500, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1e293b' }}>
                {editingOrder ? '✏️ Bestellung bearbeiten' : '➕ Neue Bestellung'}
              </h3>
              <button onClick={() => setShowOrderModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <input type="text" placeholder="Familienname" value={orderFamilyName} onChange={e => setOrderFamilyName(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <input type="time" value={orderTime} onChange={e => setOrderTime(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, width: 140 }} />
                <input type="text" placeholder="Bemerkung (optional)" value={orderNote} onChange={e => setOrderNote(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }} />
              </div>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#64748b' }}>Bestellung</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {menuItems.filter(m => m.available).map(item => {
                    const orderItem = orderItems.find(i => i.menuItemId === item.id)
                    const qty = orderItem?.quantity || 0
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'white', borderRadius: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{formatPrice(item.price)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => updateOrderItemQuantity(item.id, -1)} disabled={qty === 0}
                            style={{ width: 32, height: 32, border: '1px solid #e2e8f0', borderRadius: 6, background: qty === 0 ? '#f1f5f9' : 'white', cursor: qty === 0 ? 'not-allowed' : 'pointer', fontSize: 16, color: qty === 0 ? '#cbd5e1' : '#1e293b' }}
                          >−</button>
                          <span style={{ width: 32, textAlign: 'center', fontWeight: 600, fontSize: 16 }}>{qty}</span>
                          <button onClick={() => updateOrderItemQuantity(item.id, 1)}
                            style={{ width: 32, height: 32, border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 16, color: '#1e293b' }}
                          >+</button>
                        </div>
                        <div style={{ width: 80, textAlign: 'right', fontWeight: 500, color: qty > 0 ? '#1e293b' : '#cbd5e1' }}>{formatPrice(item.price * qty)}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '2px solid #e2e8f0' }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Gesamt:</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#f97316' }}>
                    {formatPrice(orderItems.reduce((sum, i) => { const item = menuItems.find(m => m.id === i.menuItemId); return sum + (item ? item.price * i.quantity : 0) }, 0))}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={saveOrder} disabled={!orderFamilyName.trim() || orderItems.filter(i => i.quantity > 0).length === 0}
                  style={{ flex: 1, padding: '12px 24px', background: orderFamilyName.trim() && orderItems.some(i => i.quantity > 0) ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#e2e8f0', color: orderFamilyName.trim() && orderItems.some(i => i.quantity > 0) ? 'white' : '#94a3b8', border: 'none', borderRadius: 8, cursor: orderFamilyName.trim() && orderItems.some(i => i.quantity > 0) ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600 }}
                >{editingOrder ? 'Aktualisieren' : 'Bestellung aufnehmen'}</button>
                <button onClick={() => setShowOrderModal(false)}
                  style={{ padding: '12px 24px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                >Abbrechen</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
