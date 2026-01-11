import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const EVENTS_KEY = 'events'
const CURRENT_EVENT_KEY = 'currentEvent'
const ROOMS_KEY = 'rooms'
const STORAGE_KEY = 'currentRoom'

type SavedRoom = { id: string; name: string; data: any }
type EventItem = { id: string; name: string; from?: string; to?: string; roomId?: string; eventDate?: string }

export default function Home() {
  const navigate = useNavigate()
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const [useExistingRoom, setUseExistingRoom] = useState<'existing' | 'new'>('existing')
  const [rooms, setRooms] = useState<SavedRoom[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]') as SavedRoom[]
    const current = localStorage.getItem(STORAGE_KEY)
    let merged = list
    if (!list.length && current) {
      merged = [{ id: 'current', name: 'Aktueller Raum', data: JSON.parse(current) }]
    }
    setRooms(merged)
    if (merged.length) setSelectedRoomId(merged[0].id)
  }, [])

  function createEvent() {
    const id = `e-${Date.now()}`
    const ev: EventItem = { id, name: eventName || `Event ${new Date().toLocaleDateString()}`, eventDate: eventDate || undefined, from: fromTime || undefined, to: toTime || undefined }
    const all = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]') as EventItem[]
    if (useExistingRoom === 'existing' && selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId)
      if (room) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(room.data))
        ev.roomId = room.id
      }
      localStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(ev))
      localStorage.setItem(EVENTS_KEY, JSON.stringify([...all, ev]))
      navigate('/room')
    } else {
      localStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(ev))
      localStorage.setItem(EVENTS_KEY, JSON.stringify([...all, ev]))
      navigate('/new-room')
    }
  }

  return (
    <div className="container">
      <h1>Event-Start</h1>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => setShowEventModal(true)}>Neues Event anlegen</button>
        <Link to="/load-event"><button>Event laden</button></Link>
        <Link to="/load-room"><button>Raum laden</button></Link>
        <Link to="/new-room"><button>Raum anlegen</button></Link>
      </div>

      {showEventModal && (
        <div className="modal">
          <div className="modal-content" style={{ minWidth: 360 }}>
            <h3>Neues Event anlegen</h3>
            <input type="text" placeholder="Eventname" value={eventName} onChange={e => setEventName(e.target.value)} />
            <input type="date" placeholder="Datum" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ marginTop: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input type="time" placeholder="von" value={fromTime} onChange={e => setFromTime(e.target.value)} />
              <input type="time" placeholder="bis" value={toTime} onChange={e => setToTime(e.target.value)} />
            </div>
            <div style={{ marginTop: 8 }}>
              <label><input type="radio" checked={useExistingRoom === 'existing'} onChange={() => setUseExistingRoom('existing')} /> Bestehenden Raum verwenden</label>
              {useExistingRoom === 'existing' && (
                <select style={{ width: '100%', marginTop: 6 }} value={selectedRoomId} onChange={e => setSelectedRoomId(e.target.value)}>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              )}
              <label style={{ display: 'block', marginTop: 8 }}>
                <input type="radio" checked={useExistingRoom === 'new'} onChange={() => setUseExistingRoom('new')} /> Neuen Raum anlegen
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={createEvent}>Weiter</button>
              <button onClick={() => setShowEventModal(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}