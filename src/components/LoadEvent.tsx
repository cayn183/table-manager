import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type EventItem = { id: string; name: string; from?: string; to?: string; roomId?: string; createdAt?: string; lastModified?: string; eventDate?: string; assignedGroups?: any; groups?: any }

const EVENTS_KEY = 'events'
const CURRENT_EVENT_KEY = 'currentEvent'
const STORAGE_KEY = 'currentRoom'
const ROOMS_KEY = 'rooms'

export default function LoadEvent() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]') as EventItem[]
    setEvents(list)
  }, [])

  function loadEvent(event: EventItem) {
    localStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(event))
    if (event.roomId) {
      const rooms = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]')
      const room = rooms.find((r: any) => r.id === event.roomId)
      if (room) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(room.data))
      }
    }
    navigate('/room')
  }

  function deleteEvent(id: string) {
    const updated = events.filter(e => e.id !== id)
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated))
    setEvents(updated)
  }

  return (
    <div className="container">
      <h1>Event laden</h1>
      {events.length === 0 ? (
        <p>Keine gespeicherten Events vorhanden.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(event => (
            <div
              key={event.id}
              style={{
                padding: 12,
                border: '1px solid #ccc',
                borderRadius: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px' }}>{event.name}</h3>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#666' }}>
                  {event.eventDate ? event.eventDate : 'Kein Datum'} {event.from ? `| ${event.from}` : ''}{event.to ? ` - ${event.to}` : ''}
                </p>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: '#999' }}>
                  Erstellt: {event.createdAt || 'unbekannt'}
                </p>
                {event.lastModified && <p style={{ margin: 0, fontSize: 11, color: '#999' }}>Zuletzt geändert: {event.lastModified}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => loadEvent(event)}>Laden</button>
                <button onClick={() => deleteEvent(event.id)} style={{ background: '#f44336', color: '#fff' }}>Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
