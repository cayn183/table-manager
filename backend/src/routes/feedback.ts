import express from 'express'
import pool from '../db'
import logger from '../logger'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// Public feedback submission
router.post('/', async (req, res) => {
  const { message, email, metadata } = req.body || {}
  const userId = (req as any).user?.id || null
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message is required' })
  }
  try {
    const id = uuidv4()
    await pool.query('INSERT INTO feedback(id, user_id, email, message, metadata) VALUES($1,$2,$3,$4,$5)', [id, userId, email || null, message, metadata || {}])
    res.json({ ok: true })
  } catch (err) {
    logger.error('feedback', { action: 'submit', err })
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

export default router
