import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import {
  getClubMembers, updateClubMember, removeClubMember, removeClubMemberById,
  getInvites, createInvite, revokeInvite, getClub,
  createManualMember, updateMemberProfile, getMergeSuggestions, mergeMembers,
} from '../../api/clubApi'
import type { ClubMember, ClubInvite, Club, MergeSuggestion } from '../../types/club'
import { ROLE_LABELS } from '../../types/club'
import { formatDateShort, formatDateTimeShortDE } from '../../utils/dateFormatting'
import type { ClubRole } from '../../types/club'
import ClubMemberModal from './ClubMemberModal'

type ViewMode = 'cards' | 'table'

function RoleBadge({ role, customRole }: { role: ClubRole; customRole?: string | null }) {
  const colors: Record<ClubRole, string> = {
    owner: 'linear-gradient(135deg, #f59e0b, #d97706)',
    vorstand: 'linear-gradient(135deg, #667eea, #764ba2)',
    mitglied: '#e2e8f0',
  }
  const textColor = role === 'mitglied' ? '#475569' : 'white'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 99,
      background: colors[role], color: textColor, fontSize: 11, fontWeight: 600,
    }}>
      {customRole || ROLE_LABELS[role]}
    </span>
  )
}

function Avatar({ name, role, isManual }: { name: string; role: ClubRole; isManual: boolean }) {
  const bg = role === 'owner'
    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
    : role === 'vorstand'
      ? 'linear-gradient(135deg, #667eea, #764ba2)'
      : isManual ? 'linear-gradient(135deg, #94a3b8, #64748b)' : '#e2e8f0'
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 700, color: role === 'mitglied' && !isManual ? '#475569' : 'white',
      flexShrink: 0, position: 'relative',
    }}>
      {(name || '?')[0].toUpperCase()}
      {isManual && (
        <span title="Manuell angelegt" style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 16, height: 16, borderRadius: '50%', background: '#f59e0b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, border: '2px solid white',
        }}>✎</span>
      )}
    </div>
  )
}

function InfoRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{children}</div>
      </div>
    </div>
  )
}

