import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import userStorage from '../../utils/userStorage'
import api from '../../api/apiClient'
import { syncUserData } from '../../utils/sync'
import { hydrateUserData } from '../../utils/sync'
import { useSetPageHeader } from '../layout/PageHeaderContext'
import { formatDateShort, formatDateTimeShortDE } from '../../utils/dateFormatting'
import type { PrivateEventItem } from '../../types/event'
import { migratePrivateEvent } from '../../types/event'

const EVENTS_KEY = 'events'

export default function LoadEvent() {
  const navigate = useNavigate()
  const auth = useAuth()
  const userId = auth.user ? auth.user.id : null
  const [events, setEvents] = useState<PrivateEventItem[]>([])
  useSetPageHeader('Erstelltes Event laden', '📂')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (userId) {
        await hydrateUserData(auth.token, userId)
      }
      if (!mounted) return
      const raw = userStorage.getItem(EVENTS_KEY, userId) || localStorage.getItem(EVENTS_KEY) || '[]'
      const list = (JSON.parse(raw as string) as any[]).map(migratePrivateEvent)
      setEvents(list)
    })()
    return () => { mounted = false }
  }, [userId, auth.token])

  function loadEvent(event: PrivateEventItem) {
    // All events now use the module-based detail view
    navigate(`/app/events/${event.id}`)
  }

  function deleteEvent(id: string) {
    const updated = events.filter(e => e.id !== id)
    userStorage.setItem(EVENTS_KEY, JSON.stringify(updated), userId)
    setEvents(updated)
    ;(async () => {
      try {
        try { await api.del(`/events/${id}`, auth.token ?? undefined) } catch (e) {}
        if (userId) await syncUserData(auth.token, userId)
      } catch (err) {
        // ignore
      }
    })()
  }

  /** Build module badge list for an event */
  function moduleIcons(event: PrivateEventItem): string[] {
    const icons: string[] = []
    if (event.modules?.room) icons.push('🏠')
    if (event.modules?.seating) icons.push('🪑')
    if (event.modules?.menu) icons.push('🍽️')
    if (event.modules?.guestInvite) icons.push('💌')
    if (event.modules?.dashboard) icons.push('📱')
    if (event.modules?.checklist) icons.push('✅')
    if (event.modules?.budget) icons.push('💰')
    if (event.modules?.timeline) icons.push('⏱️')
    // Legacy fallback
    if (event.modules?.food) icons.push('🍽️')
    if (event.modules?.reservation) icons.push('📝')
    if (!event.modules && event.isToGo) icons.push('🍽️')
    return icons
  }

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px 24px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📂</p>
          <p style={{ fontSize: '18px', color: '#64748b', margin: 0 }}>Keine gespeicherten Events vorhanden.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {events.map(event => (
            <div
              key={event.id}
              style={{
                padding: '24px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s',
                border: '1px solid #e2e8f0'
              }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>{event.name}</h3>
                  {moduleIcons(event).map((icon, i) => (
                    <span key={i} style={{ fontSize: '16px' }} title="Aktives Modul">{icon}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#667eea', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                    {event.eventDate ? formatDateShort(event.eventDate) || 'Ungültiges Datum' : 'Kein Datum'}
                  </span>
                  {event.from && <span style={{ padding: '4px 12px', background: '#dbeafe', color: '#3b82f6', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                    {event.from}{event.to ? ` - ${event.to}` : ''}
                  </span>}
                </div>
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#94a3b8' }}>
                  Erstellt: {formatDateTimeShortDE(event.createdAt) || event.createdAt || 'unbekannt'}
                </p>
                {event.lastModified && <p style={{ margin: '4px 0', fontSize: '12px', color: '#94a3b8' }}>Geändert: {event.lastModified}</p>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => loadEvent(event)}
                  style={{ 
                    padding: '10px 20px', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    boxShadow: '0 2px 8px rgba(102,126,234,0.3)', 
                    transition: 'all 0.2s' 
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >Öffnen</button>
                <button 
                  onClick={() => deleteEvent(event.id)} 
                  style={{ padding: '10px 20px', background: 'white', color: '#ef4444', border: '2px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#ef4444'; }}
                >Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

    </div>
  )
}
