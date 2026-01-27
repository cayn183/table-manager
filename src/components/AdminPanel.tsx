import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import api from '../api/apiClient'

type UserRow = { id: string; name: string; email: string; created_at: string; is_admin: boolean; deleted_at?: string }

export default function AdminPanel() {
  const auth = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth.token) return
    setLoading(true)
    api.get('/admin/users', auth.token).then((res: any) => {
      setUsers(res.users || [])
      setLoading(false)
    }).catch((err: any) => {
      setError(err?.message || 'Failed to load')
      setLoading(false)
    })
  }, [auth.token])

  if (!auth.user) return <div>Nicht angemeldet</div>
  if (!(auth.user as any).is_admin) return <div>Zugriff verweigert</div>

  return (
    <div style={{ padding: 24 }}>
      <h2>Admin: Benutzerverwaltung</h2>
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
                <button onClick={async () => {
                  try {
                    await api.post(`/admin/users/${u.id}/role`, { is_admin: !u.is_admin }, auth.token!)
                    // refresh
                    const res = await api.get('/admin/users', auth.token!)
                    setUsers(res.users || [])
                  } catch (e: any) { alert(e?.message || 'Error') }
                }}>{u.is_admin ? 'Revoke admin' : 'Make admin'}</button>
                <button style={{ marginLeft: 8 }} onClick={async () => {
                  if (!confirm('Benutzer wirklich löschen (soft delete)?')) return
                  try {
                    await api.del(`/admin/users/${u.id}`, auth.token!)
                    const res = await api.get('/admin/users', auth.token!)
                    setUsers(res.users || [])
                  } catch (e: any) { alert(e?.message || 'Error') }
                }}>Delete</button>
                <button style={{ marginLeft: 8 }} onClick={async () => {
                  if (!confirm('Benutzer endgültig entfernen? Diese Aktion ist unwiderruflich.')) return
                  try {
                    await api.post(`/admin/users/${u.id}/purge`, {}, auth.token!)
                    const res = await api.get('/admin/users', auth.token!)
                    setUsers(res.users || [])
                  } catch (e: any) { alert(e?.message || 'Error') }
                }}>Purge</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
