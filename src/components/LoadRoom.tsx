import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type SavedRoom = { id: string; name: string; createdAt: string; data: any }

const ROOMS_KEY = 'rooms'
const STORAGE_KEY = 'currentRoom'

export default function LoadRoom() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<SavedRoom[]>([])

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]') as SavedRoom[]
    setRooms(list)
  }, [])

  function loadRoom(room: SavedRoom) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(room.data))
    navigate('/room')
  }

  function deleteRoom(id: string) {
    const updated = rooms.filter(r => r.id !== id)
    localStorage.setItem(ROOMS_KEY, JSON.stringify(updated))
    setRooms(updated)
  }

  return (
    <div className="container">
      <h1>Raum laden</h1>
      {rooms.length === 0 ? (
        <p>Keine gespeicherten Räume vorhanden.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rooms.map(room => (
            <div
              key={room.id}
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
                <h3 style={{ margin: '0 0 4px' }}>{room.name}</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
                  Erstellt: {room.createdAt} | {room.data.tables?.length || 0} Tische
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => loadRoom(room)}>Laden</button>
                <button onClick={() => deleteRoom(room.id)} style={{ background: '#f44336', color: '#fff' }}>Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
