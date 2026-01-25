import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/apiClient'

export default function Profile() {
  const { token, user, logout } = useAuth()
  const [stats, setStats] = useState<{ events: number; rooms: number } | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return
    let mounted = true
    ;(async () => {
      try {
        const me = await api.get('/auth/me', token)
        if (mounted) setCreatedAt(me.created_at || null)
      } catch (e) {}
      try {
        const s = await api.get('/auth/stats', token)
        if (mounted) setStats(s)
      } catch (e) {}
    })()
    return () => { mounted = false }
  }, [token])

  async function handleChange() {
    setMsg(null)
    if (!oldPwd || !newPwd) { setMsg('Bitte beide Felder ausfüllen'); return }
    setChanging(true)
    try {
      await api.post('/auth/change-password', { oldPassword: oldPwd, newPassword: newPwd }, token ?? undefined)
      setMsg('Passwort geändert')
      setOldPwd('')
      setNewPwd('')
    } catch (err: any) {
      setMsg(err?.message || 'Fehler beim Ändern des Passworts')
    } finally { setChanging(false) }
  }

  async function handleDeleteAccount() {
    if (!token) return
    try {
      await api.del('/auth/me', token)
      try { localStorage.removeItem('tm_token'); localStorage.removeItem('tm_user') } catch (e) {}
      logout()
    } catch (e) {
      setMsg('Account-Löschen fehlgeschlagen')
    }
  }

  return (
    <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 900 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 12, background: 'transparent', border: 'none', cursor: 'pointer' }}>← Zurück</button>
        <h2 style={{ marginTop: 0 }}>Profil</h2>

        <div style={{ background: 'white', padding: 24, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{user?.name || user?.email}</div>
              <div style={{ fontSize: 13, color: '#555' }}>{user?.email}</div>
              {createdAt && <div style={{ fontSize: 13, color: '#555' }}>Registriert: {new Date(createdAt).toLocaleString()}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#666' }}>Events</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{stats?.events ?? '–'}</div>
            </div>
          </div>

          <hr style={{ margin: '16px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
            <div>
              <h3>Passwort ändern</h3>
              {msg && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{msg}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="password" placeholder="Altes Passwort" value={oldPwd} onChange={e => setOldPwd(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
                <input type="password" placeholder="Neues Passwort" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleChange} disabled={changing} style={{ padding: '10px 14px', background: '#2b6cb0', color: 'white', borderRadius: 8 }}>{changing ? '...' : 'Ändern'}</button>
                </div>
              </div>
            </div>

            <div>
              <h3>Account Aktionen</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => { try { localStorage.removeItem('currentRoom'); localStorage.removeItem('rooms'); localStorage.removeItem('events') } catch(e){}; setMsg('Lokale Daten gelöscht') }} style={{ padding: '8px 12px' }}>Alle lokalen Daten löschen</button>
                <button onClick={handleDeleteAccount} style={{ padding: '8px 12px', background: '#9b2c2c', color: 'white' }}>Account löschen</button>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>Hinweis: Account-Löschung entfernt alle serverseitigen Daten.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
