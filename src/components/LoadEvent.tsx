import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import userStorage from '../utils/userStorage'

type EventItem = {
  id: string
  name: string
  from?: string
  to?: string
  roomId?: string
  createdAt?: string
  lastModified?: string
  eventDate?: string
  assignedGroups?: any
  groups?: any
}

const EVENTS_KEY = 'events'
const CURRENT_EVENT_KEY = 'currentEvent'
const STORAGE_KEY = 'currentRoom'
const ROOMS_KEY = 'rooms'

export default function LoadEvent() {
  const navigate = useNavigate()
  const auth = useAuth()
  const userId = auth.user ? auth.user.id : null
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    // Prefer user-scoped storage, fall back to legacy global keys if needed.
    const raw = userStorage.getItem(EVENTS_KEY, userId) || localStorage.getItem(EVENTS_KEY) || '[]'
    const list = JSON.parse(raw as string) as EventItem[]
    setEvents(list)
  }, [userId])

  function loadEvent(event: EventItem) {
    userStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(event), userId)
    if (event.roomId) {
      const raw = userStorage.getItem(ROOMS_KEY, userId) || localStorage.getItem(ROOMS_KEY) || '[]'
      const rooms = JSON.parse(raw as string)
      const room = rooms.find((r: any) => r.id === event.roomId)
      if (room) {
        userStorage.setItem(STORAGE_KEY, JSON.stringify(room.data), userId)
      }
    }
    navigate('/room')
  }

  function deleteEvent(id: string) {
    const updated = events.filter(e => e.id !== id)
    userStorage.setItem(EVENTS_KEY, JSON.stringify(updated), userId)
    setEvents(updated)
  }

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '16px 24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button 
          onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        >←</button>
        <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '600', color: 'white' }}>📂 Event laden</h1>
      </div>
      
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
                <h3 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>{event.name}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#667eea', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                    {event.eventDate ? event.eventDate : 'Kein Datum'}
                  </span>
                  {event.from && <span style={{ padding: '4px 12px', background: '#dbeafe', color: '#3b82f6', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                    {event.from}{event.to ? ` - ${event.to}` : ''}
                  </span>}
                </div>
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#94a3b8' }}>
                  Erstellt: {event.createdAt || 'unbekannt'}
                </p>
                {event.lastModified && <p style={{ margin: '4px 0', fontSize: '12px', color: '#94a3b8' }}>Geändert: {event.lastModified}</p>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => loadEvent(event)}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(102,126,234,0.3)', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >Laden</button>
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
