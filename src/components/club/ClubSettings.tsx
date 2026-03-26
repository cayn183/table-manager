import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getClub, updateClub, deleteClub, transferOwnership, getClubMembers } from '../../api/clubApi'
import { useClubs } from './ClubContext'
import type { Club, ClubMember } from '../../types/club'

export default function ClubSettings() {
  const { clubId } = useParams<{ clubId: string }>()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const { refreshClubs } = useClubs()
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [transferTarget, setTransferTarget] = useState('')
  const [loading, setLoading] = useState(true)

  const isOwner = club?.my_role === 'owner'
  const isVorstand = club?.my_role === 'owner' || club?.my_role === 'vorstand'

  useEffect(() => {
    if (!clubId) return
    Promise.all([
      getClub(clubId, token || undefined).then(c => { setClub(c); setName(c.name); setDescription(c.description || '') }),
      getClubMembers(clubId, token || undefined).then(setMembers)
    ]).finally(() => setLoading(false))
  }, [clubId, token])

  async function handleSave() {
    if (!clubId) return
    setSaving(true)
    setSaved(false)
    try {
      const updated = await updateClub(clubId, { name: name.trim(), description: description.trim() || undefined }, token || undefined)
      setClub(prev => prev ? { ...prev, ...updated } : prev)
      await refreshClubs()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      alert(err?.message || 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!clubId) return
    try {
      await deleteClub(clubId, token || undefined)
      await refreshClubs()
      navigate('/app')
    } catch (err: any) {
      alert(err?.message || 'Fehler')
    }
  }

  async function handleTransfer() {
    if (!clubId || !transferTarget) return
    if (!confirm('Bist du sicher? Du wirst danach nur noch Vorstand sein.')) return
    try {
      await transferOwnership(clubId, transferTarget, token || undefined)
      await refreshClubs()
      navigate('/app')
    } catch (err: any) {
      alert(err?.message || 'Fehler')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Laden…</div>
  if (!club || !isVorstand) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Zugriff verweigert.</div>

  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: 20
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/app')} style={{ border: 'none', background: 'none', color: '#667eea', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16, padding: 0 }}>
        ← Zurück zum Dashboard
      </button>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
        ⚙️ Vereinseinstellungen — {club.name}
      </h2>

      {/* General Settings */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Allgemein</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Vereinsname</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#667eea'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Beschreibung</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optionale Beschreibung eures Vereins…"
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#667eea'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
            {saved && <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>✓ Gespeichert</span>}
          </div>
        </div>
      </div>

      {/* Transfer Ownership (Owner only) */}
      {isOwner && members.length > 1 && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#d97706' }}>🔄 Eigentümer übertragen</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>Übertrage die Vereinsleitung an ein anderes Mitglied. Du wirst danach zum Vorstand.</p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={transferTarget}
              onChange={e => setTransferTarget(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
            >
              <option value="">— Mitglied wählen —</option>
              {members.filter(m => m.user_id !== user?.id).map(m => (
                <option key={m.user_id} value={m.user_id ?? ''}>{m.name} ({m.email})</option>
              ))}
            </select>
            <button
              onClick={handleTransfer}
              disabled={!transferTarget}
              style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, cursor: transferTarget ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, opacity: transferTarget ? 1 : 0.5 }}
            >
              Übertragen
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone (Owner only) */}
      {isOwner && (
        <div style={{ ...cardStyle, borderColor: '#fecaca' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#dc2626' }}>⚠️ Gefahrenzone</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>Der Verein und alle zugehörigen Events werden unwiderruflich gelöscht.</p>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{ padding: '10px 20px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              Verein löschen
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>Wirklich löschen?</span>
              <button
                onClick={handleDelete}
                style={{ padding: '8px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Ja, löschen
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
