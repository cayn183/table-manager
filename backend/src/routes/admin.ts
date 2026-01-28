import express from 'express'
import pool from '../db'
import { requireAdmin } from '../middleware/authMiddleware'
import logger from '../logger'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// List users (admin only). Simple pagination & optional query by email
router.get('/users', requireAdmin, async (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10)
  const perPage = parseInt((req.query.perPage as string) || '50', 10)
  const q = (req.query.q as string) || ''
  const offset = (page - 1) * perPage
  try {
    const params: any[] = []
    let whereClauses: string[] = []
    if (q) {
      params.push(`%${q}%`)
      whereClauses.push(`(email ILIKE $${params.length} OR name ILIKE $${params.length})`)
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''
    const totalR = await pool.query(`SELECT COUNT(*)::int as cnt FROM users ${where}`, params)
    const total = totalR.rows[0].cnt || 0
    // pagination params
    params.push(perPage)
    params.push(offset)
    const limitIdx = params.length - 1
    const offsetIdx = params.length
    const usersR = await pool.query(
      `SELECT id, name, email, created_at, is_admin, deleted_at FROM users ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    )
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
    // Insert audit record
    await pool.query('INSERT INTO admin_audit(id, actor_id, action, target_type, target_id, details) VALUES($1,$2,$3,$4,$5,$6)', [
      uuidv4(), actor, 'set-role', 'user', id, JSON.stringify({ is_admin: !!is_admin })
    ])
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
    await pool.query('INSERT INTO admin_audit(id, actor_id, action, target_type, target_id, details) VALUES($1,$2,$3,$4,$5,$6)', [
      uuidv4(), actor, 'soft-delete', 'user', id, JSON.stringify({})
    ])
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
    await pool.query('INSERT INTO admin_audit(id, actor_id, action, target_type, target_id, details) VALUES($1,$2,$3,$4,$5,$6)', [
      uuidv4(), (req as any).user?.id || null, 'purge', 'user', id, JSON.stringify({})
    ])
    res.json({ ok: true })
  } catch (err) {
    logger.error('admin', { action: 'purge-user', err })
    res.status(500).json({ error: 'Failed to purge user' })
  }
})

// List admin audit entries (admin only)
router.get('/audit', requireAdmin, async (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10)
  const perPage = parseInt((req.query.perPage as string) || '50', 10)
  const offset = (page - 1) * perPage
  try {
    const totalR = await pool.query('SELECT COUNT(*)::int as cnt FROM admin_audit')
    const total = totalR.rows[0].cnt || 0
    const rows = await pool.query('SELECT id, actor_id, action, target_type, target_id, details, created_at FROM admin_audit ORDER BY created_at DESC LIMIT $1 OFFSET $2', [perPage, offset])
    res.json({ total, entries: rows.rows })
  } catch (err) {
    logger.error('admin', { action: 'list-audit', err })
    res.status(500).json({ error: 'Failed to list audit entries' })
  }
})

// List feedback entries for admin (admin only)
// Supports optional filtering by statuses (comma-separated) and including deleted entries via includeDeleted=true
router.get('/feedback', requireAdmin, async (req, res) => {
  const page = parseInt((req.query.page as string) || '1', 10)
  const perPage = parseInt((req.query.perPage as string) || '50', 10)
  const q = (req.query.q as string) || ''
  const statusesCsv = (req.query.statuses as string) || ''
  const includeDeleted = String(req.query.includeDeleted || 'false').toLowerCase() === 'true'
  const offset = (page - 1) * perPage
  try {
    const params: any[] = []
    let whereClauses: string[] = []
    if (q) {
      params.push(`%${q}%`)
      whereClauses.push(`(email ILIKE $${params.length} OR message ILIKE $${params.length} OR headline ILIKE $${params.length})`)
    }

    // status filter (comma separated)
    const statuses = statusesCsv.split(',').map(s => s.trim()).filter(Boolean)
    if (statuses.length) {
      const startIdx = params.length + 1
      statuses.forEach(s => params.push(s))
      const placeholders = statuses.map((_, i) => `$${startIdx + i}`)
      whereClauses.push(`status IN (${placeholders.join(',')})`)
    }

    // by default exclude deleted entries unless explicitly requested
    if (!includeDeleted) {
      whereClauses.push('deleted_at IS NULL')
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''
    const totalR = await pool.query(`SELECT COUNT(*)::int as cnt FROM feedback ${where}`, params)
    const total = totalR.rows[0].cnt || 0
    params.push(perPage)
    params.push(offset)
    const limitIdx = params.length - 1
    const offsetIdx = params.length
    const rows = await pool.query(
      `SELECT id, user_id, email, headline, status, message, metadata, created_at, resolved_at, deleted_at FROM feedback ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    )
    res.json({ total, entries: rows.rows })
  } catch (err) {
    logger.error('admin', { action: 'list-feedback', err })
    res.status(500).json({ error: 'Failed to list feedback entries' })
  }
})

