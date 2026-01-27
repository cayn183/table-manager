import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import userStorage from '../utils/userStorage'

const EVENTS_KEY = 'events'
const CURRENT_EVENT_KEY = 'currentEvent'
const ROOMS_KEY = 'rooms'
const STORAGE_KEY = 'currentRoom'

type SavedRoom = { id: string; name: string; data: any }
type EventItem = { id: string; name: string; from?: string; to?: string; roomId?: string; eventDate?: string }

export default function Home() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const [useExistingRoom, setUseExistingRoom] = useState<'existing' | 'new'>('existing')
  const [rooms, setRooms] = useState<SavedRoom[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')

  useEffect(() => {
    const rawRooms = userStorage.getItem(ROOMS_KEY, auth.user ? auth.user.id : null) || localStorage.getItem(ROOMS_KEY) || '[]'
    const list = JSON.parse(rawRooms as string) as SavedRoom[]
    const current = userStorage.getItem(STORAGE_KEY, auth.user ? auth.user.id : null) || localStorage.getItem(STORAGE_KEY)
    let merged = list
    if (!list.length && current) {
      merged = [{ id: 'current', name: 'Aktueller Raum', data: JSON.parse(current as string) }]
    }
    setRooms(merged)
    if (merged.length) setSelectedRoomId(merged[0].id)
  }, [])

  function createEvent() {
    const id = `e-${Date.now()}`
    const ev: EventItem = { id, name: eventName || `Event ${new Date().toLocaleDateString()}`, eventDate: eventDate || undefined, from: fromTime || undefined, to: toTime || undefined }
    const rawEvents = userStorage.getItem(EVENTS_KEY, auth.user ? auth.user.id : null) || localStorage.getItem(EVENTS_KEY) || '[]'
    const all = JSON.parse(rawEvents as string) as EventItem[]
    if (useExistingRoom === 'existing' && selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId)
      if (room) {
        userStorage.setItem(STORAGE_KEY, JSON.stringify(room.data), auth.user ? auth.user.id : null)
        ev.roomId = room.id
      }
      userStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(ev), auth.user ? auth.user.id : null)
      userStorage.setItem(EVENTS_KEY, JSON.stringify([...all, ev]), auth.user ? auth.user.id : null)
      navigate('/room')
    } else {
      userStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(ev), auth.user ? auth.user.id : null)
      userStorage.setItem(EVENTS_KEY, JSON.stringify([...all, ev]), auth.user ? auth.user.id : null)
      navigate('/new-room')
    }
  }

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0', fontSize: '32px', fontWeight: '600', color: 'white', textAlign: 'center' }}>🎉 Event-Manager</h1>
        <p style={{ margin: '8px 0 0', fontSize: '16px', color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>Planung leicht gemacht</p>
      </div>
      
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
          <Link to="/load-event" style={{ textDecoration: 'none' }}>
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
          <Link to="/load-room" style={{ textDecoration: 'none' }}>
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
          <Link to="/new-room" style={{ textDecoration: 'none' }}>
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
              <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  <input type="radio" checked={useExistingRoom === 'existing'} onChange={() => setUseExistingRoom('existing')} /> 
                  Bestehenden Raum verwenden
                </label>
                {useExistingRoom === 'existing' && (
                  <select 
                    style={{ padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', cursor: 'pointer', outline: 'none' }} 
                    value={selectedRoomId} 
                    onChange={e => setSelectedRoomId(e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#667eea'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  >
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  <input type="radio" checked={useExistingRoom === 'new'} onChange={() => setUseExistingRoom('new')} /> 
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
                onClick={() => setShowEventModal(false)}
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