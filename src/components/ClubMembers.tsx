import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getClubMembers, updateClubMember, removeClubMember, getInvites, createInvite, revokeInvite, getClub } from '../api/clubApi'
import type { ClubMember, ClubInvite, Club } from '../types/club'
import { ROLE_LABELS } from '../types/club'
import type { ClubRole } from '../types/club'

export default function ClubMembers() {
  const { clubId } = useParams<{ clubId: string }>()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [invites, setInvites] = useState<ClubInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDesc, setEditingDesc] = useState<string | null>(null)
  const [descDraft, setDescDraft] = useState('')
  const [inviteForm, setInviteForm] = useState(false)
  const [inviteHours, setInviteHours] = useState(72)
  const [inviteMaxUses, setInviteMaxUses] = useState<number | ''>('')

  const isVorstand = club?.my_role === 'owner' || club?.my_role === 'vorstand'
  const isOwner = club?.my_role === 'owner'

  useEffect(() => {
    if (!clubId) return
    Promise.all([
      getClub(clubId, token || undefined).then(setClub),
      getClubMembers(clubId, token || undefined).then(setMembers),
      getInvites(clubId, token || undefined).then(setInvites).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [clubId, token])

  async function handleRoleChange(userId: string, newRole: string) {
    if (!clubId) return
    try {
      await updateClubMember(clubId, userId, { role: newRole }, token || undefined)
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole as ClubRole } : m))
    } catch (err: any) {
      alert(err?.message || 'Fehler')
    }
  }

  async function handleDescSave(userId: string) {
    if (!clubId) return
    try {
      await updateClubMember(clubId, userId, { description: descDraft }, token || undefined)
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, description: descDraft } : m))
      setEditingDesc(null)
    } catch (err: any) {
      alert(err?.message || 'Fehler')
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!clubId) return
    const isSelf = userId === user?.id
    const msg = isSelf ? 'Möchtest du den Verein wirklich verlassen?' : `${name} wirklich aus dem Verein entfernen?`
    if (!confirm(msg)) return
    try {
      await removeClubMember(clubId, userId, token || undefined)
      if (isSelf) { navigate('/app'); return }
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    } catch (err: any) {
      alert(err?.message || 'Fehler')
    }
  }

  async function handleCreateInvite() {
    if (!clubId) return
    try {
      await createInvite(clubId, { expires_in_hours: inviteHours, max_uses: inviteMaxUses || undefined }, token || undefined)
      const list = await getInvites(clubId, token || undefined)
      setInvites(list)
      setInviteForm(false)
    } catch (err: any) {
      alert(err?.message || 'Fehler')
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!clubId) return
    try {
      await revokeInvite(clubId, inviteId, token || undefined)
      setInvites(prev => prev.filter(i => i.id !== inviteId))
    } catch {}
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Laden…</div>
  if (!club) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Verein nicht gefunden.</div>

  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/app')} style={{ border: 'none', background: 'none', color: '#667eea', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16, padding: 0 }}>
        ← Zurück zum Dashboard
      </button>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
        👥 Mitglieder — {club.name}
      </h2>

      {/* Members Table */}
      <div style={{ ...cardStyle, marginBottom: 24, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Mitglied</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Rolle</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Beschreibung</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Beigetreten</th>
              <th style={{ padding: '8px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: m.role === 'owner' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : m.role === 'vorstand' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: m.role === 'mitglied' ? '#64748b' : 'white', flexShrink: 0
                    }}>
                      {(m.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {m.role === 'owner' ? (
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>{ROLE_LABELS.owner}</span>
                  ) : isOwner ? (
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.user_id, e.target.value)}
                      style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: 'white', cursor: 'pointer' }}
                    >
                      <option value="vorstand">Vorstand</option>
                      <option value="mitglied">Mitglied</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 13, color: '#374151' }}>{ROLE_LABELS[m.role]}</span>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {editingDesc === m.user_id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={descDraft} onChange={e => setDescDraft(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 13, flex: 1 }} />
                      <button onClick={() => handleDescSave(m.user_id)} style={{ padding: '4px 8px', background: '#667eea', color: 'white', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>✓</button>
                      <button onClick={() => setEditingDesc(null)} style={{ padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <span
                      onClick={() => { if (isVorstand || m.user_id === user?.id) { setEditingDesc(m.user_id); setDescDraft(m.description || '') } }}
                      style={{ fontSize: 13, color: m.description ? '#374151' : '#cbd5e1', cursor: (isVorstand || m.user_id === user?.id) ? 'pointer' : 'default' }}
                    >
                      {m.description || (isVorstand || m.user_id === user?.id ? '+ Beschreibung' : '—')}
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }}>
                  {new Date(m.joined_at).toLocaleDateString('de-DE')}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {m.role !== 'owner' && (isVorstand || m.user_id === user?.id) && (
                    <button
                      onClick={() => handleRemove(m.user_id, m.name)}
                      style={{ padding: '4px 10px', background: m.user_id === user?.id ? '#fef3c7' : '#fee2e2', color: m.user_id === user?.id ? '#92400e' : '#991b1b', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                    >
                      {m.user_id === user?.id ? 'Verlassen' : 'Entfernen'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invites Section (Vorstand+) */}
      {isVorstand && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>🔗 Einladungscodes</h3>
            <button
              onClick={() => setInviteForm(!inviteForm)}
              style={{ padding: '6px 14px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              + Neuer Code
            </button>
          </div>
          {inviteForm && (
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>Gültig (Std.)</label>
                <input type="number" value={inviteHours} onChange={e => setInviteHours(+e.target.value)} min={1} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, width: 80, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>Max. Nutzungen</label>
                <input type="number" value={inviteMaxUses} onChange={e => setInviteMaxUses(e.target.value ? +e.target.value : '')} min={1} placeholder="∞" style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, width: 80, fontSize: 13 }} />
              </div>
              <button onClick={handleCreateInvite} style={{ padding: '6px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Erstellen
              </button>
            </div>
          )}
          {invites.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Keine aktiven Einladungscodes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invites.map(inv => {
                const expired = inv.expires_at && new Date(inv.expires_at) < new Date()
                const exhausted = inv.max_uses && inv.used_count >= inv.max_uses
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: expired || exhausted ? '#fef2f2' : '#f0fdf4', borderRadius: 6 }}>
                    <code style={{ fontSize: 14, fontFamily: 'monospace', letterSpacing: 2, fontWeight: 600, color: '#1e293b' }}>{inv.code}</code>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      {inv.used_count}× genutzt{inv.max_uses ? ` / max. ${inv.max_uses}` : ''}
                    </span>
                    {inv.expires_at && (
                      <span style={{ fontSize: 12, color: expired ? '#991b1b' : '#64748b' }}>
                        {expired ? 'Abgelaufen' : `bis ${new Date(inv.expires_at).toLocaleString('de-DE')}`}
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => navigator.clipboard.writeText(inv.code)} style={{ padding: '3px 8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>📋</button>
                    <button onClick={() => handleRevokeInvite(inv.id)} style={{ padding: '3px 8px', background: '#fee2e2', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: '#991b1b' }}>✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
