import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/apiClient'
import { markRepliesSeen } from './UserMenu'
import '../styles/admin-panel.css'

type UserRow = { id: string; name: string; email: string; created_at: string; is_admin: boolean; email_verified?: boolean; deleted_at?: string }
type AuditRow = { id: string; actor_id: string; action: string; target_type: string; target_id: string; details: any; created_at: string }

export default function AdminPanel() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [menu, setMenu] = useState<'users' | 'audit' | 'feedback' | 'system'>('users')

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
  const [feedbackPerPage, setFeedbackPerPage] = useState(25)
  const [feedbackTotal, setFeedbackTotal] = useState(0)
  const [feedbackQ, setFeedbackQ] = useState('')
  // Filters: Neu / Offen / Abgeschlossen
  const [showNew, setShowNew] = useState(true)
  const [showOpen, setShowOpen] = useState(true)
  const [showResolved, setShowResolved] = useState(true)
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
  useEffect(() => {
    if (menu === 'feedback') {
      fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ)
      markRepliesSeen()
    }
  }, [auth.user, menu, feedbackPage, feedbackPerPage, feedbackQ, showNew, showOpen, showResolved])

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

  async function fetchFeedback(p = 1, pp = 25, query = '') {
    if (!auth.user) return
    try {
      const statuses: string[] = []
      if (showNew) statuses.push('new')
      if (showOpen) statuses.push('open')
      if (showResolved) statuses.push('resolved')
      const statusesParam = statuses.join(',')
      const res = await api.get(`/admin/feedback?page=${p}&perPage=${pp}&q=${encodeURIComponent(query)}&statuses=${encodeURIComponent(statusesParam)}`, auth.token ?? undefined)
      setFeedbackEntries(res.entries || [])
      setFeedbackTotal(res.total || 0)
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
          </nav>
        </div>
        <div>
          <button className="admin-leave-button" onClick={() => navigate('/')}>Admincenter verlassen</button>
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
                    <td style={{ padding: 8 }}>{new Date(u.created_at).toLocaleString()}</td>
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
                    <td style={{ padding: 8 }}>{new Date(a.created_at).toLocaleString()}</td>
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
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={showNew} onChange={e => { setShowNew(e.target.checked); setFeedbackPage(1) }} />
                  <span>Neu</span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={showOpen} onChange={e => { setShowOpen(e.target.checked); setFeedbackPage(1) }} />
                  <span>Offen</span>
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={showResolved} onChange={e => { setShowResolved(e.target.checked); setFeedbackPage(1) }} />
                  <span>Abgeschlossen</span>
                </label>
                {/* 'Gelöscht' filter removed — deleted feedback is permanently removed */}
                <button style={{ marginLeft: 'auto' }} onClick={() => fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ)}>Reload</button>
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
                  <th>Time</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {feedbackEntries.map(f => (
                  <tr key={f.id}>
                    <td style={{ padding: 10 }}>{new Date(f.created_at).toLocaleString()}</td>
                    <td style={{ padding: 10 }}>{f.email || '—'}</td>
                    <td style={{ padding: 10 }}>
                      {(() => {
                        const status = f.status || 'open'
                        let display = status
                        if (status === 'new') display = 'Neu'
                        else if (status === 'open') display = 'Offen'
                        else if (status === 'resolved') display = 'Abgeschlossen'
                        const resolved = status === 'resolved'
                        let bg = '#fff7ed'
                        let color = '#92400e'
                        if (status === 'resolved') { bg = '#e6fffa'; color = '#0f766e' }
                        else if (status === 'new') { bg = '#eff6ff'; color = '#1e3a8a' }
                        return <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 6, background: bg, color, fontWeight: 600, fontSize: 12 }}>{display}</div>
                      })()}
                    </td>
                    <td style={{ padding: 10 }}>
                      <div style={{ fontWeight: 700 }}>{f.headline || '(no headline)'}</div>
                      <div style={{ marginTop: 6 }}>{f.message?.slice?.(0, 160)}</div>
                      <div style={{ marginTop: 8 }}>
                        <button onClick={() => fetchFeedbackDetail(f.id, true)}>View</button>
                      </div>
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
                <div style={{ marginTop: 8, color: '#475569' }}>Letzter Check: {lastCheck ? new Date(lastCheck).toLocaleString() : '—'}</div>
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

        {menu !== 'users' && menu !== 'audit' && menu !== 'system' && (
          <div style={{ marginTop: 24, color: '#64748b' }}>Diese Ansicht ist noch nicht implementiert.</div>
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
              <p><strong>Created:</strong> {new Date(selectedUser.created_at).toLocaleString()}</p>
              <p><strong>Admin:</strong> {(selectedUser as any).is_admin ? 'Yes' : 'No'}</p>
              <p><strong>Email verifiziert:</strong> {(selectedUser as any).email_verified ? 'Yes' : 'No'}</p>
              <p><strong>Deleted:</strong> {selectedUser.deleted_at || '—'}</p>
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
                <p><strong>Created:</strong> {new Date(selectedFeedback.created_at).toLocaleString()}</p>
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
                {(selectedFeedback.comments || []).map((c: any) => (
                  <div key={c.id} style={{ padding: '8px 10px', borderBottom: '1px solid #eee', background: c.message?.startsWith('[E-Mail-Antwort') ? '#f0fdf4' : undefined, borderRadius: 4 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{c.author_id || 'admin'} • {new Date(c.created_at).toLocaleString()}</div>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', fontSize: 14 }}>{c.message}</div>
                  </div>
                ))}

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
