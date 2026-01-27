import express from 'express'
import pool from '../db'
import { requireAdmin } from '../middleware/authMiddleware'
import logger from '../logger'

const router = express.Router()

// List users (admin only). Simple pagination & optional query by email
router.get('/users', requireAdmin, async (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10)
  const perPage = parseInt((req.query.perPage as string) || '50', 10)
  const q = (req.query.q as string) || ''
  const offset = (page - 1) * perPage
  try {
    const params: any[] = []
    let where = 'WHERE true'
    if (q) {
      where += ' AND (email ILIKE $1 OR name ILIKE $1)'
      params.push(`%${q}%`)
    }
    const totalR = await pool.query(`SELECT COUNT(*)::int as cnt FROM users ${where}`, params)
    const total = totalR.rows[0].cnt || 0
    if (q) params.push(perPage, offset)
    else params.push(perPage, offset)
    const usersR = await pool.query(`SELECT id, name, email, created_at, is_admin, deleted_at FROM users ${where} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params)
    res.json({ total, users: usersR.rows })
  } catch (err) {
    logger.error('admin', { action: 'list-users', err })
    res.status(500).json({ error: 'Failed to list users' })
  }
})

// Get user details
router.get('/users/:id', requireAdmin, async (req, res) => {
  const id = req.params.id
  try {
    const r = await pool.query('SELECT id, name, email, created_at, is_admin, deleted_at FROM users WHERE id=$1', [id])
    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    res.json(r.rows[0])
  } catch (err) {
    logger.error('admin', { action: 'get-user', err })
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// Toggle/set admin role (body: { is_admin: boolean })
router.post('/users/:id/role', requireAdmin, async (req, res) => {
  const id = req.params.id
  const { is_admin } = req.body
  const actor = (req as any).user?.id || null
  try {
    await pool.query('UPDATE users SET is_admin=$1, admin_granted_by=$2, admin_granted_at=CASE WHEN $1 THEN now() ELSE admin_granted_at END WHERE id=$3', [!!is_admin, actor, id])
    res.json({ ok: true })
  } catch (err) {
    logger.error('admin', { action: 'set-role', err })
    res.status(500).json({ error: 'Failed to set role' })
  }
})

// Soft-delete user (mark deleted_at)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const id = req.params.id
  const actor = (req as any).user?.id || null
  try {
    await pool.query('UPDATE users SET deleted_at = now(), deleted_by = $1 WHERE id=$2', [actor, id])
    res.json({ ok: true })
  } catch (err) {
    logger.error('admin', { action: 'delete-user', err })
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// Purge user and cascade delete (dangerous, admin only)
router.post('/users/:id/purge', requireAdmin, async (req, res) => {
  const id = req.params.id
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [id])
    res.json({ ok: true })
  } catch (err) {
    logger.error('admin', { action: 'purge-user', err })
    res.status(500).json({ error: 'Failed to purge user' })
  }
})

export default router
