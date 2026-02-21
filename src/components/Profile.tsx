import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import userStorage from '../utils/userStorage'
import { useNavigate } from 'react-router-dom'
import api from '../api/apiClient'

export default function Profile() {
  const { user, token, logout } = useAuth()
  const [stats, setStats] = useState<{ events: number; rooms: number } | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  
  // Email change states
  const [changingEmail, setChangingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailMsg, setEmailMsg] = useState<string | null>(null)
  
  // Password confirmation
  const [confirmNewPwd, setConfirmNewPwd] = useState('')
  
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const me = await api.get('/auth/me')
        if (mounted) setCreatedAt(me.created_at || null)
      } catch (e) {}
      try {
        const s = await api.get('/auth/stats')
        if (mounted) setStats(s)
      } catch (e) {}
    })()
    return () => { mounted = false }
  }, [])

  async function handleChange() {
    setMsg(null)
    if (!oldPwd || !newPwd || !confirmNewPwd) { setMsg('Bitte alle Felder ausfüllen'); return }
    if (newPwd !== confirmNewPwd) { setMsg('Neue Passwörter stimmen nicht überein'); return }
    setChanging(true)
    try {
      await api.post('/auth/change-password', { oldPassword: oldPwd, newPassword: newPwd }, token || undefined)
      setMsg('Passwort geändert')
      setOldPwd('')
      setNewPwd('')
      setConfirmNewPwd('')
    } catch (err: any) {
      if (err?.message === 'Missing token' || err?.message === 'Invalid token') {
        setMsg('Sitzung abgelaufen. Bitte erneut einloggen.')
        setTimeout(() => logout(), 1200)
      } else {
        setMsg(err?.message || 'Fehler beim Ändern des Passworts')
      }
    } finally { setChanging(false) }
  }

  async function handleEmailChange() {
    setEmailMsg(null)
    if (!newEmail || !emailPassword) { setEmailMsg('Bitte alle Felder ausfüllen'); return }
    setChangingEmail(true)
    try {
      const result = await api.post('/auth/change-email', { newEmail, password: emailPassword }, token || undefined)
      if (result.requiresVerification) {
        setEmailMsg('Bestätigungs-Email wurde an die neue Adresse gesendet')
      } else {
        setEmailMsg('Email-Adresse wurde geändert')
        // Refresh page to update user context
        setTimeout(() => window.location.reload(), 1500)
      }
      setNewEmail('')
      setEmailPassword('')
    } catch (err: any) {
      if (err?.message === 'Missing token' || err?.message === 'Invalid token') {
        setEmailMsg('Sitzung abgelaufen. Bitte erneut einloggen.')
        setTimeout(() => logout(), 1200)
      } else {
        setEmailMsg(err?.message || 'Fehler beim Ändern der Email')
      }
    } finally { setChangingEmail(false) }
  }

  async function handleDeleteAccount() {
    try {
      await api.del('/auth/me', token || undefined)
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div>
              <h3>Email ändern</h3>
              {emailMsg && <div style={{ color: emailMsg.includes('geändert') || emailMsg.includes('gesendet') ? '#047857' : '#b91c1c', marginBottom: 8 }}>{emailMsg}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input 
                  type="email" 
                  placeholder="Neue Email-Adresse" 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                  style={{ padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} 
                />
                <input 
                  type="password" 
                  placeholder="Aktuelles Passwort" 
                  value={emailPassword} 
                  onChange={e => setEmailPassword(e.target.value)} 
                  style={{ padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} 
                />
                <button 
                  onClick={handleEmailChange} 
                  disabled={changingEmail} 
                  style={{ padding: '10px 14px', background: '#2b6cb0', color: 'white', borderRadius: 8, border: 'none', cursor: changingEmail ? 'not-allowed' : 'pointer' }}
                >
                  {changingEmail ? '...' : 'Email ändern'}
                </button>
              </div>
            </div>

            <div>
              <h3>Passwort ändern</h3>
              {msg && <div style={{ color: msg.includes('geändert') ? '#047857' : '#b91c1c', marginBottom: 8 }}>{msg}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="password" placeholder="Altes Passwort" value={oldPwd} onChange={e => setOldPwd(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
                <input type="password" placeholder="Neues Passwort" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
                <input type="password" placeholder="Neues Passwort bestätigen" value={confirmNewPwd} onChange={e => setConfirmNewPwd(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #e6e6e6' }} />
                <button onClick={handleChange} disabled={changing} style={{ padding: '10px 14px', background: '#2b6cb0', color: 'white', borderRadius: 8, border: 'none', cursor: changing ? 'not-allowed' : 'pointer' }}>{changing ? '...' : 'Passwort ändern'}</button>
              </div>
            </div>
          </div>

          <hr style={{ margin: '16px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
            <div></div>

            <div>
              <h3>Account Aktionen</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => { try { if (user && user.id) userStorage.clearAllForUser(user.id); else { localStorage.removeItem('currentRoom'); localStorage.removeItem('rooms'); localStorage.removeItem('events'); } } catch(e){}; setMsg('Lokale Daten gelöscht') }} style={{ padding: '8px 12px' }}>Alle lokalen Daten löschen</button>
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
