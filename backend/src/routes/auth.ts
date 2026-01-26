import express from 'express'
import pool from '../db'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
let Sentry: any = null
try {
  // optional: only present if backend installed @sentry/node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sentry = require('@sentry/node')
} catch (e) {
  Sentry = null
}
import logger from '../logger'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' })
  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email])
  if ((existing.rowCount ?? 0) > 0) return res.status(400).json({ error: 'Email exists' })
  const id = uuidv4()
  const hash = await bcrypt.hash(password, 12)
  await pool.query('INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)', [id, name, email, hash])
  const token = jwt.sign({ email, sub: id }, JWT_SECRET, { expiresIn: '7d' })
  if ((req as any).log && typeof (req as any).log === 'function') {
    (req as any).log('info', 'auth', { action: 'register', user: id, email })
  } else {
    logger.info('auth', { action: 'register', user: id, email })
  }
  if (Sentry) {
    try {
      Sentry.configureScope((scope: any) => {
        scope.setUser({ id })
        scope.setTag('requestId', (req as any).requestId)
      })
    } catch (e) {
      // ignore
    }
  }
  res.status(201).json({ token, user: { id, name, email } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })
  const r = await pool.query('SELECT id, name, password_hash FROM users WHERE email=$1', [email])
  if (r.rowCount === 0) return res.status(404).json({ error: 'Nutzer nicht gefunden. Neu registrieren?' })
  const u = r.rows[0]
  const ok = await bcrypt.compare(password, u.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ email, sub: u.id }, JWT_SECRET, { expiresIn: '7d' })
  if ((req as any).log && typeof (req as any).log === 'function') {
    (req as any).log('info', 'auth', { action: 'login', user: u.id, email })
  } else {
    logger.info('auth', { action: 'login', user: u.id, email })
  }
  if (Sentry) {
    try {
      Sentry.configureScope((scope: any) => {
        scope.setUser({ id: u.id })
        scope.setTag('requestId', (req as any).requestId)
      })
    } catch (e) {
      // ignore
    }
  }
  res.json({ token, user: { id: u.id, name: u.name, email } })
})

// Check if email is already registered
router.post('/check-email', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Missing email' })
  const r = await pool.query('SELECT 1 FROM users WHERE email=$1', [email])
  const exists = (r.rowCount ?? 0) > 0
  res.json({ exists })
})

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  try {
    const token = auth.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as any
    const r = await pool.query('SELECT id, name, email, created_at FROM users WHERE id=$1', [payload.sub])
    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// Get simple user stats (requires auth)
router.get('/stats', async (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  try {
    const token = auth.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as any
    const userId = payload.sub
    const eventsR = await pool.query('SELECT COUNT(*)::int as cnt FROM events WHERE user_id=$1', [userId])
    const roomsR = await pool.query('SELECT COUNT(*)::int as cnt FROM rooms r JOIN events e ON r.event_id = e.id WHERE e.user_id=$1', [userId])
    res.json({ events: eventsR.rows[0].cnt || 0, rooms: roomsR.rows[0].cnt || 0 })
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// Change password
router.post('/change-password', async (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' })
  try {
    const token = auth.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as any
    const userId = payload.sub
    const r = await pool.query('SELECT password_hash FROM users WHERE id=$1', [userId])
    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const ok = await bcrypt.compare(oldPassword, r.rows[0].password_hash)
    if (!ok) return res.status(401).json({ error: 'Altes Passwort stimmt nicht' })
    const hash = await bcrypt.hash(newPassword, 12)
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, userId])
    if ((req as any).log && typeof (req as any).log === 'function') {
      (req as any).log('info', 'auth', { action: 'change-password', user: userId })
    } else {
      logger.info('auth', { action: 'change-password', user: userId })
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// Delete current authenticated account (and cascade delete related events)
router.delete('/me', async (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  try {
    const token = auth.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as any
    const userId = payload.sub
    // remove user (ON DELETE CASCADE will remove events/rooms)
    await pool.query('DELETE FROM users WHERE id=$1', [userId])
    if ((req as any).log && typeof (req as any).log === 'function') {
      (req as any).log('info', 'auth', { action: 'delete-account', user: userId })
    } else {
      logger.info('auth', { action: 'delete-account', user: userId })
    }
    return res.json({ ok: true })
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