// Get feedback detail (with comments)
router.get('/feedback/:id', requireAdmin, async (req, res) => {
  const id = req.params.id
  try {
    const r = await pool.query('SELECT id, user_id, email, headline, message, metadata, status, created_at, resolved_at, resolved_by, deleted_at, deleted_by FROM feedback WHERE id=$1', [id])
    if (r.rowCount === 0) return res.status(404).json({ error: 'Feedback not found' })
    const fb = r.rows[0]
    const commentsR = await pool.query('SELECT id, feedback_id, author_id, message, created_at FROM feedback_comments WHERE feedback_id=$1 ORDER BY created_at ASC', [id])
    fb.comments = commentsR.rows
    // If feedback was 'new' (not yet viewed), mark as 'open' (viewed) when an admin reads it
    try {
      const actor = (req as any).user?.id || null
      if (fb.status === 'new') {
        await pool.query('UPDATE feedback SET status=$1 WHERE id=$2', ['open', id])
        await pool.query('INSERT INTO admin_audit(id, actor_id, action, target_type, target_id, details) VALUES($1,$2,$3,$4,$5,$6)', [uuidv4(), actor, 'view', 'feedback', id, JSON.stringify({})])
        fb.status = 'open'
      }
    } catch (e) {
      logger.error('admin', { action: 'mark-feedback-viewed', err: e })
    }

    res.json(fb)
  } catch (err) {
    logger.error('admin', { action: 'get-feedback', err })
    res.status(500).json({ error: 'Failed to fetch feedback' })
  }
})

// Add comment to feedback
router.post('/feedback/:id/comment', requireAdmin, async (req, res) => {
  const id = req.params.id
  const { message } = req.body || {}
  const actor = (req as any).user?.id || null
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' })
  try {
    const cid = uuidv4()
    await pool.query('INSERT INTO feedback_comments(id, feedback_id, author_id, message) VALUES($1,$2,$3,$4)', [cid, id, actor, message])
    await pool.query('INSERT INTO admin_audit(id, actor_id, action, target_type, target_id, details) VALUES($1,$2,$3,$4,$5,$6)', [uuidv4(), actor, 'comment', 'feedback', id, JSON.stringify({ comment_id: cid })])
    res.json({ ok: true })
  } catch (err) {
    logger.error('admin', { action: 'comment-feedback', err })
    res.status(500).json({ error: 'Failed to add comment' })
  }
})

// Resolve / unresolve feedback
router.post('/feedback/:id/resolve', requireAdmin, async (req, res) => {
  const id = req.params.id
  const { resolved } = req.body || {}
  const actor = (req as any).user?.id || null
  try {
    if (resolved) {
      await pool.query('UPDATE feedback SET status=$1, resolved_at=now(), resolved_by=$2 WHERE id=$3', ['resolved', actor, id])
      await pool.query('INSERT INTO admin_audit(id, actor_id, action, target_type, target_id, details) VALUES($1,$2,$3,$4,$5,$6)', [uuidv4(), actor, 'resolve', 'feedback', id, JSON.stringify({ resolved: true })])
    } else {
      await pool.query('UPDATE feedback SET status=$1, resolved_at=NULL, resolved_by=NULL WHERE id=$2', ['open', id])
      await pool.query('INSERT INTO admin_audit(id, actor_id, action, target_type, target_id, details) VALUES($1,$2,$3,$4,$5,$6)', [uuidv4(), actor, 'unresolve', 'feedback', id, JSON.stringify({ resolved: false })])
    }
    res.json({ ok: true })
  } catch (err) {
    logger.error('admin', { action: 'resolve-feedback', err })
    res.status(500).json({ error: 'Failed to update feedback' })
  }
})

// Hard-delete feedback (permanent)
router.delete('/feedback/:id', requireAdmin, async (req, res) => {
  const id = req.params.id
  const actor = (req as any).user?.id || null
  try {
    // remove comments first (if any), then the feedback row
    await pool.query('DELETE FROM feedback_comments WHERE feedback_id=$1', [id])
    await pool.query('DELETE FROM feedback WHERE id=$1', [id])
    await pool.query('INSERT INTO admin_audit(id, actor_id, action, target_type, target_id, details) VALUES($1,$2,$3,$4,$5,$6)', [uuidv4(), actor, 'delete', 'feedback', id, JSON.stringify({ hard_deleted: true })])
    res.json({ ok: true })
  } catch (err) {
    logger.error('admin', { action: 'delete-feedback', err })
    res.status(500).json({ error: 'Failed to delete feedback' })
  }
})

export default router
