import express from 'express'
import pool from '../db'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/authMiddleware'
import { checkEmailLimiter, loginLimiter, registerLimiter } from '../middleware/rateLimit'
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
const JWT_SECRET = process.env.JWT_SECRET as string
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'tm_token'
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'

function normalizeSameSite(value: string): 'lax' | 'strict' | 'none' {
  const lower = value.toLowerCase()
  if (lower === 'strict' || lower === 'none') return lower
  return 'lax'
}

function cookieOptions() {
  const sameSite = normalizeSameSite(process.env.COOKIE_SAMESITE || 'lax')
  const opts: any = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
  if (COOKIE_DOMAIN) opts.domain = COOKIE_DOMAIN
  return opts
}

router.post('/register', registerLimiter, async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' })
  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email])
  if ((existing.rowCount ?? 0) > 0) return res.status(400).json({ error: 'Email exists' })
  const id = uuidv4()
  const hash = await bcrypt.hash(password, 12)
  await pool.query('INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)', [id, name, email, hash])
  const token = jwt.sign({ email, sub: id }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie(COOKIE_NAME, token, cookieOptions())
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
  res.status(201).json({ token, user: { id, name, email, is_admin: false } })
})

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })
  const r = await pool.query('SELECT id, name, password_hash, is_admin FROM users WHERE email=$1', [email])
  if (r.rowCount === 0) {
    logger.warn('auth', { action: 'login-failed', reason: 'not-found', email, requestId: (req as any).requestId })
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const u = r.rows[0]
  const ok = await bcrypt.compare(password, u.password_hash)
  if (!ok) {
    logger.warn('auth', { action: 'login-failed', reason: 'invalid-credentials', email, requestId: (req as any).requestId })
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = jwt.sign({ email, sub: u.id }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie(COOKIE_NAME, token, cookieOptions())
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
  res.json({ token, user: { id: u.id, name: u.name, email, is_admin: !!u.is_admin } })
})

// Check if email is already registered
router.post('/check-email', checkEmailLimiter, async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Missing email' })
  const r = await pool.query('SELECT 1 FROM users WHERE email=$1', [email])
  const exists = (r.rowCount ?? 0) > 0
  res.json({ exists })
})

router.get('/me', requireAuth, async (req, res) => {
  const userId = (req as any).user?.id
  const r = await pool.query('SELECT id, name, email, created_at, is_admin FROM users WHERE id=$1', [userId])
  if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' })
  res.json(r.rows[0])
})

// Get simple user stats (requires auth)
router.get('/stats', requireAuth, async (req, res) => {
  const userId = (req as any).user?.id
  const eventsR = await pool.query('SELECT COUNT(*)::int as cnt FROM events WHERE user_id=$1', [userId])
  const roomsR = await pool.query('SELECT COUNT(*)::int as cnt FROM rooms r JOIN events e ON r.event_id = e.id WHERE e.user_id=$1', [userId])
  res.json({ events: eventsR.rows[0].cnt || 0, rooms: roomsR.rows[0].cnt || 0 })
})

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' })
  const userId = (req as any).user?.id
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
})

// Delete current authenticated account (and cascade delete related events)
router.delete('/me', requireAuth, async (req, res) => {
  const userId = (req as any).user?.id
  // remove user (ON DELETE CASCADE will remove events/rooms)
  await pool.query('DELETE FROM users WHERE id=$1', [userId])
  if ((req as any).log && typeof (req as any).log === 'function') {
    (req as any).log('info', 'auth', { action: 'delete-account', user: userId })
  } else {
    logger.info('auth', { action: 'delete-account', user: userId })
  }
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 })
  return res.json({ ok: true })
})

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 })
  return res.json({ ok: true })
})

export default router
