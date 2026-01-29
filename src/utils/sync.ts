import api from '../api/apiClient'
import userStorage from './userStorage'
import logger from './logger'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

function dedupeRooms(list: any[]): any[] {
  const map = new Map<string, any>()
  for (const r of list) {
    if (!r) continue
    const id = r.id || r.roomId
    if (!id) continue
    if (!map.has(id)) map.set(id, r)
  }
  return Array.from(map.values())
}

export async function hydrateUserData(token: string | null, userId: string | null) {
  if (!token || !userId) return
  try {
    const raw = await api.get('/events', token)
    if (!raw || !Array.isArray(raw)) return

    const mapped: any[] = []
    const normalized: any[] = []
    for (const ev of raw) {
      const base: any = { id: ev.id }
      base.name = ev.title || ev.name || (ev.data && ev.data.name) || 'Event'
      base.createdAt = ev.created_at || ev.createdAt || (ev.data && ev.data.createdAt)
      base.updatedAt = ev.updated_at || ev.updatedAt || (ev.data && ev.data.updatedAt)
      if (ev.data && typeof ev.data === 'object') Object.assign(base, ev.data)
      normalized.push(base)
      const isSystem = base._system === true || ev.title === '__rooms__' || base.name === '__rooms__'
      if (!isSystem) mapped.push(base)
    }
    try { userStorage.setItem('events', JSON.stringify(mapped), userId) } catch (e) {}

    const roomMap = new Map<string, any>()
    for (const ev of normalized) {
      if (ev.rooms && Array.isArray(ev.rooms)) {
        for (const r of ev.rooms) {
          try {
            const id = r.id || `r-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
            if (!roomMap.has(id)) roomMap.set(id, { id, name: r.name || 'Imported Raum', data: r.data || r })
          } catch(e) {}
        }
      } else if (ev.room && typeof ev.room === 'object') {
        try {
          const id = ev.room.id || `r-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
          if (!roomMap.has(id)) roomMap.set(id, { id, name: ev.room.name || 'Imported Raum', data: ev.room.data || ev.room })
        } catch(e) {}
      }
    }
    const rooms = Array.from(roomMap.values())
    if (rooms.length) {
      try { userStorage.setItem('rooms', JSON.stringify(rooms), userId) } catch (e) {}
      try {
        const rawCurrent = userStorage.getItem('currentEvent', userId) || localStorage.getItem('currentEvent')
        if (!rawCurrent && mapped.length) {
          const first = mapped[0]
          userStorage.setItem('currentEvent', JSON.stringify(first), userId)
          if (first.roomId) {
            const room = rooms.find(r => r.id === first.roomId)
            if (room) userStorage.setItem('currentRoom', JSON.stringify(room.data), userId)
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    logger.error('sync', { action: 'hydrate', err })
  }
}

export async function syncUserData(token: string | null, userId: string | null) {
  if (!token || !userId) return
  const eventsRaw = userStorage.getItem('events', userId) || localStorage.getItem('events') || '[]'
  const roomsRaw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms') || '[]'
  const events = safeParse<any[]>(eventsRaw, [])
  const roomsList = dedupeRooms(safeParse<any[]>(roomsRaw, []))

  // internal sync implementation
  async function doSync() {
    // Always persist a system record for rooms to allow cross-browser sync even without events
    if (roomsList.length) {
      try {
        const systemId = `tm-rooms-${userId}`
        const systemPayload = { _system: true, name: '__rooms__', rooms: roomsList }
        await api.post('/events', { id: systemId, title: '__rooms__', data: systemPayload }, token ?? undefined)
      } catch (err) {
        logger.error('sync', { action: 'sync-rooms-system', err })
        throw err
      }
    }

    // Sync each event as an upsert on the backend
    for (const ev of events) {
      try {
        // Ensure all event-related data is embedded in payload data
        const data: any = { ...(ev?.data || {}), ...ev }
        // normalize frequently used fields
        if (ev?.groups) data.groups = ev.groups
        if (ev?.assignedGroups) data.assignedGroups = ev.assignedGroups
        if (ev?.roomId) data.roomId = ev.roomId
        if (ev?.lastModified) data.lastModified = ev.lastModified
        if (ev?.eventDate) data.eventDate = ev.eventDate
        if (ev?.from) data.from = ev.from
        if (ev?.to) data.to = ev.to
        if (ev?.createdAt) data.createdAt = ev.createdAt

        if (roomsList.length) data.rooms = roomsList
        if (ev && ev.roomId) {
          const room = roomsList.find(r => r.id === ev.roomId)
          if (room) data.room = room
        }

        const title = ev?.name || ev?.title || (ev?.data && ev.data.title) || 'Event'
        const id = ev?.id
        await api.post('/events', { id, title, data }, token ?? undefined)
      } catch (err) {
        logger.error('sync', { action: 'sync-event', err })
        throw err
      }
    }
  }

  // Simple retry wrapper with exponential backoff
  const maxRetries = 3
  let attempt = 0
  let lastErr: any = null
  while (attempt < maxRetries) {
    try {
      await doSync()
      return
    } catch (err) {
      lastErr = err
      attempt += 1
      const delay = Math.pow(2, attempt - 1) * 1000
      await new Promise(r => setTimeout(r, delay))
    }
  }
  // after retries, throw
  throw lastErr
}

// Attempt a compact sync suitable for page unload: single POST with keepalive
export async function syncUserDataOnUnload(token: string | null, userId: string | null) {
  if (!token || !userId) return
  const eventsRaw = userStorage.getItem('events', userId) || localStorage.getItem('events') || '[]'
  const roomsRaw = userStorage.getItem('rooms', userId) || localStorage.getItem('rooms') || '[]'
  const events = safeParse<any[]>(eventsRaw, [])
  const roomsList = dedupeRooms(safeParse<any[]>(roomsRaw, []))

  // determine backend base (same logic as apiClient)
  const BUILD_BASE = (import.meta as any).env?.VITE_API_URL
  let BASE = BUILD_BASE
  if (!BASE) {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const proto = window.location.protocol
        const host = window.location.hostname
        BASE = `${proto}//${host}:4000`
      }
    } catch (e) {
      BASE = 'http://localhost:4000'
    }
  }

  const payload = { events: events.map(e => ({ id: e.id, title: e.name || e.title || 'Event', data: { ...(e.data || {}), ...e, rooms: roomsList } })), rooms: roomsList }
  try {
    // use fetch keepalive to attempt sending before unload
    void fetch(`${BASE}/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch (e) {
    // best-effort
  }
}

export default { syncUserData, syncUserDataOnUnload }
