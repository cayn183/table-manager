import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import userStorage from '../utils/userStorage'
import { syncUserData } from '../utils/sync'
import type { ToGoEventConfig } from '../types/togo'

const EVENTS_KEY = 'events'
const CURRENT_EVENT_KEY = 'currentEvent'
const ROOMS_KEY = 'rooms'
const STORAGE_KEY = 'currentRoom'

type SavedRoom = { id: string; name: string; data: any }
type EventItem = { 
  id: string
  name: string
  from?: string
  to?: string
  roomId?: string
  eventDate?: string
  isToGo?: boolean
  toGoConfig?: ToGoEventConfig
}

export default function Home() {
  const navigate = useNavigate()
  const auth = useAuth()
  const userId = auth.user ? auth.user.id : null
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const [isToGo, setIsToGo] = useState(false)
  const [useExistingRoom, setUseExistingRoom] = useState<'existing' | 'new'>('existing')
  const [rooms, setRooms] = useState<SavedRoom[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    // Prefer user-scoped storage, fall back to legacy global keys if needed.
    const rawRooms = userStorage.getItem(ROOMS_KEY, userId) || localStorage.getItem(ROOMS_KEY) || '[]'
    const list = JSON.parse(rawRooms as string) as SavedRoom[]
    const current = userStorage.getItem(STORAGE_KEY, userId) || localStorage.getItem(STORAGE_KEY)
    let merged = list
    // If no saved rooms exist, use the currently open room as a fallback.
    if (!list.length && current) {
      merged = [{ id: 'current', name: 'Aktueller Raum', data: JSON.parse(current as string) }]
    }
    setRooms(merged)
    if (merged.length) setSelectedRoomId(merged[0].id)
  }, [userId])

  async function createEvent() {
    setCreateError(null)
    const id = `e-${Date.now()}`
    const ev: EventItem = { 
      id, 
      name: eventName || `Event ${new Date().toLocaleDateString()}`, 
      eventDate: eventDate || undefined, 
      from: fromTime || undefined, 
      to: toTime || undefined,
      isToGo: isToGo || undefined,
      toGoConfig: isToGo ? { menuItems: [], orders: [] } : undefined
    }
    const rawEvents = userStorage.getItem(EVENTS_KEY, userId) || localStorage.getItem(EVENTS_KEY) || '[]'
    const all = JSON.parse(rawEvents as string) as EventItem[]
    
    // ToGo events don't need a room
    if (isToGo) {
      userStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(ev), userId)
      userStorage.setItem(EVENTS_KEY, JSON.stringify([...all, ev]), userId)
      try {
        if (userId) {
          await syncUserData(auth.token, userId)
        }
      } catch (e: any) {
        setCreateError(e?.message || 'Speichern fehlgeschlagen.')
        return
      }
      navigate('/app/togo')
      return
    }
    
    if (useExistingRoom === 'existing' && selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId)
      if (room) {
        userStorage.setItem(STORAGE_KEY, JSON.stringify(room.data), userId)
        ev.roomId = room.id
      }
      userStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(ev), userId)
      userStorage.setItem(EVENTS_KEY, JSON.stringify([...all, ev]), userId)
      try {
        if (userId) {
          await syncUserData(auth.token, userId)
        }
      } catch (e: any) {
        setCreateError(e?.message || 'Speichern fehlgeschlagen.')
        return
      }
      navigate(`/app/events/${id}`)
    } else {
      userStorage.removeItem(STORAGE_KEY, userId)
      localStorage.removeItem(STORAGE_KEY)
      userStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(ev), userId)
      userStorage.setItem(EVENTS_KEY, JSON.stringify([...all, ev]), userId)
      try {
        if (userId) {
          await syncUserData(auth.token, userId)
        }
      } catch (e: any) {
        setCreateError(e?.message || 'Speichern fehlgeschlagen.')
        return
      }
      navigate('/app/rooms/new', { state: { pendingEventId: id } })
    }
  }

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 24px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '20px', maxWidth: '800px', margin: '20px auto 0' }}>
          <button 
            onClick={() => setShowEventModal(true)}
            style={{
              padding: '32px 24px',
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: '600',
              color: '#667eea',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              transition: 'all 0.2s',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(102,126,234,0.3)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
          >
            <span style={{ fontSize: '32px' }}>✨</span>
            <span>Neues Event anlegen</span>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Starte ein neues Event mit Raum und Familien</span>
          </button>
          <Link to="/app/events" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              padding: '32px 24px',
              background: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e293b',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              transition: 'all 0.2s',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}>
              <span style={{ fontSize: '32px' }}>📂</span>
              <span>Event laden</span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Bestehende Events öffnen und bearbeiten</span>
            </button>
          </Link>
          <Link to="/app/rooms" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              padding: '32px 24px',
              background: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e293b',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              transition: 'all 0.2s',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}>
              <span style={{ fontSize: '32px' }}>🏠</span>
              <span>Raum laden</span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Gespeicherte Raum-Layouts verwenden</span>
            </button>
          </Link>
          <Link to="/app/rooms/new" onClick={() => { userStorage.removeItem(STORAGE_KEY, userId); localStorage.removeItem(STORAGE_KEY) }} style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              padding: '32px 24px',
              background: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e293b',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              transition: 'all 0.2s',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}>
              <span style={{ fontSize: '32px' }}>🏗️</span>
              <span>Raum anlegen</span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Neuen Raum mit Tisch-Layout erstellen</span>
            </button>
          </Link>
        </div>
      </div>

      {showEventModal && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', minWidth: '420px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>✨ Neues Event anlegen</h3>
            {createError && (
              <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 500 }}>
                {createError}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="text" 
                placeholder="Eventname" 
                value={eventName} 
                onChange={e => setEventName(e.target.value)} 
                style={{ padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#667eea'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <input 
                type="date" 
                placeholder="Datum" 
                value={eventDate} 
                onChange={e => setEventDate(e.target.value)} 
                style={{ padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#667eea'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <input 
                  type="time" 
                  placeholder="von" 
                  value={fromTime} 
                  onChange={e => setFromTime(e.target.value)} 
                  style={{ flex: 1, padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <input 
                  type="time" 
                  placeholder="bis" 
                  value={toTime} 
                  onChange={e => setToTime(e.target.value)} 
                  style={{ flex: 1, padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#667eea'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              
              {/* ToGo Toggle */}
              <div style={{ 
                background: isToGo ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#f1f5f9', 
                padding: '16px', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{isToGo ? '🥡' : '🍽️'}</span>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: isToGo ? 'white' : '#1e293b' }}>
                      {isToGo ? 'ToGo / Abholung' : 'Vor Ort essen'}
                    </div>
                    <div style={{ fontSize: '12px', color: isToGo ? 'rgba(255,255,255,0.8)' : '#64748b' }}>
                      {isToGo ? 'Bestellungen ohne Tischplatzierung' : 'Mit Raum- und Tischplanung'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsToGo(!isToGo)}
                  style={{
                    width: '56px',
                    height: '30px',
                    borderRadius: '15px',
                    border: 'none',
                    background: isToGo ? 'rgba(255,255,255,0.3)' : '#cbd5e1',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '12px',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: isToGo ? '29px' : '3px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>

              {/* Room selection - only show when NOT ToGo */}
              <div style={{ 
                background: '#f1f5f9', 
                padding: '16px', 
                borderRadius: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                opacity: isToGo ? 0.4 : 1,
                pointerEvents: isToGo ? 'none' : 'auto',
                transition: 'opacity 0.3s ease'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  <input type="radio" checked={useExistingRoom === 'existing'} onChange={() => setUseExistingRoom('existing')} disabled={isToGo} /> 
                  Bestehenden Raum verwenden
                </label>
                {useExistingRoom === 'existing' && (
                  <select 
                    style={{ padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer', outline: 'none' }} 
                    value={selectedRoomId} 
                    onChange={e => setSelectedRoomId(e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#667eea'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    disabled={isToGo}
                  >
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  <input type="radio" checked={useExistingRoom === 'new'} onChange={() => setUseExistingRoom('new')} disabled={isToGo} /> 
                  Neuen Raum anlegen
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button 
                onClick={createEvent}
                style={{ flex: 1, padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(102,126,234,0.3)', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >Weiter →</button>
              <button 
                onClick={() => { setCreateError(null); setShowEventModal(false) }}
                style={{ padding: '12px 24px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'white'; }}
              >Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}