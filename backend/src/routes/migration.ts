import express from 'express'
import pool from '../db'
import { requireAuth } from '../middleware/authMiddleware'
import { v4 as uuidv4 } from 'uuid'
import logger from '../logger'

const router = express.Router()

router.use(requireAuth)

// Import local storage payload as a single Event for the authenticated user
// Expects body: { title?: string, payload: object }
router.post('/import', async (req, res) => {
  const user = (req as any).user
  const { title, payload } = req.body
  if (!payload) return res.status(400).json({ error: 'Missing payload' })
  const eventTitle = title || `Imported ${new Date().toISOString()}`
  const id = uuidv4()
  try {
    await pool.query('INSERT INTO events(id,user_id,title,data) VALUES($1,$2,$3,$4)', [id, user.id, eventTitle, payload])
    const r = await pool.query('SELECT id, title, data, created_at FROM events WHERE id=$1', [id])
    ;(req as any).log('info', 'migration', { user: user.id, event: id })
    res.status(201).json(r.rows[0])
  } catch (err) {
    ;(req as any).log('error', 'migration', { msg: 'migration import error', err })
    res.status(500).json({ error: 'Import failed' })
  }
})

export default router
