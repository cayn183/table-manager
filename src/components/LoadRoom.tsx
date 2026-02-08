import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import userStorage from '../utils/userStorage'
import { hydrateUserData, syncUserData } from '../utils/sync'

type SavedRoom = { id: string; name: string; createdAt: string; data: any }

const ROOMS_KEY = 'rooms'
const STORAGE_KEY = 'currentRoom'

export default function LoadRoom() {
  const navigate = useNavigate()
  const auth = useAuth()
  const userId = auth.user ? auth.user.id : null
  const [rooms, setRooms] = useState<SavedRoom[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (userId) {
        await hydrateUserData(auth.token, userId)
      }
      if (!mounted) return
      // Prefer user-scoped storage, fall back to legacy global keys if needed.
      const raw = userStorage.getItem(ROOMS_KEY, userId) || localStorage.getItem(ROOMS_KEY) || '[]'
      const list = JSON.parse(raw as string) as SavedRoom[]
      setRooms(list)
    })()
    return () => { mounted = false }
  }, [userId, auth.token])

  function loadRoom(room: SavedRoom) {
    userStorage.setItem(STORAGE_KEY, JSON.stringify(room.data), userId)
    navigate('/room')
  }

  function deleteRoom(id: string) {
    const updated = rooms.filter(r => r.id !== id)
    userStorage.setItem(ROOMS_KEY, JSON.stringify(updated), userId)
    setRooms(updated)
    try {
      if (userId) {
        void syncUserData(auth.token, userId)
      }
    } catch (e) {}
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
        <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '600', color: 'white' }}>🏠 Raum laden</h1>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px 24px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🏠</p>
          <p style={{ fontSize: '18px', color: '#64748b', margin: 0 }}>Keine gespeicherten Räume vorhanden.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rooms.map(room => (
            <div
              key={room.id}
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
                <h3 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>{room.name}</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#667eea', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                    {room.data.tables?.length || 0} Tische
                  </span>
                  <span style={{ padding: '4px 12px', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                    Erstellt: {room.createdAt}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => loadRoom(room)}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(102,126,234,0.3)', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >Laden</button>
                <button 
                  onClick={() => deleteRoom(room.id)} 
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
