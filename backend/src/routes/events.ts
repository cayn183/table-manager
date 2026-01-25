import express from 'express'
import pool from '../db'
import { requireAuth } from '../middleware/authMiddleware'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

router.use(requireAuth)

router.get('/', async (req, res) => {
  const user = (req as any).user
  const r = await pool.query('SELECT id, title, data, created_at FROM events WHERE user_id=$1 ORDER BY created_at DESC', [user.id])
  res.json(r.rows)
})

router.post('/', async (req, res) => {
  const user = (req as any).user
  const { title, data } = req.body
  if (!title || !data) return res.status(400).json({ error: 'Missing fields' })
  const id = uuidv4()
  await pool.query('INSERT INTO events(id,user_id,title,data) VALUES($1,$2,$3,$4)', [id, user.id, title, data])
  const r = await pool.query('SELECT id, title, data, created_at FROM events WHERE id=$1', [id])
  res.status(201).json(r.rows[0])
})

router.get('/:id', async (req, res) => {
  const user = (req as any).user
  const { id } = req.params
  const r = await pool.query('SELECT id, title, data, created_at FROM events WHERE id=$1 AND user_id=$2', [id, user.id])
  if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' })
  res.json(r.rows[0])
})

export default router
