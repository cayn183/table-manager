import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/apiClient'
import '../styles/admin-panel.css'

type UserRow = { id: string; name: string; email: string; created_at: string; is_admin: boolean; deleted_at?: string }
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
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null)
  const [feedbackDetailLoading, setFeedbackDetailLoading] = useState(false)

  useEffect(() => { fetchUsers(page, perPage, q) }, [auth.token, page, perPage, q])
  useEffect(() => { if (menu === 'audit') fetchAudit(auditPage, auditPerPage) }, [auth.token, menu, auditPage, auditPerPage])
  useEffect(() => { if (menu === 'feedback') fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ) }, [auth.token, menu, feedbackPage, feedbackPerPage, feedbackQ])

  if (!auth.user) return <div style={{ padding: 24 }}>Nicht angemeldet</div>
  if (!(auth.user as any).is_admin) return <div style={{ padding: 24 }}>Zugriff verweigert</div>

  async function fetchUsers(p = 1, pp = 25, query = '') {
    if (!auth.token) return
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
    if (!auth.token) return
    try {
      const res = await api.get(`/admin/audit?page=${p}&perPage=${pp}`, auth.token ?? undefined)
      setAuditEntries(res.entries || [])
      setAuditTotal(res.total || 0)
    } catch (e: any) {
      // ignore for now
    }
  }

  async function fetchFeedback(p = 1, pp = 25, query = '') {
    if (!auth.token) return
    try {
      const res = await api.get(`/admin/feedback?page=${p}&perPage=${pp}&q=${encodeURIComponent(query)}`, auth.token ?? undefined)
      setFeedbackEntries(res.entries || [])
      setFeedbackTotal(res.total || 0)
    } catch (e: any) {
      // ignore
    }
  }

  async function fetchFeedbackDetail(id: string) {
    if (!auth.token) return
    setFeedbackDetailLoading(true)
    try {
      const res = await api.get(`/admin/feedback/${id}`, auth.token ?? undefined)
      setSelectedFeedback(res)
    } catch (e: any) {
      alert(e?.message || 'Failed to load feedback')
    } finally { setFeedbackDetailLoading(false) }
  }

  async function addFeedbackComment(id: string, message: string) {
    if (!auth.token) return
    try {
      await api.post(`/admin/feedback/${id}/comment`, { message }, auth.token ?? undefined)
      fetchFeedbackDetail(id)
      fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ)
    } catch (e: any) { alert(e?.message || 'Failed to add comment') }
  }

  async function resolveFeedback(id: string, resolved = true) {
    if (!auth.token) return
    try {
      await api.post(`/admin/feedback/${id}/resolve`, { resolved }, auth.token ?? undefined)
      fetchFeedbackDetail(id)
      fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ)
    } catch (e: any) { alert(e?.message || 'Failed to update') }
  }

  async function deleteFeedback(id: string) {
    if (!auth.token) return
    if (!confirm('Feedback wirklich löschen (soft delete)?')) return
    try {
      await api.del(`/admin/feedback/${id}`, auth.token ?? undefined)
      setSelectedFeedback(null)
      fetchFeedback(feedbackPage, feedbackPerPage, feedbackQ)
    } catch (e: any) { alert(e?.message || 'Failed to delete') }
  }

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <div>
          <h3>Admin Center</h3>
          <nav className="admin-nav">
            <button onClick={() => setMenu('users')} className={`admin-nav-button ${menu === 'users' ? 'active' : ''}`}>Benutzerverwaltung</button>
            <button onClick={() => setMenu('audit')} className={`admin-nav-button ${menu === 'audit' ? 'active' : ''}`}>Audit Log</button>
            <button onClick={() => setMenu('feedback')} className={`admin-nav-button ${menu === 'feedback' ? 'active' : ''}`}>Feedback (später)</button>
            <button onClick={() => setMenu('system')} className={`admin-nav-button ${menu === 'system' ? 'active' : ''}`}>System (später)</button>
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
                    <td style={{ padding: 8 }}>{new Date(u.created_at).toLocaleString()}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={async () => fetchUserDetail(u.id)}>View</button>
                      <button style={{ marginLeft: 8 }} onClick={async () => {
                        try {
                          await api.post(`/admin/users/${u.id}/role`, { is_admin: !u.is_admin }, auth.token!)
                          fetchUsers(page, perPage, q)
                        } catch (e: any) { alert(e?.message || 'Error') }
                      }}>{u.is_admin ? 'Revoke admin' : 'Make admin'}</button>
                      <button style={{ marginLeft: 8 }} onClick={async () => {
                        if (!confirm('Benutzer wirklich löschen (soft delete)?')) return
                        try {
                          await api.del(`/admin/users/${u.id}`, auth.token!)
                          fetchUsers(page, perPage, q)
                        } catch (e: any) { alert(e?.message || 'Error') }
                      }}>Delete</button>
                      <button style={{ marginLeft: 8 }} onClick={async () => {
                        if (!confirm('Benutzer endgültig entfernen? Diese Aktion ist unwiderruflich.')) return
                        try {
                          await api.post(`/admin/users/${u.id}/purge`, {}, auth.token!)
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input placeholder="Search email or message" value={feedbackQ} onChange={e => { setFeedbackQ(e.target.value); setFeedbackPage(1) }} style={{ padding: 8, flex: 1 }} />
              <select value={feedbackPerPage} onChange={e => { setFeedbackPerPage(parseInt(e.target.value, 10)); setFeedbackPage(1) }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {feedbackEntries.map(f => (
                  <tr key={f.id}>
                    <td style={{ padding: 10 }}>{new Date(f.created_at).toLocaleString()}</td>
                    <td style={{ padding: 10, fontFamily: 'monospace' }}>{f.user_id || '—'}</td>
                    <td style={{ padding: 10 }}>{f.email || '—'}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ fontWeight: 700 }}>{f.headline || '(no headline)'}</div>
                      <div style={{ marginTop: 6 }}>{f.message?.slice?.(0, 160)}</div>
                      <div style={{ marginTop: 8 }}>
                        <button onClick={() => fetchFeedbackDetail(f.id)}>View</button>
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

        {menu !== 'users' && menu !== 'audit' && (
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
              <p><strong>Deleted:</strong> {selectedUser.deleted_at || '—'}</p>
            </div>
          )}
        </div>
      )}
      {/* Feedback detail drawer */}
      {selectedFeedback && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 540, background: 'white', boxShadow: '-6px 0 24px rgba(0,0,0,0.12)', padding: 16, overflow: 'auto' }}>
          <button onClick={() => setSelectedFeedback(null)} style={{ float: 'right' }}>Close</button>
          <h3>{selectedFeedback.headline || '(no headline)'}</h3>
          {feedbackDetailLoading ? <p>Loading…</p> : (
            <div>
              <p><strong>ID:</strong> {selectedFeedback.id}</p>
              <p><strong>User:</strong> {selectedFeedback.user_id || '—'}</p>
              <p><strong>Email:</strong> {selectedFeedback.email || '—'}</p>
              <p><strong>Created:</strong> {new Date(selectedFeedback.created_at).toLocaleString()}</p>
              <p><strong>Status:</strong> {selectedFeedback.status}</p>
              <hr />
              <p style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.message}</p>
              <hr />
              <h4>Metadata</h4>
              <pre style={{ background: '#f6f8fa', padding: 8, borderRadius: 6, overflow: 'auto' }}>{JSON.stringify(selectedFeedback.metadata || {}, null, 2)}</pre>

              <h4 style={{ marginTop: 12 }}>Comments</h4>
              {(selectedFeedback.comments || []).map((c: any) => (
                <div key={c.id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{c.author_id || 'admin'} • {new Date(c.created_at).toLocaleString()}</div>
                  <div style={{ marginTop: 6 }}>{c.message}</div>
                </div>
              ))}

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  const txt = prompt('Kommentar hinzufügen')
                  if (txt) addFeedbackComment(selectedFeedback.id, txt)
                }}>Add comment</button>
                <button onClick={() => resolveFeedback(selectedFeedback.id, !(selectedFeedback.status === 'resolved'))}>{selectedFeedback.status === 'resolved' ? 'Mark as open' : 'Mark as resolved'}</button>
                <button className="danger" onClick={() => deleteFeedback(selectedFeedback.id)} style={{ marginLeft: 'auto' }}>Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