export default function ClubMembers() {
  const { clubId } = useParams<{ clubId: string }>()
  const { user, token } = useAuth()
  const navigate = useNavigate()

  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [invites, setInvites] = useState<ClubInvite[]>([])
  const [merges, setMerges] = useState<MergeSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editMember, setEditMember] = useState<ClubMember | null>(null)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Invite state
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

  // Load merge suggestions if vorstand
  useEffect(() => {
    if (!clubId || !isVorstand) return
    getMergeSuggestions(clubId, token || undefined).then(setMerges).catch(() => {})
  }, [clubId, token, isVorstand])

  function openCreate() { setEditMember(null); setModalOpen(true) }
  function openEdit(m: ClubMember) { setEditMember(m); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditMember(null) }

  async function handleSaveMember(data: any) {
    if (!clubId) return
    if (editMember) {
      await updateMemberProfile(clubId, editMember.id, data, token || undefined)
      const list = await getClubMembers(clubId, token || undefined)
      setMembers(list)
    } else {
      const created = await createManualMember(clubId, data, token || undefined)
      setMembers(prev => [...prev, created])
    }
    closeModal()
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!clubId) return
    try {
      await updateClubMember(clubId, userId, { role: newRole }, token || undefined)
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole as ClubRole } : m))
    } catch (err: any) { alert(err?.message || 'Fehler') }
  }

  async function handleRemove(member: ClubMember) {
    if (!clubId) return
    const isSelf = member.user_id === user?.id
    const msg = isSelf
      ? 'Möchtest du den Verein wirklich verlassen?'
      : `${member.display_name} wirklich entfernen?`
    if (!confirm(msg)) return
    try {
      if (member.is_manual) {
        await removeClubMemberById(clubId, member.id, token || undefined)
      } else {
        await removeClubMember(clubId, member.user_id!, token || undefined)
        if (isSelf) { navigate('/app'); return }
      }
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (err: any) { alert(err?.message || 'Fehler') }
  }

  async function handleMerge(suggestion: MergeSuggestion) {
    if (!clubId) return
    if (!confirm(`"${suggestion.manual_name}" (manuell) mit Account "${suggestion.user_name}" (${suggestion.user_email}) zusammenführen?\n\nDie Kontaktdaten werden übertragen und der manuelle Eintrag wird gelöscht.`)) return
    try {
      await mergeMembers(clubId, suggestion.manual_member_id, suggestion.real_member_id, token || undefined)
      const [list, newMerges] = await Promise.all([
        getClubMembers(clubId, token || undefined),
        getMergeSuggestions(clubId, token || undefined),
      ])
      setMembers(list)
      setMerges(newMerges)
    } catch (err: any) { alert(err?.message || 'Fehler') }
  }

  async function handleCreateInvite() {
    if (!clubId) return
    try {
      await createInvite(clubId, { expires_in_hours: inviteHours, max_uses: inviteMaxUses || undefined }, token || undefined)
      const list = await getInvites(clubId, token || undefined)
      setInvites(list)
      setInviteForm(false)
    } catch (err: any) { alert(err?.message || 'Fehler') }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!clubId) return
    try {
      await revokeInvite(clubId, inviteId, token || undefined)
      setInvites(prev => prev.filter(i => i.id !== inviteId))
    } catch {}
  }

  // Selection helpers
  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function escapeHtmlLocal(text?: string | null) {
    if (!text) return ''
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function handleSendEmail() {
    const recipients = members.filter(m => selectedIds.includes(m.id)).map(m => m.contact_email || m.email).filter(Boolean) as string[]
    if (recipients.length === 0) { alert('Keine Empfänger ausgewählt oder keine E-Mail-Adressen vorhanden.'); return }
    const bcc = recipients.join(',')
    window.location.href = `mailto:?bcc=${encodeURIComponent(bcc)}`
  }

  function handleGenerateLetters() {
    const selected = members.filter(m => selectedIds.includes(m.id) && m.address)
    if (selected.length === 0) { alert('Keine ausgewählten Mitglieder mit Adresse.'); return }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Serienbrief</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:40px} .letter{page-break-after:always;margin-bottom:20px} .addr{white-space:pre-line;margin-bottom:24px} .content{margin-top:20px}</style></head><body>${selected.map(m => `
      <div class="letter">
        <div class="addr">${escapeHtmlLocal(m.display_name)}<br/>${escapeHtmlLocal(m.address)}</div>
        <div class="content">Sehr geehrte(r) ${escapeHtmlLocal(m.display_name)},<br/><br/>[Ihr Brieftext hier]<br/><br/>Mit freundlichen Grüßen<br/>${escapeHtmlLocal(club?.name || '')}</div>
      </div>`).join('')}</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // also trigger download
    const a = document.createElement('a')
    a.href = url
    a.download = 'serienbrief.html'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Laden…</div>
  if (!club) return <div style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Verein nicht gefunden.</div>

  const card: React.CSSProperties = {
    background: 'white', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/app')} style={{ border: 'none', background: 'none', color: '#667eea', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16, padding: 0 }}>
        ← Zurück zum Dashboard
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          👥 Mitglieder — {club.name}
          <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>{members.length}</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            {(['cards', 'table'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 13,
                background: viewMode === v ? '#667eea' : 'white',
                color: viewMode === v ? 'white' : '#64748b', fontWeight: viewMode === v ? 600 : 400,
              }}>
                {v === 'cards' ? '⬜ Karten' : '☰ Liste'}
              </button>
            ))}
          </div>
          {isVorstand && (
            <button
              onClick={openCreate}
              style={{ padding: '7px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              + Mitglied anlegen
            </button>
          )}
          {/* invitation features moved to event Invite tab */}
        </div>
      </div>

      {/* Merge suggestions banner */}
      {isVorstand && merges.length > 0 && (
        <div style={{ ...card, marginBottom: 20, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#92400e', marginBottom: 10 }}>
            ⚠️ Fusionierungsvorschläge — {merges.length} manueller Eintrag kann mit einem Account verbunden werden
          </div>
          {merges.map(s => (
            <div key={s.manual_member_id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: 'white', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 6,
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{s.manual_name}</span>
                <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>manuell</span>
                <span style={{ color: '#64748b', fontSize: 13, margin: '0 8px' }}>→</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{s.user_name}</span>
                <span style={{ color: '#64748b', fontSize: 12, marginLeft: 6 }}>{s.user_email}</span>
              </div>
              <button
                onClick={() => handleMerge(s)}
                style={{ padding: '5px 14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Zusammenführen
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Members — Card view */}
      {viewMode === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
          {members.map(m => {
            const expanded = expandedCard === m.id
            const hasDetails = m.phone || m.address || m.iban || m.contact_email || m.notes || m.custom_role || m.member_since || m.birth_date
            return (
              <div key={m.id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                {/* Card top */}
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Avatar name={m.display_name} role={m.role} isManual={m.is_manual} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 3, wordBreak: 'break-word' }}>
                        {m.display_name}
                        {m.is_manual && (
                          <span title="Manuell angelegt (kein Account)" style={{ marginLeft: 6, fontSize: 11, color: '#94a3b8' }}>offline</span>
                        )}
                      </div>
                      <RoleBadge role={m.role} customRole={m.custom_role} />
                    </div>
                    {isVorstand && (
                      <button
                        onClick={() => openEdit(m)}
                        title="Bearbeiten"
                        style={{ border: 'none', background: '#f8fafc', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', fontSize: 14, color: '#667eea', flexShrink: 0 }}
                      >
                        ✎
                      </button>
                    )}
                  </div>

                  {/* Quick contact info */}
                  {(m.contact_email || m.email) && (
                    <div style={{ marginTop: 10, fontSize: 13, color: '#475569', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8' }}>✉</span>
                      <a href={`mailto:${m.contact_email || m.email}`} style={{ color: '#667eea', textDecoration: 'none', wordBreak: 'break-all' }}>
                        {m.contact_email || m.email}
                      </a>
                    </div>
                  )}
                  {m.phone && (
                    <div style={{ marginTop: 4, fontSize: 13, color: '#475569', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8' }}>📞</span>
                      <a href={`tel:${m.phone}`} style={{ color: '#475569', textDecoration: 'none' }}>{m.phone}</a>
                    </div>
                  )}
                  {m.address && !expanded && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
                      📍 {m.address.split('\n')[0]}
                    </div>
                  )}
                </div>

                {/* Expandable details */}
                {expanded && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f1f5f9' }}>
                    {m.address && (
                      <InfoRow icon="📍" label="Adresse">
                        <span style={{ whiteSpace: 'pre-line' }}>{m.address}</span>
                      </InfoRow>
                    )}
                    {m.iban && (
                      <InfoRow icon="🏦" label="IBAN">
                        <span style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{m.iban}</span>
                        {m.bic && <span style={{ color: '#94a3b8', marginLeft: 8 }}>BIC: {m.bic}</span>}
                      </InfoRow>
                    )}
                    {m.birth_date && (
                      <InfoRow icon="🎂" label="Geburtsdatum">
                        {formatDateShort(m.birth_date)}
                      </InfoRow>
                    )}
                    {m.member_since && (
                      <InfoRow icon="📅" label="Mitglied seit">
                        {formatDateShort(m.member_since)}
                      </InfoRow>
                    )}
                    {m.notes && (
                      <InfoRow icon="📝" label="Notizen">
                        <span style={{ whiteSpace: 'pre-line', color: '#475569' }}>{m.notes}</span>
                      </InfoRow>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div style={{
                  borderTop: '1px solid #f1f5f9', padding: '8px 18px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#fafafa',
                }}>
                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>
                    Beigetreten {formatDateShort(m.joined_at)}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {hasDetails && (
                      <button
                        onClick={() => setExpandedCard(expanded ? null : m.id)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}
                      >
                        {expanded ? '▲ weniger' : '▼ mehr'}
                      </button>
                    )}
                    {m.role !== 'owner' && (isVorstand || m.user_id === user?.id) && (
                      <button
                        onClick={() => handleRemove(m)}
                        style={{ padding: '3px 8px', background: m.user_id === user?.id ? '#fef3c7' : '#fee2e2', color: m.user_id === user?.id ? '#92400e' : '#991b1b', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                      >
                        {m.user_id === user?.id ? 'Verlassen' : 'Entfernen'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table view */
        <div style={{ ...card, marginBottom: 24, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Mitglied', 'Rolle', 'Kontakt', 'Mitglied seit', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={m.display_name} role={m.role} isManual={m.is_manual} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{m.display_name}</div>
                        {m.is_manual && <div style={{ fontSize: 11, color: '#94a3b8' }}>Offline-Mitglied</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {m.role === 'owner' || !isOwner ? (
                      <RoleBadge role={m.role} customRole={m.custom_role} />
                    ) : (
                      <select
                        value={m.role}
                        onChange={e => m.user_id && handleRoleChange(m.user_id, e.target.value)}
                        disabled={m.is_manual}
                        style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: 'white', cursor: 'pointer' }}
                      >
                        <option value="vorstand">Vorstand</option>
                        <option value="mitglied">Mitglied</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, color: '#475569' }}>{m.contact_email || m.email || '—'}</div>
                    {m.phone && <div style={{ fontSize: 12, color: '#94a3b8' }}>{m.phone}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }}>
                    {m.member_since
                      ? formatDateShort(m.member_since)
                      : formatDateShort(m.joined_at)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {isVorstand && (
                        <button onClick={() => openEdit(m)} style={{ padding: '4px 10px', background: '#f0f4ff', color: '#667eea', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✎</button>
                      )}
                      {m.role !== 'owner' && (isVorstand || m.user_id === user?.id) && (
                        <button
                          onClick={() => handleRemove(m)}
                          style={{ padding: '4px 10px', background: m.user_id === user?.id ? '#fef3c7' : '#fee2e2', color: m.user_id === user?.id ? '#92400e' : '#991b1b', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                        >
                          {m.user_id === user?.id ? 'Verlassen' : 'Entfernen'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invites Section */}
      {isVorstand && (
        <div style={card}>
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
                const expired = !!inv.expires_at && new Date(inv.expires_at) < new Date()
                const exhausted = !!(inv.max_uses && inv.used_count >= inv.max_uses)
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: expired || exhausted ? '#fef2f2' : '#f0fdf4', borderRadius: 6 }}>
                    <code style={{ fontSize: 14, fontFamily: 'monospace', letterSpacing: 2, fontWeight: 600, color: '#1e293b' }}>{inv.code}</code>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{inv.used_count}× genutzt{inv.max_uses ? ` / max. ${inv.max_uses}` : ''}</span>
                    {inv.expires_at && (
                      <span style={{ fontSize: 12, color: expired ? '#991b1b' : '#64748b' }}>
                        {expired ? 'Abgelaufen' : `bis ${formatDateTimeShortDE(inv.expires_at)}`}
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

      {/* Member Create/Edit Modal */}
      {modalOpen && (
        <ClubMemberModal
          member={editMember}
          onSave={handleSaveMember}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

// invitation-related features moved to `InviteMembers.tsx` in event area
