import express from 'express'
import pool from '../db'
import { requireAuth } from '../middleware/authMiddleware'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

router.use(requireAuth)

router.get('/', async (req, res) => {
  const user = (req as any).user
  const r = await pool.query('SELECT id, title, data, created_at, updated_at FROM events WHERE user_id=$1 ORDER BY created_at DESC', [user.id])
  if ((req as any).log && typeof (req as any).log === 'function') {
    (req as any).log('info', 'events', { action: 'list', user: user.id, count: r.rowCount })
  } else {
    // fallback
    const logger = require('../logger').default
    logger.info('events', { action: 'list', user: user.id, count: r.rowCount })
  }
  res.json(r.rows)
})

router.post('/', async (req, res) => {
  const user = (req as any).user
  const { id, title, data } = req.body
  if (!title || !data) return res.status(400).json({ error: 'Missing fields' })

  if (id) {
    const existing = await pool.query('SELECT user_id FROM events WHERE id=$1', [id])
    if ((existing.rowCount ?? 0) > 0) {
      const owner = existing.rows[0].user_id
      if (owner !== user.id) return res.status(403).json({ error: 'Not allowed' })
      await pool.query('UPDATE events SET title=$1, data=$2, updated_at=now() WHERE id=$3 AND user_id=$4', [title, data, id, user.id])
      const r = await pool.query('SELECT id, title, data, created_at, updated_at FROM events WHERE id=$1 AND user_id=$2', [id, user.id])
      if ((req as any).log && typeof (req as any).log === 'function') {
        (req as any).log('info', 'events', { action: 'update', user: user.id, event: id })
      } else {
        const logger = require('../logger').default
        logger.info('events', { action: 'update', user: user.id, event: id })
      }
      return res.json(r.rows[0])
    }
  }

  const eventId = id || uuidv4()
  await pool.query('INSERT INTO events(id,user_id,title,data) VALUES($1,$2,$3,$4)', [eventId, user.id, title, data])
  const r = await pool.query('SELECT id, title, data, created_at, updated_at FROM events WHERE id=$1', [eventId])
  if ((req as any).log && typeof (req as any).log === 'function') {
    (req as any).log('info', 'events', { action: 'create', user: user.id, event: eventId })
  } else {
    const logger = require('../logger').default
    logger.info('events', { action: 'create', user: user.id, event: eventId })
  }
  res.status(201).json(r.rows[0])
})

router.get('/:id', async (req, res) => {
  const user = (req as any).user
  const { id } = req.params
  const r = await pool.query('SELECT id, title, data, created_at, updated_at FROM events WHERE id=$1 AND user_id=$2', [id, user.id])
  if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
  if ((req as any).log && typeof (req as any).log === 'function') {
    ;(req as any).log('debug', 'events', { action: 'get', user: user.id, event: id })
  }
  res.json(r.rows[0])
})

router.delete('/:id', async (req, res) => {
  const user = (req as any).user
  const { id } = req.params
  try {
    const r = await pool.query('DELETE FROM events WHERE id=$1 AND user_id=$2 RETURNING id', [id, user.id])
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found or not allowed' })
    if ((req as any).log && typeof (req as any).log === 'function') {
      (req as any).log('info', 'events', { action: 'delete', user: user.id, event: id })
    } else {
      const logger = require('../logger').default
      logger.info('events', { action: 'delete', user: user.id, event: id })
    }
    return res.json({ ok: true })
  } catch (err) {
    const logger = require('../logger').default
    logger.error('events', { action: 'delete-error', err })
    return res.status(500).json({ error: 'Delete failed' })
  }
})

// Batch sync endpoint for unload/keepalive requests
router.post('/batch', async (req, res) => {
  const user = (req as any).user
  const { events, rooms } = req.body || {}
  if (!events || !Array.isArray(events)) return res.status(400).json({ error: 'Missing events array' })
  try {
    for (const ev of events) {
      const id = ev.id
      const title = ev.title
      const data = ev.data
      if (!id || !title || !data) continue
      const existing = await pool.query('SELECT user_id FROM events WHERE id=$1', [id])
      if ((existing.rowCount ?? 0) > 0) {
        const owner = existing.rows[0].user_id
        if (owner !== user.id) continue
        await pool.query('UPDATE events SET title=$1, data=$2, updated_at=now() WHERE id=$3 AND user_id=$4', [title, data, id, user.id])
      } else {
        await pool.query('INSERT INTO events(id,user_id,title,data) VALUES($1,$2,$3,$4)', [id, user.id, title, data])
      }
    }
    // persist rooms as a system event if provided
    if (rooms && Array.isArray(rooms) && rooms.length) {
      const systemId = `tm-rooms-${user.id}`
      const systemPayload = { _system: true, name: '__rooms__', rooms }
      const existing = await pool.query('SELECT user_id FROM events WHERE id=$1', [systemId])
      if ((existing.rowCount ?? 0) > 0) {
        await pool.query('UPDATE events SET title=$1, data=$2, updated_at=now() WHERE id=$3 AND user_id=$4', ['__rooms__', systemPayload, systemId, user.id])
      } else {
        await pool.query('INSERT INTO events(id,user_id,title,data) VALUES($1,$2,$3,$4)', [systemId, user.id, '__rooms__', systemPayload])
      }
    }
    return res.json({ ok: true })
  } catch (err) {
    const logger = require('../logger').default
    logger.error('events', { action: 'batch-sync-error', err })
    return res.status(500).json({ error: 'Batch sync failed' })
  }
})

export default router
