// ============================================================================
// ToGo Event Component - Handles ToGo/Takeaway orders without table placement
// ============================================================================
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import userStorage from '../../utils/userStorage'
import { syncUserData } from '../../utils/sync'
import Papa from 'papaparse'
import type { MenuItem, ToGoOrder, ToGoEventConfig, OrderItem } from '../../types/togo'
import { calculateOrderTotal, formatPrice, generateToGoId } from '../../types/togo'
import { formatDateLong } from '../../utils/dateFormatting'
import { usePageHeader } from '../layout/PageHeaderContext'
import ReservationConfigPanel from '../reservation/ReservationConfigPanel'

// ============================================================================
// CONSTANTS
// ============================================================================
const EVENTS_KEY = 'events'
const CURRENT_EVENT_KEY = 'currentEvent'

type EventItem = {
  id: string
  name: string
  eventDate?: string
  from?: string
  to?: string
  isToGo?: boolean
  toGoConfig?: ToGoEventConfig
  createdAt?: string
  lastModified?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ToGo() {
  const navigate = useNavigate()
  const auth = useAuth()
  const userId = auth.user ? auth.user.id : null

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  const [event, setEvent] = useState<EventItem | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [orders, setOrders] = useState<ToGoOrder[]>([])
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
  const [showReservationPanel, setShowReservationPanel] = useState(false)
  
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

  // --------------------------------------------------------------------------
  // LOAD EVENT
  // --------------------------------------------------------------------------

  // ── Page header (title + reservation button) ────────────────────────────
  const { setPageTitle, setHeaderContent } = usePageHeader()
  useEffect(() => {
    setPageTitle('ToGo Bestellungen', '🥡')
    return () => { setPageTitle(null); setHeaderContent(null) }
  }, [setPageTitle, setHeaderContent])

  useEffect(() => {
    if (!event) return
    setHeaderContent(
      <button
        onClick={() => setShowReservationPanel(true)}
        title="Reservierungsseite verwalten"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px 16px', borderRadius: '999px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08))',
          border: '1px solid rgba(255,255,255,0.6)', color: 'white',
          fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', whiteSpace: 'nowrap'
        }}
      >
        🎟️ Reservierung
      </button>
    )
  }, [event, setHeaderContent])

  // --------------------------------------------------------------------------
  // LOAD EVENT (from storage)
  useEffect(() => {
    const raw = userStorage.getItem(CURRENT_EVENT_KEY, userId)
    if (raw) {
      try {
        const ev = JSON.parse(raw as string) as EventItem
        if (ev.isToGo) {
          setEvent(ev)
          setMenuItems(ev.toGoConfig?.menuItems || [])
          setOrders(ev.toGoConfig?.orders || [])
        } else {
          // Not a ToGo event, redirect
          navigate('/app')
        }
      } catch (e) {
        console.error('Failed to load ToGo event:', e)
      }
    }
  }, [userId, navigate])

  // --------------------------------------------------------------------------
  // AUTO-SAVE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!event || !isDirty) return
    
    const timer = setTimeout(() => {
      saveEvent()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [menuItems, orders, isDirty])

  const saveEvent = useCallback(async () => {
    if (!event) return
    
    const updatedEvent: EventItem = {
      ...event,
      toGoConfig: { menuItems, orders },
      lastModified: new Date().toISOString()
    }
    
    // Update current event
    userStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(updatedEvent), userId)
    
    // Update in events list
    const rawEvents = userStorage.getItem(EVENTS_KEY, userId) || '[]'
    const allEvents = JSON.parse(rawEvents as string) as EventItem[]
    const idx = allEvents.findIndex(e => e.id === event.id)
    if (idx >= 0) {
      allEvents[idx] = updatedEvent
    } else {
      allEvents.push(updatedEvent)
    }
    userStorage.setItem(EVENTS_KEY, JSON.stringify(allEvents), userId)
    
    // Sync to server
    try {
      if (userId) {
        await syncUserData(auth.token, userId)
      }
    } catch (e: any) {
      console.error('Sync failed:', e)
      setSaveToast({ type: 'error', message: e?.message || 'Speichern fehlgeschlagen' })
      setTimeout(() => setSaveToast(null), 2000)
      return
    }
    
    setEvent(updatedEvent)
    setIsDirty(false)
    setSaveToast({ type: 'success', message: 'Gespeichert' })
    setTimeout(() => setSaveToast(null), 2000)
  }, [event, menuItems, orders, userId, auth.token])

  // --------------------------------------------------------------------------
  // MENU ITEM HANDLERS
  // --------------------------------------------------------------------------
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
      available: editingMenuItem?.available ?? true
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
    // Also remove from all orders
    setOrders(prev => prev.map(o => ({
      ...o,
      items: o.items.filter(i => i.menuItemId !== id)
    })))
    setIsDirty(true)
  }

  const toggleMenuItemAvailable = (id: string) => {
    setMenuItems(prev => prev.map(m => 
      m.id === id ? { ...m, available: !m.available } : m
    ))
    setIsDirty(true)
  }

  // --------------------------------------------------------------------------
  // ORDER HANDLERS
  // --------------------------------------------------------------------------
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
      setOrderTime(event?.from || '')
      setOrderNote('')
      // Initialize with 0 quantity for each menu item
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
      createdAt: editingOrder?.createdAt || new Date().toISOString()
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

  // --------------------------------------------------------------------------
  // CSV IMPORT HANDLERS
  // --------------------------------------------------------------------------
  const handleCsvImportClick = () => {
    setCsvPreview([])
    setCsvFile(null)
    setCsvFileEncoding(null)
    setCsvDetectedDelimiter(null)
    setCsvDelimiterWarning(null)
    setShowCsvImportModal(true)
  }

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0])
      setCsvFileEncoding(null)
      setCsvPreview([])
      setCsvDetectedDelimiter(null)
      setCsvDelimiterWarning(null)
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
    } catch {
      return 'windows-1252'
    }
  }

  const detectCsvDelimiter = (text: string): string | null => {
    const firstLine = (text.split(/\r?\n/)[0] || '').trim()
    if (!firstLine) return null
    const candidates: Array<{ delimiter: string; count: number }> = [
      { delimiter: ';', count: (firstLine.match(/;/g) || []).length },
      { delimiter: ',', count: (firstLine.match(/,/g) || []).length },
      { delimiter: '\t', count: (firstLine.match(/\t/g) || []).length }
    ]
    const best = candidates.sort((a, b) => b.count - a.count)[0]
    return best.count > 0 ? best.delimiter : null
  }

  const parseItemsText = (text: string, available: MenuItem[]): OrderItem[] => {
    const items: OrderItem[] = []
    const tokens = text.split(/[;,]/).map(t => t.trim()).filter(Boolean)
    for (const token of tokens) {
      const matchStart = token.match(/^(\d+)\s*x?\s*(.+)$/i)
      const matchEnd = token.match(/^(.+?)\s+(\d+)$/)
      let qty = 0
      let name = ''
      if (matchStart) {
        qty = parseInt(matchStart[1], 10)
        name = matchStart[2]
      } else if (matchEnd) {
        qty = parseInt(matchEnd[2], 10)
        name = matchEnd[1]
      }
      if (!qty || !name) continue
      const found = available.find(m => m.name.toLowerCase() === name.trim().toLowerCase())
      if (!found) continue
      items.push({ menuItemId: found.id, quantity: qty })
    }
    return items
  }

  const normalizeMenuName = (value: string) => value.trim().toLowerCase()


  const levenshtein = (a: string, b: string) => {
    const s = a.toLowerCase()
    const t = b.toLowerCase()
    const dp = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0))
    for (let i = 0; i <= s.length; i++) dp[i][0] = i
    for (let j = 0; j <= t.length; j++) dp[0][j] = j
    for (let i = 1; i <= s.length; i++) {
      for (let j = 1; j <= t.length; j++) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        )
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
      if (best && best.score >= 60) {
        suggestions.push({ csvName, menuName: best.menuName, score: best.score })
      }
    }
    return suggestions
  }

  const buildMenuFromCsvNames = (names: string[]) => {
    return names.map(name => {
      const existing = menuItems.find(m => normalizeMenuName(m.name) === normalizeMenuName(name))
      if (existing) {
        return { ...existing, name }
      }
      return {
        id: generateToGoId('mi'),
        name,
        price: 0,
        available: true
      }
    })
  }

  const parseCsvText = (text: string, menuList: MenuItem[], checkMismatch: boolean, delimiter: string) => {
    Papa.parse(text, {
      delimiter,
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rows = results.data as Record<string, any>[]
        const fields = (results.meta?.fields as string[] | undefined) || []
        const knownFields = new Set([
          'name', 'family', 'familie', 'familienname',
          'time', 'zeit', 'uhrzeit',
          'note', 'bemerkung', 'kommentar',
          'items', 'bestellung'
        ])
        const csvMenuOrder = fields.filter(f => !knownFields.has(normalizeMenuName(f)))
        const noteIndex = fields.findIndex(f => ['note', 'bemerkung', 'kommentar'].includes(normalizeMenuName(f)))

        const suggestions = suggestMenuMatches(csvMenuOrder, menuList.map(m => m.name))

        if (checkMismatch && (csvMenuOrder.length > 0 || (noteIndex >= 0 && noteIndex !== fields.length - 1))) {
          const currentNames = menuList.map(m => normalizeMenuName(m.name))
          const csvNames = csvMenuOrder.map(normalizeMenuName)
          const missingInMenu = csvMenuOrder.filter(n => !currentNames.includes(normalizeMenuName(n)))
          const missingInCsv = menuList
            .filter(m => !csvNames.includes(normalizeMenuName(m.name)))
            .map(m => m.name)
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
                if (checkMismatch && menuList.length > 0) {
                  setMenuMismatchInfo({
                    missingInMenu: [],
                    missingInCsv: [],
                    orderMismatch: true,
                    csvMenuOrder: menuList.map(m => m.name),
                    suggestions: []
                  })
                  setShowMenuMismatchModal(true)
                  return
                }
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
                parsed.push({
                  id: generateToGoId('csv'),
                  familyName: name,
                  time,
                  items,
                  note: note || undefined,
                  createdAt: new Date().toISOString()
                })
              }
              setCsvPreview(parsed)
            }
          })
          return
        }

        for (const row of rows) {
          const normalizedRow: Record<string, any> = {}
          Object.keys(row || {}).forEach(key => {
            normalizedRow[normalizeMenuName(key)] = row[key]
          })

          const name = String(
            normalizedRow.family ||
            normalizedRow.familie ||
            normalizedRow.name ||
            normalizedRow.familienname ||
            ''
          ).trim()
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
          if (itemsText) {
            parseItemsText(itemsText, menuList).forEach(i => items.push(i))
          }

          parsed.push({
            id: generateToGoId('csv'),
            familyName: name,
            time,
            items,
            note: note || undefined,
            createdAt: new Date().toISOString()
          })
        }

        if (menuList.length === 0 && parsed.some(p => p.items.length === 0)) {
          alert('Es wurden keine Speisen gefunden. Bitte zuerst Speisen anlegen oder CSV-Spalten passend benennen.')
        }
        if (parsed.length === 0) {
          alert('Keine gueltigen Bestellungen in der CSV gefunden. Pruefe Semikolon-Trennung und ob die Speisen-Spalten exakt den Speisenamen entsprechen.')
        }
        setCsvPreview(parsed)
      },
      error: (error: any) => {
        alert(`Fehler beim Lesen der CSV-Datei: ${error.message}`)
      }
    })
  }

  const parseCsvPreview = () => {
    if (!csvFile) {
      alert('Bitte wähle eine CSV-Datei aus')
      return
    }

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
        const delimiterLabel = delimiter === ',' ? 'Komma (,)' : delimiter === '\t' ? 'Tabulator' : delimiter
        setCsvDelimiterWarning(`Hinweis: Erkanntes Trennzeichen ist ${delimiterLabel}. Der Import funktioniert, Semikolon (;) bleibt aber das bevorzugte Format.`)
      } else {
        setCsvDelimiterWarning(null)
      }
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
      const existing = nextItems.find(it => it.menuItemId === menuItemId)
      if (qty <= 0) {
        return { ...o, items: nextItems.filter(it => it.menuItemId !== menuItemId) }
      }
      if (existing) {
        return { ...o, items: nextItems.map(it => it.menuItemId === menuItemId ? { ...it, quantity: qty } : it) }
      }
      return { ...o, items: [...nextItems, { menuItemId, quantity: qty }] }
    }))
  }

  const removeCsvPreviewRow = (idx: number) => {
    setCsvPreview(prev => prev.filter((_, i) => i !== idx))
  }

  const applyCsvPreview = () => {
    if (csvPreview.length === 0) {
      alert('Bitte zuerst "Einlesen" ausführen und Daten prüfen')
      return
    }

    const sanitized = csvPreview
      .map(o => ({
        ...o,
        id: o.id || generateToGoId('o'),
        familyName: o.familyName.trim(),
        items: (o.items || []).filter(i => i.quantity > 0)
      }))
      .filter(o => o.familyName && o.items.length > 0)

    if (!sanitized.length) {
      alert('Keine gueltigen Bestellungen gefunden')
      return
    }

    setOrders(prev => [...prev, ...sanitized])
    setIsDirty(true)
    setShowCsvImportModal(false)
    setCsvFile(null)
    setCsvFileEncoding(null)
    setCsvPreview([])
  }

  // --------------------------------------------------------------------------
  // SORTED ORDERS
  // --------------------------------------------------------------------------
  const sortedOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      if (sortBy === 'time') {
        const timeA = a.time || ''
        const timeB = b.time || ''
        return sortDirection === 'asc' 
          ? timeA.localeCompare(timeB) || a.familyName.localeCompare(b.familyName)
          : timeB.localeCompare(timeA) || b.familyName.localeCompare(a.familyName)
      } else {
        return sortDirection === 'asc'
          ? a.familyName.localeCompare(b.familyName)
          : b.familyName.localeCompare(a.familyName)
      }
    })
    return sorted
  }, [orders, sortBy, sortDirection])

  // --------------------------------------------------------------------------
  // STATISTICS
  // --------------------------------------------------------------------------
  const stats = useMemo(() => {
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + calculateOrderTotal(o, menuItems), 0)
    
    // Item quantities
    const itemCounts: Record<string, number> = {}
    orders.forEach(o => {
      o.items.forEach(i => {
        itemCounts[i.menuItemId] = (itemCounts[i.menuItemId] || 0) + i.quantity
      })
    })
    
    return { totalOrders, totalRevenue, itemCounts }
  }, [orders, menuItems])

  // --------------------------------------------------------------------------
  // EXPORT & PRINT
  // --------------------------------------------------------------------------
  const exportToCsv = useCallback(() => {
    if (sortedOrders.length === 0) return
    
    const headers = ['Uhrzeit', 'Name', 'Bestellung', 'Menge', 'Einzelpreise', 'Summe', 'Bemerkung']
    const rows: string[][] = []
    
    sortedOrders.forEach(order => {
      const total = calculateOrderTotal(order, menuItems)
      const itemsStr = order.items.map(i => {
        const mi = menuItems.find(m => m.id === i.menuItemId)
        return mi ? `${i.quantity}x ${mi.name}` : ''
      }).filter(Boolean).join(', ')

      const itemPricesStr = order.items.map(i => {
        const mi = menuItems.find(m => m.id === i.menuItemId)
        if (!mi) return ''
        return i.quantity > 1 ? `${mi.name} (${i.quantity}x${formatPrice(mi.price)})` : `${mi.name} (${formatPrice(mi.price)})`
      }).filter(Boolean).join(', ')
      
      const qtyStr = order.items.map(i => i.quantity).reduce((a, b) => a + b, 0).toString()
      
      rows.push([
        order.time || '',
        order.familyName,
        itemsStr,
        qtyStr,
        itemPricesStr,
        (total / 100).toFixed(2).replace('.', ','),
        order.note || ''
      ])
    })
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(';'))
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event?.name || 'togo'}-bestellungen-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [sortedOrders, menuItems, event])

  const downloadBlankCsv = useCallback(() => {
    const headers = ['Name', 'Zeit', ...menuItems.map(m => m.name), 'Bemerkung']
    const csvContent = headers.join(';') + '\n'
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event?.name || 'togo'}-blanko.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [menuItems, event])

  const downloadExampleCsv = useCallback(() => {
    const menuNames = menuItems.length > 0 ? menuItems.map(m => m.name) : ['Speise 1', 'Speise 2']
    const headers = ['Name', 'Zeit', ...menuNames, 'Bemerkung']
    const quantities = menuNames.map((_, idx) => (idx === 0 ? '1' : '0'))
    const row = ['Mueller, Klaus', '18:30', ...quantities, 'ohne Zwiebeln']
    const csvContent = [headers.join(';'), row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event?.name || 'togo'}-beispiel.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [menuItems, event])

  const printOrders = useCallback(() => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const escapeHtml = (value: string) => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    type Slot = {
      key: string
      label: string
      sortKey: number
      orders: ToGoOrder[]
      isNoTime?: boolean
    }

    const timeInterval = 15
    const slotsMap = new Map<string, Slot>()
    const noTimeOrders: ToGoOrder[] = []

    sortedOrders.forEach(order => {
      if (!order.time) {
        noTimeOrders.push(order)
        return
      }
      const [hours, minutes] = order.time.split(':').map(Number)
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        noTimeOrders.push(order)
        return
      }
      const slotMinutes = Math.floor(minutes / timeInterval) * timeInterval
      const slotTime = `${String(hours).padStart(2, '0')}:${String(slotMinutes).padStart(2, '0')}`
      const endMinutesRaw = slotMinutes + timeInterval
      const endHours = hours + Math.floor(endMinutesRaw / 60)
      const endMinutes = endMinutesRaw % 60
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
      const label = `${slotTime} - ${endTime}`
      const key = label
      const sortKey = hours * 60 + slotMinutes
      if (!slotsMap.has(key)) {
        slotsMap.set(key, { key, label, sortKey, orders: [] })
      }
      slotsMap.get(key)!.orders.push(order)
    })

    const slots = Array.from(slotsMap.values()).sort((a, b) => a.sortKey - b.sortKey)
    if (noTimeOrders.length > 0) {
      slots.push({
        key: 'no-time',
        label: 'Ohne Zeitangabe',
        sortKey: Number.POSITIVE_INFINITY,
        orders: noTimeOrders,
        isNoTime: true
      })
    }

    const PAGE_HEIGHT = 980
    const HEADER_HEIGHT = 110
    const FOOTER_HEIGHT = 32
    const SLOT_HEADER_HEIGHT = 34
    const ORDER_GAP = 8
    const ORDER_BASE_HEIGHT = 32
    const ORDER_ITEM_HEIGHT = 14
    const ORDER_NOTE_HEIGHT = 16
    const AVAILABLE_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT

    const estimateOrderHeight = (order: ToGoOrder) => {
      const itemLines = Math.max(1, order.items.length)
      const noteHeight = order.note ? ORDER_NOTE_HEIGHT : 0
      return ORDER_BASE_HEIGHT + itemLines * ORDER_ITEM_HEIGHT + noteHeight
    }

    const formatCompactPrice = (cents: number) => {
      const hasCents = cents % 100 !== 0
      return (cents / 100).toLocaleString('de-DE', {
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0
      }) + '€'
    }

    type PageSection = { label: string; orders: ToGoOrder[]; isNoTime?: boolean }
    type Page = { sections: PageSection[] }

    const pages: Page[] = []
    let currentPage: Page = { sections: [] }
    let remainingHeight = AVAILABLE_HEIGHT

    const startNewPage = () => {
      if (currentPage.sections.length > 0) pages.push(currentPage)
      currentPage = { sections: [] }
      remainingHeight = AVAILABLE_HEIGHT
    }

    slots.forEach(slot => {
      let index = 0
      let segmentIndex = 0
      while (index < slot.orders.length) {
        const headerLabel = segmentIndex === 0 ? slot.label : `Fortsetzung (${slot.label})`
        let segmentOrders: ToGoOrder[] = []
        let segmentHeight = SLOT_HEADER_HEIGHT

        while (index < slot.orders.length) {
          const order = slot.orders[index]
          const orderHeight = ORDER_GAP + estimateOrderHeight(order)

          if (segmentOrders.length === 0 && segmentHeight + orderHeight > remainingHeight) {
            if (currentPage.sections.length > 0) {
              startNewPage()
              segmentHeight = SLOT_HEADER_HEIGHT
              continue
            }
          } else if (segmentOrders.length > 0 && segmentHeight + orderHeight > remainingHeight) {
            break
          }

          segmentHeight += orderHeight
          segmentOrders.push(order)
          index += 1
        }

        if (segmentOrders.length === 0 && index < slot.orders.length) {
          const order = slot.orders[index]
          const forcedHeight = ORDER_GAP + estimateOrderHeight(order)
          segmentHeight += forcedHeight
          segmentOrders.push(order)
          index += 1
        }

        currentPage.sections.push({ label: headerLabel, orders: segmentOrders, isNoTime: slot.isNoTime })
        remainingHeight -= segmentHeight
        if (remainingHeight < 0) remainingHeight = 0
        segmentIndex += 1

        if (index < slot.orders.length && remainingHeight < SLOT_HEADER_HEIGHT + ORDER_GAP + estimateOrderHeight(slot.orders[index])) {
          startNewPage()
        }
      }
    })

    if (currentPage.sections.length > 0) pages.push(currentPage)
    if (pages.length === 0) pages.push({ sections: [] })

    const eventDate = formatDateLong(event?.eventDate || null)
    const timeRangeRaw = event?.from || event?.to ? `${event?.from || ''}${event?.from && event?.to ? ' – ' : ''}${event?.to || ''}` : ''
    const timeRange = timeRangeRaw ? `${timeRangeRaw} Uhr` : ''
    const headerMeta = [eventDate, timeRange].filter(Boolean).join(' • ')
    const printedAt = new Date().toLocaleString('de-DE')
    const eventName = escapeHtml(event?.name || 'ToGo-Bestellungen')

    const renderOrder = (order: ToGoOrder) => {
      const total = calculateOrderTotal(order, menuItems)
      const familyLabel = order.time
        ? `${order.familyName} (${order.time} Uhr)`
        : order.familyName
      const itemsLine = order.items
        .map(item => {
          const menuItem = menuItems.find(m => m.id === item.menuItemId)
          if (!menuItem) return ''
          return `${item.quantity}x ${escapeHtml(menuItem.name)} (${item.quantity}x${formatCompactPrice(menuItem.price)})`
        })
        .filter(Boolean)
        .join(' | ')

      const noteHTML = order.note
        ? `<div class="togo-order-note">📝 ${escapeHtml(order.note)}</div>`
        : ''

      return `
        <div class="togo-order-card">
          <div class="togo-order-header">
            <div>
              <div class="togo-order-name">${escapeHtml(familyLabel)}</div>
            </div>
            <div class="togo-order-total">${formatPrice(total)}</div>
          </div>
          <div class="togo-order-items">${itemsLine || '-'}</div>
          ${noteHTML}
        </div>
      `
    }

    const renderSection = (section: PageSection) => {
      const sectionClass = section.isNoTime ? 'togo-slot togo-slot--no-time' : 'togo-slot'
      const headerClass = section.isNoTime ? 'togo-slot-header togo-slot-header--muted' : 'togo-slot-header'
      return `
        <section class="${sectionClass}">
          <div class="${headerClass}">${escapeHtml(section.label)}</div>
          ${section.orders.map(renderOrder).join('')}
        </section>
      `
    }

    const pagesHTML = pages.map((page, pageIndex) => {
      const sectionsHTML = page.sections.length > 0
        ? page.sections.map(renderSection).join('')
        : `<div class="togo-empty">Keine Bestellungen vorhanden.</div>`
      return `
        <div class="togo-print-page">
          <div class="togo-print-header">
            <div class="togo-header-main">
              <div class="togo-header-title-block">
                <h1 class="togo-header-title">${eventName}</h1>
                ${headerMeta ? `<div class="togo-header-meta">${escapeHtml(headerMeta)}</div>` : ''}
              </div>
              <div class="togo-header-stats">
                <span class="togo-header-stat-pill">
                  <span>Bestellungen:</span>
                  <span class="togo-header-stat-value">${stats.totalOrders}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="togo-print-body">${sectionsHTML}</div>
          <div class="togo-print-footer">
            <span>Stand: ${escapeHtml(printedAt)}</span>
            <span>Seite ${pageIndex + 1} / ${pages.length}</span>
          </div>
        </div>
      `
    }).join('')

    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventName} - Druckansicht</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #f1f5f9;
      color: #0f172a;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .togo-print-page {
      position: relative;
      width: 210mm;
      height: 297mm;
      margin: 16px auto;
      padding: 12mm 12mm 14mm;
      background: white;
      box-shadow: 0 6px 24px rgba(15,23,42,0.15);
      display: flex;
      flex-direction: column;
      gap: 10px;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }

    .togo-print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .togo-print-header {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 14px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
    }

    .togo-header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .togo-header-title-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .togo-header-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.2px;
    }

    .togo-header-meta {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }

    .togo-header-stats {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .togo-header-stat-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }

    .togo-header-stat-value {
      font-size: 14px;
      font-weight: 700;
      color: #ea580c;
    }

    .togo-print-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
    }

    .togo-slot {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .togo-slot-header {
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #0f172a;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-left: 6px solid #f97316;
    }

    .togo-slot-header--muted {
      background: #f1f5f9;
      border-color: #e2e8f0;
      border-left-color: #94a3b8;
      color: #475569;
    }

    .togo-order-card {
      margin-top: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: white;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .togo-order-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }

    .togo-order-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

    .togo-order-total {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
    }

    .togo-order-items {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      line-height: 1.4;
      word-break: break-word;
    }

    .togo-order-note {
      margin-top: 6px;
      font-size: 10px;
      font-weight: 600;
      color: #b45309;
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 6px 8px;
      border-radius: 8px;
    }

    .togo-print-footer {
      margin-top: auto;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding-top: 4px;
    }

    .togo-print-footer span {
      font-weight: 500;
    }

    .togo-empty {
      font-size: 12px;
      color: #94a3b8;
      padding: 12px;
      border-radius: 8px;
      border: 1px dashed #e2e8f0;
      background: #f8fafc;
    }

    @media print {
      body {
        background: white;
      }

      .togo-print-page {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 8mm 8mm 10mm;
        box-shadow: none;
        page-break-after: always;
        break-after: page;
      }

      .togo-print-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  </style>
</head>
<body>
  ${pagesHTML}
</body>
</html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }, [event, sortedOrders, menuItems, stats])

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  if (!event) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <p style={{ color: '#64748b' }}>Laden...</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
        padding: '16px 24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button 
          onClick={() => navigate('/app')}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
        >←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0', fontSize: '20px', fontWeight: '600', color: 'white' }}>
            🥡 {event.name}
          </h1>
          {event.eventDate && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
              {event.eventDate} {event.from && `• ${event.from}`}{event.to && ` - ${event.to}`}
            </p>
          )}
        </div>
        <button 
          onClick={() => openMenuModal()}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
        >⚙️ Speisekarte</button>
        <button 
          onClick={() => setShowHelpModal(true)}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          title="Anleitung"
        >📖</button>
        <button 
          onClick={saveEvent}
          style={{ background: 'white', border: 'none', color: '#f97316', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
        >💾 Speichern</button>
      </div>

      {/* Summary Bar */}
      <div style={{ 
        background: 'white', 
        padding: '14px 24px', 
        borderBottom: '1px solid #e2e8f0',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: '16px',
        alignItems: 'center'
      }}>
        <div style={{
          padding: '8px 12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Bestellanzahl</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{stats.totalOrders}</div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {menuItems.filter(m => m.available).length === 0 ? (
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Noch keine Speisen angelegt.</span>
          ) : (
            menuItems.filter(m => m.available).map(item => {
              const count = stats.itemCounts[item.id] || 0
              return (
                <span key={item.id} style={{
                  padding: '6px 10px',
                  background: count > 0 ? '#fff7ed' : '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '999px',
                  fontSize: '12px',
                  color: count > 0 ? '#9a3412' : '#1e293b',
                  fontWeight: '600'
                }}>
                  {count}× {item.name} ({formatPrice(item.price)})
                </span>
              )
            })
          )}
        </div>

        <div style={{
          padding: '8px 12px',
          background: '#0f172a',
          borderRadius: '10px',
          color: 'white',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', fontWeight: '600' }}>Gesamtumsatz</div>
          <div style={{ fontSize: '20px', fontWeight: '700' }}>{formatPrice(stats.totalRevenue)}</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => openOrderModal()}
            style={{ 
              padding: '10px 20px', 
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontSize: '14px', 
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(249,115,22,0.3)'
            }}
            disabled={menuItems.filter(m => m.available).length === 0}
          >
            ➕ Neue Bestellung
          </button>
          <button
            onClick={handleCsvImportClick}
            style={{
              padding: '10px 16px',
              background: 'white',
              color: '#ea580c',
              border: '2px solid #fed7aa',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '700'
            }}
          >
            📥 CSV Import
          </button>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Sortieren:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'time' | 'name')}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', background: 'white' }}
            >
              <option value="time">Uhrzeit</option>
              <option value="name">Name</option>
            </select>
            <button
              onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
            
            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
            
            {/* Export Buttons */}
            <button
              onClick={printOrders}
              disabled={sortedOrders.length === 0}
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                background: sortedOrders.length > 0 ? 'white' : '#f1f5f9', 
                cursor: sortedOrders.length > 0 ? 'pointer' : 'not-allowed', 
                fontSize: '13px',
                color: sortedOrders.length > 0 ? '#1e293b' : '#94a3b8'
              }}
              title="Drucken"
            >
              🖨️ Drucken
            </button>
            <button
              onClick={exportToCsv}
              disabled={sortedOrders.length === 0}
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                background: sortedOrders.length > 0 ? 'white' : '#f1f5f9', 
                cursor: sortedOrders.length > 0 ? 'pointer' : 'not-allowed', 
                fontSize: '13px',
                color: sortedOrders.length > 0 ? '#1e293b' : '#94a3b8'
              }}
              title="Als CSV exportieren"
            >
              📥 CSV
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
          {sortedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🥡</p>
              <p style={{ fontSize: '18px', color: '#64748b', margin: '0 0 8px' }}>Noch keine Bestellungen</p>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                {menuItems.length === 0 
                  ? 'Lege zuerst Speisen in der Speisekarte an.'
                  : 'Klicke auf "Neue Bestellung" um zu starten.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Zeit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Familie</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Bestellung</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Summe</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map(order => {
                  const total = calculateOrderTotal(order, menuItems)
                  return (
                    <tr 
                      key={order.id} 
                      style={{ 
                        borderTop: '1px solid #e2e8f0',
                        background: 'white'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        {order.time || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                          {order.familyName}
                        </div>
                        {order.note && (
                          <div style={{ fontSize: '12px', color: '#f97316', marginTop: '2px' }}>
                            📝 {order.note}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {order.items.map(item => {
                            const menuItem = menuItems.find(m => m.id === item.menuItemId)
                            if (!menuItem) return null
                            return (
                              <span key={item.menuItemId} style={{ 
                                padding: '2px 8px', 
                                background: '#e0e7ff', 
                                color: '#4f46e5', 
                                borderRadius: '4px', 
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#312e81' }}>
                                  {item.quantity}x {menuItem.name}
                                </span>
                                <span style={{ fontSize: '11px', color: '#4f46e5', marginLeft: '6px' }}>
                                  ({formatPrice(menuItem.price)})
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        {formatPrice(total)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => openOrderModal(order)}
                          style={{ padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}
                        >✏️</button>
                        <button
                          onClick={() => deleteOrder(order.id)}
                          style={{ padding: '4px 8px', background: '#fee2e2', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}
                        >🗑️</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Save Toast */}
      {saveToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          background: saveToast.type === 'success' ? '#22c55e' : '#ef4444',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 1000
        }}>
          {saveToast.type === 'success' ? '✓' : '✗'} {saveToast.message}
        </div>
      )}

      {/* Menu Items Modal */}
      {showMenuModal && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>🍽️ Speisekarte verwalten</h3>
              <button onClick={() => setShowMenuModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            
            {/* Add/Edit Form */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#64748b' }}>
                {editingMenuItem ? 'Speise bearbeiten' : 'Neue Speise hinzufügen'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Name (z.B. Bratwurst)"
                  value={menuItemName}
                  onChange={e => setMenuItemName(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                />
                <input
                  type="text"
                  placeholder="Preis (z.B. 4,50)"
                  value={menuItemPrice}
                  onChange={e => setMenuItemPrice(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                />
                <input
                  type="text"
                  placeholder="Kategorie (optional)"
                  value={menuItemCategory}
                  onChange={e => setMenuItemCategory(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                />
                <input
                  type="text"
                  placeholder="Beschreibung (optional)"
                  value={menuItemDescription}
                  onChange={e => setMenuItemDescription(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={saveMenuItem}
                  disabled={!menuItemName.trim() || !menuItemPrice.trim()}
                  style={{ 
                    padding: '10px 20px', 
                    background: menuItemName.trim() && menuItemPrice.trim() ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#e2e8f0',
                    color: menuItemName.trim() && menuItemPrice.trim() ? 'white' : '#94a3b8',
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: menuItemName.trim() && menuItemPrice.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {editingMenuItem ? 'Aktualisieren' : 'Hinzufügen'}
                </button>
                {editingMenuItem && (
                  <button
                    onClick={() => {
                      setEditingMenuItem(null)
                      setMenuItemName('')
                      setMenuItemPrice('')
                      setMenuItemDescription('')
                      setMenuItemCategory('')
                    }}
                    style={{ padding: '10px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            </div>

            {/* Menu Items List */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#64748b' }}>
                Aktuelle Speisen ({menuItems.length})
              </h4>
              {menuItems.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                  Noch keine Speisen angelegt.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {menuItems.map(item => (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '12px', 
                        background: item.available ? '#f0fdf4' : '#fef2f2',
                        borderRadius: '8px',
                        opacity: item.available ? 1 : 0.7
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: '#1e293b' }}>
                          {item.name}
                          {item.category && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{item.category}</span>}
                        </div>
                        {item.description && <div style={{ fontSize: '12px', color: '#64748b' }}>{item.description}</div>}
                      </div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{formatPrice(item.price)}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Bestellt: {stats.itemCounts[item.id] || 0}×
                      </div>
                      <button
                        onClick={() => toggleMenuItemAvailable(item.id)}
                        style={{ 
                          padding: '4px 8px', 
                          background: item.available ? '#22c55e' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        {item.available ? 'Aktiv' : 'Inaktiv'}
                      </button>
                      <button
                        onClick={() => openMenuModal(item)}
                        style={{ padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >✏️</button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        style={{ padding: '4px 8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvImportModal && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '760px', maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>📥 Bestellungen aus CSV importieren</h3>
              <button onClick={() => setShowCsvImportModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569' }}>
              Erwartetes Format (Header empfohlen): Spalten für Name/Familie, Zeit, Mengen pro Speise (Spaltenname = Speisename) und <strong>Bemerkung</strong> am Ende.
              <strong>Trennzeichen wird automatisch erkannt</strong> (Semikolon empfohlen). Alternativ eine Spalte "Bestellung"/"Items" mit Text wie "2x Currywurst; 1x Schnitzel".
              Namen mit Komma sind problemlos (z.B. "Mueller, Klaus").
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
              <input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} style={{ flex: 1 }} />
              <button
                onClick={parseCsvPreview}
                style={{
                  padding: '10px 14px',
                  background: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
              >Einlesen</button>
              <button
                onClick={downloadExampleCsv}
                style={{
                  padding: '10px 12px',
                  background: 'white',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >Beispiel-CSV</button>
            </div>
            {csvFile && (
              <div style={{ padding: '8px 12px', background: '#fff7ed', borderRadius: '6px', marginBottom: '12px', color: '#9a3412', fontWeight: 600 }}>
                Gewählt: {csvFile.name} {csvFileEncoding && `(${csvFileEncoding})`}
              </div>
            )}
            {csvDelimiterWarning && (
              <div style={{ padding: '8px 12px', background: '#fef9c3', borderRadius: '6px', marginBottom: '12px', color: '#854d0e', fontWeight: 600 }}>
                {csvDelimiterWarning}
              </div>
            )}
            {menuItems.length === 0 && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', marginBottom: '12px', color: '#b91c1c', fontWeight: 600 }}>
                Hinweis: Lege zuerst Speisen an, damit Mengen korrekt zugeordnet werden können.
              </div>
            )}
            {csvPreview.length > 0 ? (
              <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', marginBottom: '12px', background: '#f8fafc' }}>
                {csvPreview.map((row, idx) => (
                  <div
                    key={`csv-row-${idx}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.6fr 0.8fr 2fr 1.2fr auto',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '8px',
                      borderBottom: '1px solid #e2e8f0',
                      background: row.items.length > 0 ? 'white' : '#fef9c3'
                    }}
                  >
                    <input
                      value={row.familyName}
                      onChange={e => updateCsvPreviewRow(idx, { familyName: e.target.value })}
                      placeholder="Familienname"
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                    <input
                      type="time"
                      value={row.time || ''}
                      onChange={e => updateCsvPreviewRow(idx, { time: e.target.value })}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {menuItems.map(item => {
                        const qty = row.items.find(i => i.menuItemId === item.id)?.quantity || 0
                        return (
                          <label key={`${row.id}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: qty > 0 ? '#fff7ed' : '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 6px', fontSize: '11px', color: '#0f172a' }}>
                            <span>{item.name}</span>
                            <input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={e => updateCsvItemQuantity(idx, item.id, Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ width: '52px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px' }}
                            />
                          </label>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      value={row.note || ''}
                      placeholder="Bemerkung"
                      onChange={e => updateCsvPreviewRow(idx, { note: e.target.value.slice(0, 80) })}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      {row.items.length === 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#854d0e' }}>0 Artikel</span>
                      )}
                      <button
                        onClick={() => removeCsvPreviewRow(idx)}
                        style={{
                          padding: '8px 10px',
                          background: 'white',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px', color: '#475569', marginBottom: '12px' }}>
                Noch keine Vorschau. Datei wählen und "Einlesen" klicken, dann erscheinen die Zeilen hier.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#475569' }}>{csvPreview.length} Zeilen bereit</span>
              <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowCsvImportModal(false); setCsvFile(null); setCsvFileEncoding(null); setCsvPreview([]) }}
                  style={{
                    padding: '10px 14px',
                    background: 'white',
                    color: '#f97316',
                    border: '2px solid #fed7aa',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >Abbrechen</button>
                <button
                  onClick={applyCsvPreview}
                  disabled={csvPreview.length === 0}
                  style={{
                    padding: '10px 16px',
                    background: csvPreview.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: csvPreview.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    minWidth: '160px'
                  }}
                >In Liste übernehmen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Mismatch Modal */}
      {showMenuMismatchModal && menuMismatchInfo && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '640px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>⚠️ Speisekarte & CSV weichen ab</h3>
            <div style={{ fontSize: '14px', color: '#475569', marginBottom: '12px' }}>
              Die CSV enthält Speisen-Spalten, die nicht (oder in anderer Reihenfolge) in der Speisekarte stehen.
              Soll die Speisekarte an die CSV angepasst werden?
            </div>

            <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
              {menuMismatchInfo.missingInMenu.length > 0 && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '10px 12px', borderRadius: '8px', color: '#9a3412' }}>
                  <strong>In CSV, aber nicht in Speisekarte:</strong> {menuMismatchInfo.missingInMenu.join(', ')}
                </div>
              )}
              {menuMismatchInfo.missingInCsv.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '8px', color: '#334155' }}>
                  <strong>In Speisekarte, aber nicht in CSV:</strong> {menuMismatchInfo.missingInCsv.join(', ')}
                </div>
              )}
              {menuMismatchInfo.orderMismatch && (
                <div style={{ background: '#fefce8', border: '1px solid #fde68a', padding: '10px 12px', borderRadius: '8px', color: '#854d0e' }}>
                  <strong>Reihenfolge unterscheidet sich.</strong> Bitte prüfen, ob Spalten vertauscht wurden. Die Spaltenreihenfolge wird beim Import berücksichtigt.
                </div>
              )}
              {menuMismatchInfo.suggestions.length > 0 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 12px', borderRadius: '8px', color: '#1e3a8a' }}>
                  <strong>Vorgeschlagene Zuordnung (aehnliche Namen):</strong>
                  <div style={{ marginTop: '6px', fontSize: '13px' }}>
                    {menuMismatchInfo.suggestions.map(s => (
                      <div key={`${s.csvName}-${s.menuName}`}>{s.csvName} → {s.menuName} ({s.score}%)</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowMenuMismatchModal(false)
                  setMenuMismatchInfo(null)
                }}
                style={{
                  padding: '10px 14px',
                  background: 'white',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >Abbrechen</button>
              <button
                onClick={() => {
                  setShowMenuMismatchModal(false)
                  setMenuMismatchInfo(null)
                  if (csvRawText) {
                    parseCsvText(csvRawText, menuItems, false, csvDetectedDelimiter || ';')
                  }
                }}
                style={{
                  padding: '10px 14px',
                  background: 'white',
                  color: '#ea580c',
                  border: '2px solid #fed7aa',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >Ohne Anpassung fortfahren</button>
              <button
                onClick={() => {
                  if (!menuMismatchInfo.csvMenuOrder.length) return
                  const nextMenu = buildMenuFromCsvNames(menuMismatchInfo.csvMenuOrder)
                  setMenuItems(nextMenu)
                  setShowMenuMismatchModal(false)
                  setMenuMismatchInfo(null)
                  if (csvRawText) {
                    parseCsvText(csvRawText, nextMenu, false, csvDetectedDelimiter || ';')
                  }
                }}
                style={{
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >Speisekarte anpassen</button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '720px', maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>📖 Anleitung: ToGo-Bestellungen</h3>
              <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', marginBottom: '6px' }}>1. Speisekarte anlegen</div>
                <div style={{ color: '#1e293b', fontSize: '14px' }}>
                  Über <strong>⚙️ Speisekarte</strong> Speisen mit Preis anlegen. Die Speisennamen werden später für den CSV-Import genutzt.
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', marginBottom: '6px' }}>2. Bestellungen erfassen</div>
                <div style={{ color: '#1e293b', fontSize: '14px' }}>
                  Bestellungen manuell über <strong>Neue Bestellung</strong> oder per CSV-Import erfassen.
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#9a3412', fontWeight: '700', marginBottom: '6px' }}>3. CSV-Import (optional)</div>
                <div style={{ color: '#7c2d12', fontSize: '14px', marginBottom: '8px' }}>
                  CSV mit folgenden Spalten: <strong>Name</strong>, <strong>Zeit</strong>, Mengen pro Speise (Spaltenname = Speisename) und <strong>Bemerkung</strong> am Ende.
                  <strong>Trennzeichen wird automatisch erkannt</strong> (Semikolon empfohlen). Alternativ eine Spalte <strong>Bestellung/Items</strong> (z.B. <em>"2x Currywurst; 1x Schnitzel"</em>).
                  Namen mit Komma sind problemlos (z.B. <em>"Mueller, Klaus"</em>).
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={downloadBlankCsv}
                    style={{
                      padding: '10px 14px',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '700'
                    }}
                  >📥 Blanko-CSV herunterladen</button>
                  <button
                    onClick={downloadExampleCsv}
                    style={{
                      padding: '10px 14px',
                      background: 'white',
                      color: '#0f172a',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '700'
                    }}
                  >📥 Beispiel-CSV herunterladen</button>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', marginBottom: '6px' }}>4. Drucken & Export</div>
                <div style={{ color: '#1e293b', fontSize: '14px' }}>
                  Nach dem Erfassen kannst du die Liste drucken oder als CSV exportieren.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>
                {editingOrder ? '✏️ Bestellung bearbeiten' : '➕ Neue Bestellung'}
              </h3>
              <button onClick={() => setShowOrderModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Family Info */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Familienname"
                  value={orderFamilyName}
                  onChange={e => setOrderFamilyName(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="time"
                  value={orderTime}
                  onChange={e => setOrderTime(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', width: '140px' }}
                />
                <input
                  type="text"
                  placeholder="Bemerkung (optional)"
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              {/* Order Items */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Bestellung</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {menuItems.filter(m => m.available).map(item => {
                    const orderItem = orderItems.find(i => i.menuItemId === item.id)
                    const qty = orderItem?.quantity || 0
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'white', borderRadius: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', color: '#1e293b' }}>{item.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{formatPrice(item.price)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => updateOrderItemQuantity(item.id, -1)}
                            disabled={qty === 0}
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '6px', 
                              background: qty === 0 ? '#f1f5f9' : 'white',
                              cursor: qty === 0 ? 'not-allowed' : 'pointer',
                              fontSize: '16px',
                              color: qty === 0 ? '#cbd5e1' : '#1e293b'
                            }}
                          >−</button>
                          <span style={{ width: '32px', textAlign: 'center', fontWeight: '600', fontSize: '16px' }}>{qty}</span>
                          <button
                            onClick={() => updateOrderItemQuantity(item.id, 1)}
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '6px', 
                              background: 'white',
                              cursor: 'pointer',
                              fontSize: '16px',
                              color: '#1e293b'
                            }}
                          >+</button>
                        </div>
                        <div style={{ width: '80px', textAlign: 'right', fontWeight: '500', color: qty > 0 ? '#1e293b' : '#cbd5e1' }}>
                          {formatPrice(item.price * qty)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0' }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Gesamt:</span>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: '#f97316' }}>
                    {formatPrice(orderItems.reduce((sum, i) => {
                      const item = menuItems.find(m => m.id === i.menuItemId)
                      return sum + (item ? item.price * i.quantity : 0)
                    }, 0))}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={saveOrder}
                  disabled={!orderFamilyName.trim() || orderItems.filter(i => i.quantity > 0).length === 0}
                  style={{ 
                    flex: 1,
                    padding: '12px 24px', 
                    background: orderFamilyName.trim() && orderItems.some(i => i.quantity > 0)
                      ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                      : '#e2e8f0',
                    color: orderFamilyName.trim() && orderItems.some(i => i.quantity > 0) ? 'white' : '#94a3b8',
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: orderFamilyName.trim() && orderItems.some(i => i.quantity > 0) ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {editingOrder ? 'Aktualisieren' : 'Bestellung aufnehmen'}
                </button>
                <button
                  onClick={() => setShowOrderModal(false)}
                  style={{ padding: '12px 24px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Reservation Config Panel */}
      {showReservationPanel && event && (
        <ReservationConfigPanel
          eventId={event.id}
          isToGo={true}
          token={auth.token ?? undefined}
          onClose={() => setShowReservationPanel(false)}
        />
      )}
    </div>
  )
}
