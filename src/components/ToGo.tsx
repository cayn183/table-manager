// ============================================================================
// ToGo Event Component - Handles ToGo/Takeaway orders without table placement
// ============================================================================
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import userStorage from '../utils/userStorage'
import { syncUserData } from '../utils/sync'
import type { MenuItem, ToGoOrder, ToGoEventConfig, OrderItem } from '../types/togo'
import { calculateOrderTotal, formatPrice, generateToGoId } from '../types/togo'

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
  
  // Order Form
  const [orderFamilyName, setOrderFamilyName] = useState('')
  const [orderSalutation, setOrderSalutation] = useState<'Fam' | 'Frau' | 'Herr'>('Fam')
  const [orderTime, setOrderTime] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  
  // Sorting
  const [sortBy, setSortBy] = useState<'time' | 'name'>('time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // --------------------------------------------------------------------------
  // LOAD EVENT
  // --------------------------------------------------------------------------
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
          navigate('/room')
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
      if (auth.token && userId) {
        await syncUserData(auth.token, userId)
      }
    } catch (e) {
      console.error('Sync failed:', e)
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
      setOrderSalutation(order.salutation as 'Fam' | 'Frau' | 'Herr')
      setOrderTime(order.time)
      setOrderNote(order.note || '')
      setOrderItems([...order.items])
    } else {
      setEditingOrder(null)
      setOrderFamilyName('')
      setOrderSalutation('Fam')
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
      salutation: orderSalutation,
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
    
    const headers = ['Uhrzeit', 'Anrede', 'Name', 'Bestellung', 'Menge', 'Einzelpreise', 'Summe', 'Bemerkung']
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
        order.salutation,
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

  const printOrders = useCallback(() => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${event?.name || 'ToGo'} - Bestellungen</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .meta { color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #f5f5f5; }
    .total { font-weight: bold; }
    .summary { margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px; }
    .summary h3 { margin: 0 0 12px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .summary-item { text-align: center; }
    .summary-value { font-size: 24px; font-weight: bold; }
    .summary-label { font-size: 12px; color: #666; }
    @media print { 
      body { padding: 0; } 
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>🥡 ${event?.name || 'ToGo-Bestellungen'}</h1>
  <div class="meta">${event?.eventDate || ''} ${event?.from ? '• ' + event.from : ''}${event?.to ? ' - ' + event.to : ''}</div>
  
  <table>
    <thead>
      <tr>
        <th>Zeit</th>
        <th>Name</th>
        <th>Bestellung</th>
        <th>Summe</th>
      </tr>
    </thead>
    <tbody>
      ${sortedOrders.map(order => {
        const total = calculateOrderTotal(order, menuItems)
        const itemsStr = order.items.map(i => {
          const mi = menuItems.find(m => m.id === i.menuItemId)
          if (!mi) return ''
          return i.quantity > 1 ? `${mi.name} (${i.quantity}x${formatPrice(mi.price)})` : `${mi.name} (${formatPrice(mi.price)})`
        }).filter(Boolean).join(', ')
        return `
          <tr>
            <td>${order.time || '-'}</td>
            <td>${order.salutation} ${order.familyName}${order.note ? '<br><small>📝 ' + order.note + '</small>' : ''}</td>
            <td>${itemsStr}</td>
            <td class="total">${formatPrice(total)}</td>
          </tr>
        `
      }).join('')}
    </tbody>
  </table>
  
  <div class="summary">
    <h3>Zusammenfassung</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${stats.totalOrders}</div>
        <div class="summary-label">Bestellungen</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${formatPrice(stats.totalRevenue)}</div>
        <div class="summary-label">Gesamtumsatz</div>
      </div>
    </div>
    <h4 style="margin-top: 16px; margin-bottom: 8px;">Bestellte Artikel:</h4>
    <ul style="margin: 0; padding-left: 20px;">
      ${menuItems.filter(m => stats.itemCounts[m.id]).map(m => 
        `<li>${stats.itemCounts[m.id]}× ${m.name}</li>`
      ).join('')}
    </ul>
  </div>
  
  <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">🖨️ Drucken</button>
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
          onClick={() => navigate('/')}
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
                          {order.salutation} {order.familyName}
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
                            const label = item.quantity > 1
                              ? `${menuItem.name} (${item.quantity}x${formatPrice(menuItem.price)})`
                              : `${menuItem.name} (${formatPrice(menuItem.price)})`
                            return (
                              <span key={item.menuItemId} style={{ 
                                padding: '2px 8px', 
                                background: '#e0e7ff', 
                                color: '#4f46e5', 
                                borderRadius: '4px', 
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                {label}
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
                <select
                  value={orderSalutation}
                  onChange={e => setOrderSalutation(e.target.value as 'Fam' | 'Frau' | 'Herr')}
                  style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', width: '100px' }}
                >
                  <option value="Fam">Fam</option>
                  <option value="Frau">Frau</option>
                  <option value="Herr">Herr</option>
                </select>
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
    </div>
  )
}
