import express from 'express'
import pool from '../db'
import logger from '../logger'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// Public feedback submission
router.post('/', async (req, res) => {
  const { headline, message, email, metadata } = req.body || {}
  const userId = (req as any).user?.id || null
  // require headline, but allow empty message (no description)
  if (!headline || typeof headline !== 'string' || headline.trim().length === 0) {
    return res.status(400).json({ error: 'headline is required' })
  }
  try {
    const id = uuidv4()
    await pool.query('INSERT INTO feedback(id, user_id, email, headline, message, metadata) VALUES($1,$2,$3,$4,$5,$6)', [id, userId, email || null, headline || null, (message || ''), metadata || {}])
    res.json({ ok: true })
  } catch (err) {
    logger.error('feedback', { action: 'submit', err })
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

export default router
