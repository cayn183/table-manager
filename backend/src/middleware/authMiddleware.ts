import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import pool from '../db'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    ;(req as any).user = { id: payload.sub, email: payload.email }
    next()
  } catch (err) {
    try {
      const logger = require('../logger').default
      logger.warn('auth', 'Invalid token provided')
    } catch (e) {
      // ignore
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    const userId = payload.sub
    const r = await pool.query('SELECT is_admin FROM users WHERE id=$1', [userId])
    if (r.rowCount === 0) return res.status(401).json({ error: 'User not found' })
    const isAdmin = r.rows[0].is_admin === true
    if (!isAdmin) return res.status(403).json({ error: 'Admin role required' })
    ;(req as any).user = { id: userId, email: payload.email, is_admin: true }
    next()
  } catch (err) {
    try { const logger = require('../logger').default; logger.warn('auth', 'Invalid token provided') } catch (e) {}
    return res.status(401).json({ error: 'Invalid token' })
  }
}
