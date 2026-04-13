import React, { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../api/apiClient'
import { formatDateShort, formatDateTimeShortDE } from '../../utils/dateFormatting'
import { markRepliesSeen } from '../layout/UserMenu'
import { adminGetSystemTemplates, adminCreateSystemTemplate, adminUpdateSystemTemplate, adminDeleteSystemTemplate } from '../../api/clubApi'
import TiptapEditor from './TiptapEditor'
import '../../styles/admin-panel.css'

type UserRow = { id: string; name: string; email: string; created_at: string; is_admin: boolean; email_verified?: boolean; deleted_at?: string; admin_granted_at?: string; admin_granted_by?: string; last_activity?: string; stats?: { events_count: number; clubs_count: number; feedback_count: number; login_count: number; last_login_at?: string; reservation_stats?: Record<string, number>; rsvp_stats?: { events_with_guests: number; events_with_invitations: number }; quality_metrics?: { avg_rooms_per_event: number; avg_tables_per_room: number; events_with_rooms: number; events_with_invitations: number; events_updated: number }; engagement_metrics?: { events_last_30_days: number; events_updated_last_30_days: number; active_last_7_days: boolean; active_last_30_days: boolean }; usage_type?: string }; recent_events?: { id: string; title: string; created_at: string }[]; club_memberships?: { club_id: string; name: string; role: string; joined_at: string }[]; recent_feedback?: { id: string; headline?: string; message: string; created_at: string }[]; recent_login_ips?: { ip_address: string; login_at: string; user_agent?: string }[] }
type AuditRow = { id: string; actor_id: string; action: string; target_type: string; target_id: string; details: any; created_at: string }

export default function AdminPanel() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [menu, setMenu] = useState<'users' | 'audit' | 'feedback' | 'system' | 'templates' | 'performance'>('users')

  // Users list state
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')

  // Detail drawer
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Audit list state
  const [auditEntries, setAuditEntries] = useState<AuditRow[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditPerPage, setAuditPerPage] = useState(25)
  const [auditTotal, setAuditTotal] = useState(0)

  // Feedback list state
  const [feedbackEntries, setFeedbackEntries] = useState<any[]>([])
  const [feedbackPage, setFeedbackPage] = useState(1)
  const [feedbackPerPage, setFeedbackPerPage] = useState(10)
  const [feedbackTotal, setFeedbackTotal] = useState(0)
  const [feedbackQ, setFeedbackQ] = useState('')
  // Tab: Neu / Offen / Abgeschlossen
  const [feedbackTab, setFeedbackTab] = useState<'new' | 'open' | 'resolved'>('new')
  const [feedbackTabCounts, setFeedbackTabCounts] = useState<Record<string, number>>({ new: 0, open: 0, resolved: 0 })
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null)
  const [feedbackDetailLoading, setFeedbackDetailLoading] = useState(false)
  // Inline comment form
  const [commentText, setCommentText] = useState('')
  const [commentSending, setCommentSending] = useState(false)
  // Email reply form
  const [replyText, setReplyText] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [replySuccess, setReplySuccess] = useState(false)

  useEffect(() => { fetchUsers(page, perPage, q) }, [auth.user, page, perPage, q])
  useEffect(() => { if (menu === 'audit') fetchAudit(auditPage, auditPerPage) }, [auth.user, menu, auditPage, auditPerPage])

  // System templates state
  const [sysTpls, setSysTpls] = useState<any[]>([])
  const [sysTplLoading, setSysTplLoading] = useState(false)
  const [editingTpl, setEditingTpl] = useState<any | null>(null)
  const [newTplName, setNewTplName] = useState('')
  const [newTplContent, setNewTplContent] = useState('')
  const [tplError, setTplError] = useState<string | null>(null)
  const [savingTpl, setSavingTpl] = useState(false)

  // Performance monitoring state
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [performanceLoading, setPerformanceLoading] = useState(false)
  const [performanceError, setPerformanceError] = useState<string | null>(null)

  useEffect(() => {
    if (menu === 'templates') fetchSysTpls()
    if (menu === 'performance') fetchPerformance()
  }, [menu, auth.user])

  async function fetchSysTpls() {
    if (!auth.user) return
    setSysTplLoading(true)
    try {
      const data = await adminGetSystemTemplates(auth.token ?? undefined)
      setSysTpls(data || [])
    } catch (e: any) { setTplError(e?.message || 'Fehler beim Laden') }
    finally { setSysTplLoading(false) }
  }

  async function fetchPerformance() {
    if (!auth.user) return
    setPerformanceLoading(true)
    setPerformanceError(null)
    try {
      const res = await api.get('/admin/performance', auth.token ?? undefined)
      setPerformanceData(res)
    } catch (e: any) {
      const message = e?.message || 'Fehler beim Laden der Performance-Daten'
      setPerformanceError(message)
      console.error('Failed to fetch performance data:', e)
      setPerformanceData(null)
    } finally {
      setPerformanceLoading(false)
    }
  }

  function getPerformanceSummary(data: any) {
    if (!data) return null
    const waiting = data.pool_stats?.waitingCount || 0
    const total = data.pool_stats?.totalCount || 0
    const slowCount = Array.isArray(data.slow_queries) ? data.slow_queries.length : 0
    const hasSlow = slowCount > 0

    if (performanceError) {
      return {
        label: 'Fehler',
        level: 'error',
        message: 'Die Performance-Daten konnten nicht geladen werden.'
      }
    }
    if (waiting > 5 || hasSlow) {
      return {
        label: 'C',
        level: 'warning',
        message: hasSlow
          ? `Langsame Queries erkannt (${slowCount}). Prüfe Indexe und Abfragen.`
          : 'Mehrere wartende Verbindungen im Pool. Datenbank-Pool ist belastet.'
      }
    }
    if (waiting > 0 || total > 30) {
      return {
        label: 'B',
        level: 'ok',
        message: `Verbindungspool leicht belastet. ${waiting} wartende Anfrage(n), ${total} von max. Verbindungen in Betrieb.`
      }
    }
    return {
      label: 'A',
      level: 'good',
      message: 'Datenbankverbindung und Poolnutzer sind aktuell in Ordnung.'
    }
  }

  function getSlowQuerySummary(data: any) {
    const queries = Array.isArray(data?.slow_queries) ? data.slow_queries : []
    if (!queries.length) return null

    const durations = queries.map((q: any) => Number(q.duration_ms) || 0)
    const total = durations.reduce((sum, value) => sum + value, 0)
    const avg = total / durations.length
    const max = Math.max(...durations)

    return {
      count: queries.length,
      avg: Math.round(avg),
      max: Math.round(max)
    }
  }

  function formatDuration(ms: number) {
    return `${ms.toLocaleString('de-DE')} ms`
  }

  async function handleCreateTpl() {
    if (!newTplName.trim() || !newTplContent.trim()) { setTplError('Name und Inhalt erforderlich.'); return }
    setSavingTpl(true); setTplError(null)
    try {
      const t = await adminCreateSystemTemplate({ name: newTplName.trim(), content: newTplContent.trim() }, auth.token ?? undefined)
      setSysTpls(prev => [...prev, t])
      setNewTplName(''); setNewTplContent('')
    } catch (e: any) { setTplError(e?.message || 'Fehler beim Erstellen') }
    finally { setSavingTpl(false) }
  }

  async function handleSaveTpl() {
    if (!editingTpl) return
    setSavingTpl(true); setTplError(null)
    try {
      const updated = await adminUpdateSystemTemplate(editingTpl.id, { name: editingTpl.name, content: editingTpl.content }, auth.token ?? undefined)
      setSysTpls(prev => prev.map(t => t.id === updated.id ? updated : t))
      setEditingTpl(null)
    } catch (e: any) { setTplError(e?.message || 'Fehler beim Speichern') }
    finally { setSavingTpl(false) }
  }

  async function handleDeleteTpl(id: string) {
    if (!confirm('Mustervorlage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return
    try {
      await adminDeleteSystemTemplate(id, auth.token ?? undefined)
      setSysTpls(prev => prev.filter(t => t.id !== id))
      if (editingTpl?.id === id) setEditingTpl(null)
    } catch (e: any) { setTplError(e?.message || 'Fehler beim Löschen') }
  }
  
  // Load all feedback tab counts when opening feedback menu
  useEffect(() => {
    if (menu === 'feedback') {
      fetchFeedbackCounts()
    }
  }, [menu, auth.user])
  
  useEffect(() => {
    if (menu === 'feedback') {
      fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ)
      markRepliesSeen()
    }
  }, [auth.user, menu, feedbackPage, feedbackPerPage, feedbackQ, feedbackTab])

  // System info state
  const [backendInfo, setBackendInfo] = useState<any | null>(null)
  const [systemLoading, setSystemLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<number | null>(null)

  useEffect(() => {
    let id: any = null
    const refresh = async () => {
      if (menu !== 'system') return
      if (!auth.user) return
      setSystemLoading(true)
      try {
        const res = await api.get('/admin/system', auth.token ?? undefined)
        setBackendInfo(res || null)
        setLastCheck(Date.now())
      } catch (e) {
        setBackendInfo(null)
        setLastCheck(Date.now())
      } finally {
        setSystemLoading(false)
      }
    }
    if (menu === 'system') {
      refresh()
      id = setInterval(refresh, 30000)
    }
    return () => { if (id) clearInterval(id) }
  }, [menu, auth.user])

  if (!auth.user) return <div style={{ padding: 24 }}>Nicht angemeldet</div>
  if (!(auth.user as any).is_admin) return <div style={{ padding: 24 }}>Zugriff verweigert</div>

  async function fetchUsers(p = 1, pp = 25, query = '') {
    if (!auth.user) return
    setLoading(true)
    try {
      const res = await api.get(`/admin/users?page=${p}&perPage=${pp}&q=${encodeURIComponent(query)}`, auth.token ?? undefined)
      setUsers(res.users || [])
      setTotal(res.total || 0)
      setLoading(false)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
      setLoading(false)
    }
  }

  async function fetchUserDetail(id: string) {
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/users/${id}`, auth.token ?? undefined)
      setSelectedUser(res)
    } catch (e: any) {
      alert(e?.message || 'Failed to load user')
    } finally { setDetailLoading(false) }
  }

  async function fetchAudit(p = 1, pp = 25) {
    if (!auth.user) return
    try {
      const res = await api.get(`/admin/audit?page=${p}&perPage=${pp}`, auth.token ?? undefined)
      setAuditEntries(res.entries || [])
      setAuditTotal(res.total || 0)
    } catch (e: any) {
      // ignore for now
    }
  }

  async function fetchFeedbackCounts() {
    if (!auth.user) return
    try {
      const [newRes, openRes, resolvedRes] = await Promise.all([
        api.get(`/admin/feedback?page=1&perPage=1&q=&statuses=new`, auth.token ?? undefined),
        api.get(`/admin/feedback?page=1&perPage=1&q=&statuses=open`, auth.token ?? undefined),
        api.get(`/admin/feedback?page=1&perPage=1&q=&statuses=resolved`, auth.token ?? undefined),
      ])
      setFeedbackTabCounts({
        new: newRes.total || 0,
        open: openRes.total || 0,
        resolved: resolvedRes.total || 0
      })
    } catch (e: any) {
      // ignore
    }
  }

  async function fetchFeedback(p = 1, pp = 10, query = '') {
    if (!auth.user) return
    try {
      const res = await api.get(`/admin/feedback?page=${p}&perPage=${pp}&q=${encodeURIComponent(query)}&statuses=${encodeURIComponent(feedbackTab)}`, auth.token ?? undefined)
      setFeedbackEntries(res.entries || [])
      setFeedbackTotal(res.total || 0)
      setFeedbackTabCounts(prev => ({ ...prev, [feedbackTab]: res.total || 0 }))
    } catch (e: any) {
      // ignore
    }
  }

  async function fetchFeedbackDetail(id: string, resetForms = false) {
    if (!auth.user) return
    setFeedbackDetailLoading(true)
    if (resetForms) {
      setCommentText(''); setReplyText(''); setReplySubject(''); setReplyError(null); setReplySuccess(false)
    }
    try {
      const res = await api.get(`/admin/feedback/${id}`, auth.token ?? undefined)
      setSelectedFeedback(res)
    } catch (e: any) {
      alert(e?.message || 'Failed to load feedback')
    } finally { setFeedbackDetailLoading(false) }
  }

  async function addFeedbackComment(id: string, message: string) {
    if (!auth.user) return
    setCommentSending(true)
    try {
      await api.post(`/admin/feedback/${id}/comment`, { message }, auth.token ?? undefined)
      setCommentText('')
      fetchFeedbackDetail(id)
      fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ)
    } catch (e: any) { alert(e?.message || 'Failed to add comment') }
    finally { setCommentSending(false) }
  }

  async function sendFeedbackReply(id: string) {
    if (!auth.user) return
    setReplyError(null)
    setReplySuccess(false)
    if (!replyText.trim()) { setReplyError('Nachricht darf nicht leer sein.'); return }
    setReplySending(true)
    try {
      await api.post(`/admin/feedback/${id}/reply`, { message: replyText.trim(), subject: replySubject.trim() || undefined }, auth.token ?? undefined)
      setReplyText('')
      setReplySubject('')
      setReplySuccess(true)
      fetchFeedbackDetail(id)
    } catch (e: any) {
      const detail = e?.body?.detail || e?.message || 'E-Mail konnte nicht gesendet werden.'
      setReplyError(detail)
    } finally { setReplySending(false) }
  }

  async function resolveFeedback(id: string, resolved = true) {
    if (!auth.user) return false
    try {
      await api.post(`/admin/feedback/${id}/resolve`, { resolved }, auth.token ?? undefined)
      // refresh
      try { fetchFeedbackDetail(id) } catch {}
      try { fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ) } catch {}
      return true
    } catch (e: any) { alert(e?.message || 'Failed to update'); return false }
  }

  async function deleteFeedback(id: string) {
    if (!auth.user) return false
    if (!confirm('Feedback wirklich endgültig löschen? Diese Aktion ist unwiderruflich.')) return false
    try {
      await api.del(`/admin/feedback/${id}`, auth.token ?? undefined)
      try { fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ) } catch {}
      return true
    } catch (e: any) { alert(e?.message || 'Failed to delete'); return false }
  }

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <div>
          <h3>Admin Center</h3>
          <nav className="admin-nav">
            <button onClick={() => setMenu('users')} className={`admin-nav-button ${menu === 'users' ? 'active' : ''}`}>Benutzerverwaltung</button>
            <button onClick={() => setMenu('audit')} className={`admin-nav-button ${menu === 'audit' ? 'active' : ''}`}>Audit Log</button>
            <button onClick={() => { setMenu('feedback'); markRepliesSeen() }} className={`admin-nav-button ${menu === 'feedback' ? 'active' : ''}`}>Feedbackübersicht</button>
            <button onClick={() => setMenu('system')} className={`admin-nav-button ${menu === 'system' ? 'active' : ''}`}>System</button>
            <button onClick={() => setMenu('templates')} className={`admin-nav-button ${menu === 'templates' ? 'active' : ''}`}>Mustervorlagen</button>
            <button onClick={() => setMenu('performance')} className={`admin-nav-button ${menu === 'performance' ? 'active' : ''}`}>Performance</button>
          </nav>
        </div>
        <div>
          <button className="admin-leave-button" onClick={() => {
            if (window.history.length > 1) {
              navigate(-1)
            } else {
              navigate('/')
            }
          }}>Admincenter verlassen</button>
        </div>
      </aside>

      <main className="admin-main">
        {menu === 'users' && (
          <>
            <h2>Benutzerverwaltung</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input placeholder="Search email or name" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} style={{ padding: 8, flex: 1 }} />
              <select value={perPage} onChange={e => { setPerPage(parseInt(e.target.value, 10)); setPage(1) }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {loading && <p>Lade Benutzer …</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Admin</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Verifiziert</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Created</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace' }}>{u.id}</td>
                    <td style={{ padding: 8 }}>{u.email}</td>
                    <td style={{ padding: 8 }}>{u.name}</td>
                    <td style={{ padding: 8 }}>{u.is_admin ? '✅' : ''}</td>
                    <td style={{ padding: 8 }}>{u.email_verified ? '✅' : ''}</td>
                    <td style={{ padding: 8 }}>{formatDateTimeShortDE(u.created_at)}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={async () => fetchUserDetail(u.id)}>View</button>
                      <button style={{ marginLeft: 8 }} onClick={async () => {
                        try {
                          await api.post(`/admin/users/${u.id}/role`, { is_admin: !u.is_admin }, auth.token ?? undefined)
                          fetchUsers(page, perPage, q)
                        } catch (e: any) { alert(e?.message || 'Error') }
                      }}>{u.is_admin ? 'Revoke admin' : 'Make admin'}</button>
                      <button style={{ marginLeft: 8 }} onClick={async () => {
                        try {
                          await api.post(`/admin/users/${u.id}/email-verification`, { email_verified: !u.email_verified }, auth.token ?? undefined)
                          fetchUsers(page, perPage, q)
                          if (selectedUser && selectedUser.id === u.id) {
                            fetchUserDetail(u.id)
                          }
                        } catch (e: any) { alert(e?.message || 'Error') }
                      }}>{u.email_verified ? 'Unverify' : 'Verify'}</button>
                      <button style={{ marginLeft: 8 }} onClick={async () => {
                        if (!confirm('Benutzer wirklich löschen (soft delete)?')) return
                        try {
                          await api.del(`/admin/users/${u.id}`, auth.token ?? undefined)
                          fetchUsers(page, perPage, q)
                        } catch (e: any) { alert(e?.message || 'Error') }
                      }}>Delete</button>
                      <button style={{ marginLeft: 8 }} onClick={async () => {
                        if (!confirm('Benutzer endgültig entfernen? Diese Aktion ist unwiderruflich.')) return
                        try {
                          await api.post(`/admin/users/${u.id}/purge`, {}, auth.token ?? undefined)
                          fetchUsers(page, perPage, q)
                        } catch (e: any) { alert(e?.message || 'Error') }
                      }}>Purge</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div>Showing {(page-1)*perPage + 1} - {Math.min(page*perPage, total)} of {total}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { if (page>1) setPage(p => p-1) }} disabled={page===1}>Prev</button>
                <button onClick={() => { if ((page*perPage) < total) setPage(p => p+1) }} disabled={(page*perPage) >= total}>Next</button>
              </div>
            </div>
          </>
        )}

        {menu === 'audit' && (
          <>
            <h2>Audit Log</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Time</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Actor</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Action</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Target</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map(a => (
                  <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{formatDateTimeShortDE(a.created_at)}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace' }}>{a.actor_id}</td>
                    <td style={{ padding: 8 }}>{a.action}</td>
                    <td style={{ padding: 8 }}>{a.target_type}:{a.target_id}</td>
                    <td style={{ padding: 8 }}>{JSON.stringify(a.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div>Showing {(auditPage-1)*auditPerPage + 1} - {Math.min(auditPage*auditPerPage, auditTotal)} of {auditTotal}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { if (auditPage>1) setAuditPage(p => p-1) }} disabled={auditPage===1}>Prev</button>
                <button onClick={() => { if ((auditPage*auditPerPage) < auditTotal) setAuditPage(p => p+1) }} disabled={(auditPage*auditPerPage) >= auditTotal}>Next</button>
              </div>
            </div>
          </>
        )}

        {menu === 'feedback' && (
          <>
            <h2>Feedback</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0' }}>
                {(['new', 'open', 'resolved'] as const).map(tab => {
                  const labels: Record<string, string> = { new: 'Neu', open: 'Offen', resolved: 'Abgeschlossen' }
                  const active = feedbackTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => { setFeedbackTab(tab); setFeedbackPage(1) }}
                      style={{
                        padding: '8px 18px',
                        border: 'none',
                        borderBottom: active ? '2px solid #667eea' : '2px solid transparent',
                        background: 'transparent',
                        color: active ? '#667eea' : '#64748b',
                        fontWeight: active ? 700 : 400,
                        fontSize: 14,
                        cursor: 'pointer',
                        marginBottom: '-2px',
                        transition: 'all 0.15s'
                      }}
                    >
                      {labels[tab]}
                      {feedbackTabCounts[tab] > 0 && (
                        <span style={{
                          marginLeft: 6,
                          background: active ? '#667eea' : '#e2e8f0',
                          color: active ? 'white' : '#475569',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '1px 7px'
                        }}>{feedbackTabCounts[tab]}</span>
                      )}
                    </button>
                  )
                })}
                <button style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#64748b' }} onClick={() => fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ)}>↻ Reload</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Search email or message" value={feedbackQ} onChange={e => { setFeedbackQ(e.target.value); setFeedbackPage(1) }} style={{ padding: 8, flex: 1 }} />
                <select value={feedbackPerPage} onChange={e => { setFeedbackPerPage(parseInt(e.target.value, 10)); setFeedbackPage(1) }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Email</th>
                  <th></th>
                  <th>Status</th>
                  <th>Nachricht</th>
                </tr>
              </thead>
              <tbody>
                {feedbackEntries.map(f => (
                  <tr key={f.id}>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{formatDateTimeShortDE(f.created_at)}</td>
                    <td style={{ padding: '6px 10px' }}>{f.email || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <button onClick={() => fetchFeedbackDetail(f.id, true)} style={{ padding: '3px 10px', fontSize: 12 }}>View</button>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {(() => {
                          const status = f.status || 'open'
                          let display = status
                          if (status === 'new') display = 'Neu'
                          else if (status === 'open') display = 'Offen'
                          else if (status === 'resolved') display = 'Abgeschlossen'
                          let bg = '#fff7ed'
                          let color = '#92400e'
                          if (status === 'resolved') { bg = '#e6fffa'; color = '#0f766e' }
                          else if (status === 'new') { bg = '#eff6ff'; color = '#1e3a8a' }
                          return <div style={{ display: 'inline-block', padding: '3px 7px', borderRadius: 6, background: bg, color, fontWeight: 600, fontSize: 11 }}>{display}</div>
                        })()}
                        {(f.comments || []).some((c: any) => c.message?.startsWith('[E-Mail-Eingang')) && (
                          <span title="Neue E-Mail-Antwort" style={{ fontSize: 14 }}>✉️</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ fontWeight: 700 }}>{f.headline || '(no headline)'}</div>
                      <div style={{ marginTop: 2, fontSize: 13, color: '#475569' }}>{f.message?.slice?.(0, 120)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-pagination">
              <div>Showing {(feedbackPage-1)*feedbackPerPage + 1} - {Math.min(feedbackPage*feedbackPerPage, feedbackTotal)} of {feedbackTotal}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { if (feedbackPage>1) setFeedbackPage(p => p-1) }} disabled={feedbackPage===1}>Prev</button>
                <button onClick={() => { if ((feedbackPage*feedbackPerPage) < feedbackTotal) setFeedbackPage(p => p+1) }} disabled={(feedbackPage*feedbackPerPage) >= feedbackTotal}>Next</button>
              </div>
            </div>
          </>
        )}

        {menu === 'system' && (
          <>
            <h2>System</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              <div style={{ flex: '1 1 280px', background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <h4>API / DB</h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 6, background: backendInfo?.db?.ok ? '#16a34a' : '#dc2626' }} />
                  <div>{backendInfo ? (backendInfo.db?.ok ? 'Backend & DB erreichbar' : `Backend erreichbar, DB Fehler: ${backendInfo.db?.error || 'unknown'}`) : 'Backend nicht erreichbar'}</div>
                </div>
                <div style={{ marginTop: 8, color: '#475569' }}>Letzter Check: {lastCheck ? formatDateTimeShortDE(new Date(lastCheck).toISOString()) : '—'}</div>
                <div style={{ marginTop: 8, color: '#475569' }}>DB size: {backendInfo?.dbSize?.pretty || '—'}</div>
                <div style={{ marginTop: 6, color: '#475569' }}>Pool: total {backendInfo?.pool?.totalCount ?? '—'}, idle {backendInfo?.pool?.idleCount ?? '—'}, waiting {backendInfo?.pool?.waitingCount ?? '—'}</div>
              </div>

              <div style={{ flex: '1 1 300px', background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <h4>Versionen</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ color: '#64748b' }}>Frontend Version</div>
                  <div style={{ fontFamily: 'monospace' }}>{(import.meta as any).env?.VITE_BUILD_VERSION || 'dev'}</div>
                  <div style={{ color: '#64748b' }}>Frontend SHA</div>
                  <div style={{ fontFamily: 'monospace' }}>{(import.meta as any).env?.VITE_BUILD_SHA || '—'}</div>

                  <div style={{ color: '#64748b' }}>Backend Version</div>
                  <div style={{ fontFamily: 'monospace' }}>{backendInfo?.version || '—'}</div>
                  <div style={{ color: '#64748b' }}>Backend Build</div>
                  <div style={{ fontFamily: 'monospace' }}>{backendInfo?.buildSha || backendInfo?.build_sha || '—'}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  {((import.meta as any).env?.VITE_BUILD_SHA || '') === (backendInfo?.buildSha || backendInfo?.build_sha || '') ? (
                    <div style={{ color: '#065f46', fontWeight: 700 }}>Frontend / Backend SHA sync</div>
                  ) : (
                    <div style={{ color: '#b91c1c', fontWeight: 700 }}>SHA mismatch — prüfen</div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    Last applied migration: {backendInfo?.migrations?.last_applied?.latest_available || backendInfo?.migrations?.last_applied?.applied_at || '—'}
                  </div>
                  {backendInfo?.migrations?.latest_available && backendInfo?.migrations?.last_applied && backendInfo?.migrations?.latest_available !== backendInfo?.migrations?.last_applied?.latest_available && (
                    <div style={{ marginTop: 8, color: '#b91c1c', fontWeight: 700 }}>Migrationen verfügbar, prüfen</div>
                  )}
                </div>
              </div>

              <div style={{ flex: '1 1 360px', background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <h4>Wichtige Metriken</h4>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#334155' }}>
                  <li>API erreichbar / Latenz (letzter Check)</li>
                  <li>DB Verbindungsstatus (Backend-seitig geprüft)</li>
                  <li>Migrations-Status (letzte angewandte Migration)</li>
                  <li>Anzahl aktiver Benutzer / neue Registrierungen (letzte 24h)</li>
                  <li>Uptime / letzte Neustarts</li>
                  <li>Sentry errors rate (falls integriert)</li>
                </ul>
                <div style={{ marginTop: 8, color: '#64748b' }}>Hinweis: Einige Metriken benötigen Backend-Unterstützung (API-Endpunkte).</div>
              </div>
            </div>
          </>
        )}

        {menu !== 'users' && menu !== 'audit' && menu !== 'feedback' && menu !== 'system' && menu !== 'templates' && (
          <div style={{ marginTop: 24, color: '#64748b' }}>Diese Ansicht ist noch nicht implementiert.</div>
        )}

        {menu === 'templates' && (
          <>
            <h2>Mustervorlagen</h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>
              Systemweite Briefvorlagen, die alle Vereine laden und als eigene Vereinsvorlage übernehmen können.
            </p>

            {tplError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', borderRadius: 6, color: '#991b1b', marginBottom: 12 }}>{tplError}</div>
            )}

            {/* Create new template */}
            <div style={{ background: 'white', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px', color: '#1e293b' }}>Neue Mustervorlage anlegen</h4>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Name</label>
                <input
                  value={newTplName}
                  onChange={e => setNewTplName(e.target.value)}
                  placeholder="z.B. Einladungsbrief Jahreshauptversammlung"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                  Inhalt – Platzhalter: {'{{name}}'}, {'{{anrede_name}}'}, {'{{address}}'}, {'{{date}}'}, {'{{club}}'}, {'{{event_title}}'}
                </label>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                  <TiptapEditor
                    value={newTplContent}
                    onChange={setNewTplContent}
                    placeholder="Sehr geehrte*r {{anrede_name}}, ..."
                    style={{ minHeight: 200 }}
                  />
                </div>
              </div>
              <button
                onClick={handleCreateTpl}
                disabled={savingTpl}
                style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                {savingTpl ? '…' : '+ Vorlage erstellen'}
              </button>
            </div>

            {/* Templates list */}
            {sysTplLoading ? (
              <p style={{ color: '#94a3b8' }}>Lade Vorlagen…</p>
            ) : sysTpls.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>Noch keine Mustervorlagen vorhanden.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sysTpls.map(t => (
                  <div key={t.id} style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    {editingTpl?.id === t.id ? (
                      <div style={{ padding: 16 }}>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Name</label>
                          <input
                            value={editingTpl.name}
                            onChange={e => setEditingTpl({ ...editingTpl, name: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Inhalt</label>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                            <TiptapEditor
                              value={editingTpl.content}
                              onChange={val => setEditingTpl({ ...editingTpl, content: val })}
                              style={{ minHeight: 250 }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={handleSaveTpl}
                            disabled={savingTpl}
                            style={{ padding: '8px 14px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                          >{savingTpl ? '…' : '💾 Speichern'}</button>
                          <button
                            onClick={() => setEditingTpl(null)}
                            style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 3 }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            Erstellt: {formatDateShort(t.created_at)}
                            {t.updated_at !== t.created_at && ` · Geändert: ${formatDateShort(t.updated_at)}`}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(t.content || '').replace(/<[^>]+>/g, ' ').substring(0, 100)}…
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => setEditingTpl({ ...t })}
                            style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                          >✏️ Bearbeiten</button>
                          <button
                            onClick={() => handleDeleteTpl(t.id)}
                            style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                          >Löschen</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {menu === 'performance' && (
          <>
            <h2>Performance-Monitoring</h2>
            <div style={{ marginBottom: 16 }}>
              <button 
                onClick={fetchPerformance}
                disabled={performanceLoading}
                style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                {performanceLoading ? 'Lade…' : '🔄 Aktualisieren'}
              </button>
            </div>

            {performanceLoading ? (
              <p>Lade Performance-Daten…</p>
            ) : performanceError ? (
              <p style={{ color: 'red' }}>{performanceError}</p>
            ) : performanceData ? (
              <div style={{ display: 'grid', gap: 24 }}>
                {/* Performance Summary */}
                {(() => {
                  const summary = getPerformanceSummary(performanceData)
                  return summary ? (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: summary.level === 'good' ? '#ecfdf5' : summary.level === 'ok' ? '#fef3c7' : '#fee2e2',
                        border: `1px solid ${summary.level === 'good' ? '#10b981' : summary.level === 'ok' ? '#f59e0b' : '#ef4444'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: summary.level === 'good' ? '#065f46' : summary.level === 'ok' ? '#92400e' : '#991b1b' }}>
                          Performance-Bewertung: {summary.label}
                        </div>
                        <div style={{ fontSize: 13, color: '#334155' }}>{summary.message}</div>
                      </div>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 9999,
                          display: 'grid',
                          placeItems: 'center',
                          background: summary.level === 'good' ? '#10b981' : summary.level === 'ok' ? '#f59e0b' : '#ef4444',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        {summary.label}
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Client IP (viewer) */}
                {performanceData.client_ip && (
                  <div style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontSize: 13, color: '#334155' }}>
                      <strong>Deine IP:</strong> <span style={{ fontFamily: 'monospace' }}>{performanceData.client_ip}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                      Diese IP wird erkannt von der Server-Verbindung (X-Forwarded-For / RemoteAddress). Nützlich zum Prüfen von Firewall-Regeln.
                    </div>
                  </div>
                )}

                {/* Slow query overview */}
                {(() => {
                  const slowSummary = getSlowQuerySummary(performanceData)
                  return slowSummary ? (
                    <div style={{ padding: 16, borderRadius: 12, border: '1px solid #fde68a', background: '#fffbeb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Query-Dauer Übersicht</div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
                            {slowSummary.count} langsame Abfrage(n) mit einer maximalen Dauer von {formatDuration(slowSummary.max)} und durchschnittlich {formatDuration(slowSummary.avg)}.
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: '#92400e' }}>{formatDuration(slowSummary.max)}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 16, borderRadius: 12, border: '1px solid #d1fae5', background: '#ecfdf5', color: '#064e3b' }}>
                      Keine langsamen Queries gefunden. Die durchschnittliche Abfragezeit liegt derzeit unter dem Schwellenwert.
                    </div>
                  )
                })()}

                {/* Connection Pool Details */}
                <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                  <h3 style={{ margin: '0 0 12px 0' }}>Datenbank-Verbindungspool</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b' }}>{performanceData.pool_stats?.totalCount || 0}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Aktive Connections</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#059669' }}>{performanceData.pool_stats?.idleCount || 0}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Verfügbar (Idle)</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: (performanceData.pool_stats?.waitingCount || 0) > 0 ? '#dc2626' : '#059669' }}>{performanceData.pool_stats?.waitingCount || 0}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Wartende Anfragen</div>
                    </div>
                    {performanceData.pool_stats?.maxConnections && (
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#7c3aed' }}>{performanceData.pool_stats.maxConnections}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Max. Limit</div>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', padding: '10px 8px', background: '#f1f5f9', borderRadius: 6 }}>
                    💡 <strong>Aktive Connections</strong> = derzeit genutzte Verbindungen. <strong>Verfügbar</strong> = nicht gerade in Benutzung. <strong>Wartende Anfragen</strong> = Queries, die auf eine freie Connection warten. Das bedeutet, der Pool ist erschöpft.
                  </div>
                </div>

                {/* Cache Hit Ratio */}
                {performanceData.cache_hit_ratio && performanceData.cache_hit_ratio.cache_hit_ratio !== null && (() => {
                  const ratio = Number(performanceData.cache_hit_ratio.cache_hit_ratio) || 0
                  const isBad = ratio < 80
                  return (
                    <div style={{ padding: 16, borderRadius: 12, border: isBad ? '1px solid #fca5a5' : '1px solid #bbf7d0', background: isBad ? '#fef2f2' : '#f0fdf4' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: isBad ? '#991b1b' : '#065f46' }}>Cache Hit Ratio</div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                            {ratio.toFixed(2)}% der Queries bedient aus RAM-Cache. {performanceData.cache_hit_ratio.cache_hits} Hits zu {performanceData.cache_hit_ratio.disk_reads} Disk Reads.
                          </div>
                          {isBad && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>⚠️ Unter 80% gilt als schlecht. Das deutet auf Speicherdruck oder fehlende Indizes hin.</div>}
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 'bold', color: isBad ? '#991b1b' : '#065f46' }}>{ratio.toFixed(0)}%</div>
                      </div>
                    </div>
                  )
                })()}

                {/* Unused Indexes Warning */}
                {Array.isArray(performanceData.unused_indexes) && performanceData.unused_indexes.length > 0 && (
                  <div style={{ padding: 16, borderRadius: 12, border: '1px solid #fed7aa', background: '#fffbeb' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                      ⚠️ {performanceData.unused_indexes.length} unbenutzte Index(e) gefunden
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
                      Diese Indexes nehmen Speicher ein, aber werden nicht bei Queries genutzt. Sie können gelöscht werden, um Storage und Schreib-Performance zu verbessern.
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {performanceData.unused_indexes.slice(0, 3).map((idx: any, i: number) => (
                        <div key={i} style={{ fontSize: 11, color: '#64748b', padding: '6px 8px', background: '#f1f5f9', borderRadius: 4 }}>
                          <strong>{idx.indexname}</strong> auf {idx.tablename} ({idx.size})
                        </div>
                      ))}
                    </div>
                  </div>
                )}



                {/* Table Statistics */}
                <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <h3 style={{ margin: '0 0 12px 0' }}>Tabellen-Statistiken</h3>
                  <div style={{ fontSize: 12, color: '#475569', padding: '10px 8px', background: '#f1f5f9', borderRadius: 6, marginBottom: 12 }}>
                    <strong>Zu beachten:</strong> Hohe <strong>Dead Rows</strong> deuten auf fehlende VACUUM-Operationen hin. <strong>Große Tabellen</strong> sollten regelmäßig überwacht werden. Ein Verhältnis von Updates/Deletes zu Inserts zeigt, wie die Tabelle genutzt wird.
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Tabelle</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Größe</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Live Rows</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Dead Rows</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Inserts</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Updates</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Deletes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData.table_stats?.map((table: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{table.tablename}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{table.size}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{table.live_rows?.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: (table.dead_rows || 0) > (table.live_rows || 1) * 0.1 ? '#dc2626' : '#475569' }}>{table.dead_rows?.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{table.inserts?.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{table.updates?.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{table.deletes?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Index Usage */}
                <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <h3 style={{ margin: '0 0 12px 0' }}>Index-Nutzung</h3>
                  <div style={{ fontSize: 12, color: '#475569', padding: '10px 8px', background: '#f1f5f9', borderRadius: 6, marginBottom: 12 }}>
                    <strong>Gut:</strong> Hohe <strong>Scans</strong> = Index wird genutzt. <strong>Schlecht:</strong> 0 Scans = Index wird nicht benutzt (verschleudert Speicher). <strong>Zu achten:</strong> Indexes mit niedrigen Scans können gelöscht werden.
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Index</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Tabelle</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Scans</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Tuples Read</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Tuples Fetched</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Größe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData.index_stats?.slice(0, 10).map((index: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 500 }}>{index.indexname}</td>
                            <td style={{ padding: '8px 12px' }}>{index.tablename}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{index.scans?.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{index.tuples_read?.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{index.tuples_fetched?.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{index.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {performanceData.index_stats?.length > 10 && (
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                      Zeige Top 10 Indizes. Gesamt: {performanceData.index_stats.length}
                    </p>
                  )}
                </div>

                {/* Slow Queries */}
                {performanceData.slow_queries?.length > 0 && (
                  <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#dc2626' }}>Langsame Queries</h3>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {performanceData.slow_queries.map((query: any, i: number) => (
                        <div key={i} style={{ padding: 12, background: '#fef2f2', borderRadius: 6 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 4 }}>{query.query}</div>
                          <div style={{ fontSize: 11, color: '#dc2626' }}>
                            Dauer: {query.duration_ms}ms • Zeit: {formatDateTimeShortDE(query.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
                  Letzte Aktualisierung: {performanceData.timestamp ? formatDateTimeShortDE(performanceData.timestamp) : 'Unbekannt'}
                </div>
              </div>
            ) : (
              <p>Keine Performance-Daten verfügbar. Klicke auf "Aktualisieren" um Daten zu laden.</p>
            )}
          </>
        )}
      </main>

      {/* Detail drawer */}
      {selectedUser && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: 'white', boxShadow: '-6px 0 24px rgba(0,0,0,0.12)', padding: 16, overflow: 'auto' }}>
          <button onClick={() => setSelectedUser(null)} style={{ float: 'right' }}>Close</button>
          <h3>Benutzer: {selectedUser.name || selectedUser.email}</h3>
          {detailLoading ? <p>Loading…</p> : (
            <div>
              <p><strong>ID:</strong> {selectedUser.id}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Name:</strong> {selectedUser.name}</p>
              <p><strong>Created:</strong> {formatDateTimeShortDE(selectedUser.created_at)}</p>
              <p><strong>Last Activity:</strong> {selectedUser.last_activity ? formatDateTimeShortDE(selectedUser.last_activity) : 'Nie'}</p>
              <p><strong>Admin:</strong> {(selectedUser as any).is_admin ? 'Yes' : 'No'}</p>
              {selectedUser.admin_granted_at && <p><strong>Admin granted:</strong> {formatDateTimeShortDE(selectedUser.admin_granted_at)}</p>}
              <p><strong>Email verifiziert:</strong> {(selectedUser as any).email_verified ? 'Yes' : 'No'}</p>
              <p><strong>Deleted:</strong> {selectedUser.deleted_at || '—'}</p>

              {selectedUser.stats && (
                <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                  <h4 style={{ margin: '0 0 8px' }}>Statistiken</h4>
                  <p><strong>Events erstellt:</strong> {selectedUser.stats.events_count}</p>
                  <p><strong>Club-Mitgliedschaften:</strong> {selectedUser.stats.clubs_count}</p>
                  <p><strong>Feedback gegeben:</strong> {selectedUser.stats.feedback_count}</p>
                  <p><strong>Login-Anzahl:</strong> {selectedUser.stats.login_count}</p>
                  <p><strong>Letzter Login:</strong> {selectedUser.stats.last_login_at ? formatDateTimeShortDE(selectedUser.stats.last_login_at) : 'Nie'}</p>
                  
                  {selectedUser.stats.usage_type && (
                    <p><strong>Nutzungstyp:</strong> {selectedUser.stats.usage_type === 'club_user' ? 'Club-Manager' : 'Event-only'}</p>
                  )}
                  
                  {selectedUser.stats.reservation_stats && Object.keys(selectedUser.stats.reservation_stats).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Reservierungen für Events:</strong>
                      <ul style={{ margin: 4, paddingLeft: 16 }}>
                        {Object.entries(selectedUser.stats.reservation_stats).map(([status, count]) => (
                          <li key={status}>{status}: {count}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedUser.stats.rsvp_stats && (
                    <div style={{ marginTop: 8 }}>
                      <strong>RSVP-Statistiken:</strong>
                      <p>Events mit Gästedaten: {selectedUser.stats.rsvp_stats.events_with_guests}</p>
                      <p>Events mit Einladungen: {selectedUser.stats.rsvp_stats.events_with_invitations}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedUser.stats?.quality_metrics && (
                <div style={{ marginTop: 16, padding: 12, background: '#f0f9ff', borderRadius: 6 }}>
                  <h4 style={{ margin: '0 0 8px', color: '#0369a1' }}>📊 Event-Qualität</h4>
                  <p><strong>Ø Räume pro Event:</strong> {selectedUser.stats.quality_metrics.avg_rooms_per_event.toFixed(1)}</p>
                  <p><strong>Ø Tische pro Raum:</strong> {selectedUser.stats.quality_metrics.avg_tables_per_room.toFixed(1)}</p>
                  <p><strong>Events mit Räumen:</strong> {selectedUser.stats.quality_metrics.events_with_rooms}</p>
                  <p><strong>Events mit Einladungen:</strong> {selectedUser.stats.quality_metrics.events_with_invitations}</p>
                  <p><strong>Events bearbeitet:</strong> {selectedUser.stats.quality_metrics.events_updated}</p>
                  <p><strong>Completion-Rate:</strong> {selectedUser.stats.events_count > 0 ? ((selectedUser.stats.quality_metrics.events_with_rooms / selectedUser.stats.events_count) * 100).toFixed(1) : 0}%</p>
                </div>
              )}

              {selectedUser.stats?.engagement_metrics && (
                <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 6 }}>
                  <h4 style={{ margin: '0 0 8px', color: '#92400e' }}>⚡ Engagement</h4>
                  <p><strong>Events letzte 30 Tage:</strong> {selectedUser.stats.engagement_metrics.events_last_30_days}</p>
                  <p><strong>Events bearbeitet (30 Tage):</strong> {selectedUser.stats.engagement_metrics.events_updated_last_30_days}</p>
                  <p><strong>Aktiv letzte 7 Tage:</strong> {selectedUser.stats.engagement_metrics.active_last_7_days ? '✅ Ja' : '❌ Nein'}</p>
                  <p><strong>Aktiv letzte 30 Tage:</strong> {selectedUser.stats.engagement_metrics.active_last_30_days ? '✅ Ja' : '❌ Nein'}</p>
                  <p><strong>Update-Rate:</strong> {selectedUser.stats.engagement_metrics.events_last_30_days > 0 ? ((selectedUser.stats.engagement_metrics.events_updated_last_30_days / selectedUser.stats.engagement_metrics.events_last_30_days) * 100).toFixed(1) : 0}%</p>
                </div>
              )}

              {selectedUser.recent_events && selectedUser.recent_events.length > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                  <h4 style={{ margin: '0 0 8px' }}>Zuletzt erstellte Events</h4>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {selectedUser.recent_events.map(e => (
                      <li key={e.id} style={{ marginBottom: 4 }}>
                        <strong>{e.title}</strong> - {formatDateTimeShortDE(e.created_at)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedUser.club_memberships && selectedUser.club_memberships.length > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                  <h4 style={{ margin: '0 0 8px' }}>Club-Mitgliedschaften</h4>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {selectedUser.club_memberships.map(c => (
                      <li key={c.club_id} style={{ marginBottom: 4 }}>
                        <strong>{c.name}</strong> (Rolle: {c.role}) - Beigetreten: {formatDateTimeShortDE(c.joined_at)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedUser.recent_feedback && selectedUser.recent_feedback.length > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                  <h4 style={{ margin: '0 0 8px' }}>Zuletzt gegebenes Feedback</h4>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {selectedUser.recent_feedback.map(f => (
                      <li key={f.id} style={{ marginBottom: 8 }}>
                        <strong>{f.headline || 'Kein Titel'}</strong> - {formatDateTimeShortDE(f.created_at)}
                        <br />
                        <small>{f.message.length > 100 ? f.message.substring(0, 100) + '...' : f.message}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Login IP History Box - always show if data came from backend */}
              {selectedUser.recent_login_ips !== undefined && (
                <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', borderRadius: 6, border: '1px solid #fca5a5' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#991b1b' }}>🔒 Login IP-Adressen (Firewall-Audit)</h4>
                  <p style={{ fontSize: '12px', color: '#7f1d1d', marginBottom: 8 }}>Für Firewall-Debugging & Sicherheit.</p>
                  {selectedUser.recent_login_ips.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#7f1d1d', fontStyle: 'italic' }}>Keine Login-IPs verzeichnet. Dieser User hat sich noch nie angemeldet.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {selectedUser.recent_login_ips.map((login, idx) => (
                        <li key={idx} style={{ marginBottom: 8, fontSize: '13px' }}>
                          <code style={{ wordBreak: 'break-all', background: '#fff5f5', padding: '2px 4px', borderRadius: 3, fontWeight: 500, color: '#7f1d1d' }}>{login.ip_address}</code>
                          <br />
                          <small style={{ color: '#666' }}>
                            {formatDateTimeShortDE(login.login_at)}
                            {login.user_agent && ` • ${login.user_agent}`}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Feedback detail modal */}
      {selectedFeedback && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '90%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 8, padding: 18, boxShadow: '0 10px 40px rgba(0,0,0,0.3)', position: 'relative' }}>
            <button onClick={() => { setSelectedFeedback(null); setCommentText(''); setReplyText(''); setReplySubject(''); setReplyError(null); setReplySuccess(false) }} style={{ position: 'absolute', right: 12, top: 12 }}>Close</button>
            <h3 style={{ marginTop: 6 }}>{selectedFeedback.headline || '(no headline)'}</h3>
            {feedbackDetailLoading ? <p>Loading…</p> : (
              <div>
                <p><strong>ID:</strong> {selectedFeedback.id}</p>
                <p><strong>Email:</strong> {selectedFeedback.email || '—'}</p>
                <p><strong>Created:</strong> {formatDateTimeShortDE(selectedFeedback.created_at)}</p>
                <p><strong>Status:</strong> {(() => {
                  const s = selectedFeedback.status || 'open'
                  if (s === 'new') return 'Neu'
                  if (s === 'open') return 'Offen'
                  if (s === 'resolved') return 'Abgeschlossen'
                  return s
                })()}</p>
                <hr />
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.message}</p>
                <hr />
                <h4>Metadata</h4>
                <pre style={{ background: '#f6f8fa', padding: 8, borderRadius: 6, overflow: 'auto' }}>{JSON.stringify(selectedFeedback.metadata || {}, null, 2)}</pre>

                <h4 style={{ marginTop: 12 }}>Kommentare (intern)</h4>
                {(selectedFeedback.comments || []).length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Keine Kommentare.</div>
                )}
                {(selectedFeedback.comments || []).map((c: any) => {
                  const isEmailReply = c.message?.startsWith('[E-Mail-Antwort')
                  const isEmailInbound = c.message?.startsWith('[E-Mail-Eingang')
                  let bgColor = undefined
                  if (isEmailReply) bgColor = '#f0fdf4' // Admin reply: light green
                  if (isEmailInbound) bgColor = '#eff6ff' // Inbound email: light blue
                  return (
                    <div key={c.id} style={{ padding: '8px 10px', borderBottom: '1px solid #eee', background: bgColor, borderRadius: 4 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{c.author_id || (isEmailInbound ? 'User (E-Mail)' : 'admin')} • {formatDateTimeShortDE(c.created_at)}</div>
                      <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', fontSize: 14 }}>{c.message}</div>
                    </div>
                  )
                })}

                {/* Inline comment form */}
                <div style={{ marginTop: 10 }}>
                  <textarea
                    rows={2}
                    placeholder="Interner Kommentar …"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, resize: 'vertical' }}
                  />
                  <button
                    disabled={commentSending || !commentText.trim()}
                    onClick={() => addFeedbackComment(String(selectedFeedback.id), commentText)}
                    style={{ marginTop: 4 }}
                  >{commentSending ? 'Speichern …' : 'Kommentar speichern'}</button>
                </div>

                {/* Email reply — only if feedback has an email */}
                {selectedFeedback.email ? (
                  <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 8px' }}>E-Mail-Antwort an {selectedFeedback.email}</h4>
                    <input
                      type="text"
                      placeholder={`Betreff (Standard: Re: ${selectedFeedback.headline || 'Feedback'})`}
                      value={replySubject}
                      onChange={e => { setReplySubject(e.target.value); setReplyError(null); setReplySuccess(false) }}
                      style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 6 }}
                    />
                    <textarea
                      rows={4}
                      placeholder="Antworttext …"
                      value={replyText}
                      onChange={e => { setReplyText(e.target.value); setReplyError(null); setReplySuccess(false) }}
                      style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, resize: 'vertical' }}
                    />
                    {replyError && (
                      <div style={{ marginTop: 4, color: '#dc2626', fontSize: 13 }}>{replyError}</div>
                    )}
                    {replySuccess && (
                      <div style={{ marginTop: 4, color: '#16a34a', fontSize: 13 }}>E-Mail erfolgreich gesendet.</div>
                    )}
                    <button
                      disabled={replySending || !replyText.trim()}
                      onClick={() => sendFeedbackReply(String(selectedFeedback.id))}
                      style={{ marginTop: 6 }}
                    >{replySending ? 'Senden …' : 'E-Mail senden'}</button>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef9c3', borderRadius: 6, fontSize: 13, color: '#854d0e' }}>
                    Keine E-Mail-Adresse in diesem Feedback — Antwort per E-Mail nicht möglich.
                  </div>
                )}

                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <button onClick={async () => {
                    const ok = await resolveFeedback(String(selectedFeedback.id), !(selectedFeedback.status === 'resolved'))
                    if (ok) { setSelectedFeedback(null); fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ) }
                  }}>{selectedFeedback.status === 'resolved' ? 'Als offen markieren' : 'Als abgeschlossen markieren'}</button>
                  <button className="danger" onClick={async () => {
                    const ok = await deleteFeedback(String(selectedFeedback.id))
                    if (ok) { setSelectedFeedback(null); fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ) }
                  }} style={{ marginLeft: 'auto' }}>Löschen</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
