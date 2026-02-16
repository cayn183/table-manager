import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import userStorage from '../utils/userStorage'
import api from '../api/apiClient'
import { hydrateUserData, syncUserData } from '../utils/sync'
import { useSetPageHeader } from './PageHeaderContext'

type SavedRoom = { id: string; name: string; createdAt: string; data: any }
type EventItem = { id: string; name: string; roomId?: string }

const ROOMS_KEY = 'rooms'
const STORAGE_KEY = 'currentRoom'
const EVENTS_KEY = 'events'
const CURRENT_EVENT_KEY = 'currentEvent'

export default function LoadRoom() {
  const navigate = useNavigate()
  const auth = useAuth()
  const userId = auth.user ? auth.user.id : null
  const [rooms, setRooms] = useState<SavedRoom[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ room: SavedRoom; linkedEvents: EventItem[] } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  useSetPageHeader('Raum laden', '🏠')

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
    navigate(`/app/rooms/${room.id}`)
  }

  function askDeleteRoom(room: SavedRoom) {
    const rawEvents = userStorage.getItem(EVENTS_KEY, userId) || localStorage.getItem(EVENTS_KEY) || '[]'
    const allEvents = JSON.parse(rawEvents as string) as EventItem[]
    const linkedEvents = allEvents.filter(e => e.roomId === room.id)
    if (linkedEvents.length > 0) {
      setDeleteConfirm({ room, linkedEvents })
      return
    }
    void confirmDeleteRoom(room, [])
  }

  async function confirmDeleteRoom(room: SavedRoom, linkedEvents: EventItem[]) {
    if (isDeleting) return
    setIsDeleting(true)

    const updatedRooms = rooms.filter(r => r.id !== room.id)
    userStorage.setItem(ROOMS_KEY, JSON.stringify(updatedRooms), userId)
    setRooms(updatedRooms)

    const linkedIds = new Set(linkedEvents.map(e => e.id))
    if (linkedIds.size > 0) {
      const rawEvents = userStorage.getItem(EVENTS_KEY, userId) || localStorage.getItem(EVENTS_KEY) || '[]'
      const allEvents = JSON.parse(rawEvents as string) as EventItem[]
      const updatedEvents = allEvents.filter(e => !linkedIds.has(e.id))
      userStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents), userId)

      const rawCurrentEvent = userStorage.getItem(CURRENT_EVENT_KEY, userId) || localStorage.getItem(CURRENT_EVENT_KEY)
      if (rawCurrentEvent) {
        try {
          const currentEvent = JSON.parse(rawCurrentEvent as string) as EventItem
          if (linkedIds.has(currentEvent.id)) {
            userStorage.removeItem(CURRENT_EVENT_KEY, userId)
            localStorage.removeItem(CURRENT_EVENT_KEY)
          }
        } catch (e) {}
      }

      for (const event of linkedEvents) {
        try { await api.del(`/events/${event.id}`, auth.token ?? undefined) } catch (e) {}
      }
    }

    const rawCurrentRoom = userStorage.getItem(STORAGE_KEY, userId) || localStorage.getItem(STORAGE_KEY)
    if (rawCurrentRoom) {
      try {
        const currentRoom = JSON.parse(rawCurrentRoom as string)
        if (JSON.stringify(currentRoom?.tables || []) === JSON.stringify(room.data?.tables || [])) {
          userStorage.removeItem(STORAGE_KEY, userId)
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (e) {}
    }

    try {
      if (userId) await syncUserData(auth.token, userId)
    } catch (e) {}

    setDeleteConfirm(null)
    setIsDeleting(false)
  }

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                  onClick={() => askDeleteRoom(room)} 
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

      {deleteConfirm && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, minWidth: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: 0, marginBottom: 10, fontSize: 22, color: '#1e293b' }}>Raum wirklich löschen?</h3>
            <p style={{ margin: '0 0 14px', color: '#475569', fontSize: 14 }}>
              Der Raum „{deleteConfirm.room.name}“ ist noch mit folgenden Events verknüpft und wird zusammen mit ihnen gelöscht:
            </p>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 16 }}>
              {deleteConfirm.linkedEvents.map(ev => (
                <div key={ev.id} style={{ padding: '6px 4px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#0f172a' }}>
                  • {ev.name || 'Unbenanntes Event'}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                style={{ padding: '10px 16px', background: 'white', border: '2px solid #e2e8f0', color: '#64748b', borderRadius: 8, cursor: isDeleting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
              >Abbrechen</button>
              <button
                onClick={() => confirmDeleteRoom(deleteConfirm.room, deleteConfirm.linkedEvents)}
                disabled={isDeleting}
                style={{ padding: '10px 16px', background: '#ef4444', border: 'none', color: 'white', borderRadius: 8, cursor: isDeleting ? 'not-allowed' : 'pointer', fontWeight: 700 }}
              >{isDeleting ? 'Löscht…' : 'Bestätigen & löschen'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
