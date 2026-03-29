import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useClubs } from './ClubContext'
import { getClubActivity, getClubMembers, createInvite } from '../../api/clubApi'
import type { ClubActivity, ClubMember } from '../../types/club'
import { ACTIVITY_LABELS, ROLE_LABELS } from '../../types/club'

export default function ClubDashboard() {
  const { token } = useAuth()
  const { clubs, activeClub, setActiveClubId } = useClubs()
  const navigate = useNavigate()
  const [members, setMembers] = useState<ClubMember[]>([])
  const [activity, setActivity] = useState<ClubActivity[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    if (!activeClub) return
    getClubMembers(activeClub.id, token || undefined).then(setMembers).catch(() => {})
    getClubActivity(activeClub.id, { limit: 10 }, token || undefined).then(r => setActivity(r.items)).catch(() => {})
  }, [activeClub?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeClub) return null

  const isVorstand = activeClub.my_role === 'owner' || activeClub.my_role === 'vorstand'

  async function handleCreateInvite() {
    if (!activeClub) return
    setInviteLoading(true)
    try {
      const res = await createInvite(activeClub.id, { expires_in_hours: 72 }, token || undefined)
      setInviteCode(res.code)
    } catch { }
    finally { setInviteLoading(false) }
  }

  function copyInviteCode() {
    if (inviteCode) navigator.clipboard.writeText(inviteCode)
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'gerade eben'
    if (mins < 60) return `vor ${mins} Min.`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `vor ${hrs} Std.`
    const days = Math.floor(hrs / 24)
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`
  }

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 12,
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Club Selector (if multiple clubs) */}
      {clubs.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {clubs.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveClubId(c.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: c.id === activeClub.id ? '2px solid #667eea' : '2px solid #e2e8f0',
                background: c.id === activeClub.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: c.id === activeClub.id ? 'white' : '#374151',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: 12,
        padding: '16px 20px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🏆 {activeClub.name}</h3>
            {activeClub.description && <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85 }}>{activeClub.description}</p>}
          </div>
          <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 12, fontWeight: 600 }}>
            {ROLE_LABELS[activeClub.my_role]}
          </span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          {activeClub.member_count} Mitglied{activeClub.member_count !== 1 ? 'er' : ''}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {isVorstand && (
          <button
            onClick={() => navigate(`/app/club/${activeClub.id}/events`)}
            style={{
              ...cardStyle,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <span style={{ fontSize: 24 }}>✨</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Vereins-Events</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Erstellen & verwalten</span>
          </button>
        )}
        <button
          onClick={() => navigate(`/app/club/${activeClub.id}/members`)}
          style={{
            ...cardStyle,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)' }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <span style={{ fontSize: 24 }}>👥</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Mitglieder</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{activeClub.member_count} Mitglieder</span>
        </button>
        {isVorstand && (
          <button
            onClick={() => navigate(`/app/club/${activeClub.id}/settings`)}
            style={{
              ...cardStyle,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <span style={{ fontSize: 24 }}>⚙️</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Einstellungen</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Verein bearbeiten</span>
          </button>
        )}
        {!isVorstand && (
          <button
            onClick={() => navigate(`/app/club/${activeClub.id}/events`)}
            style={{
              ...cardStyle,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <span style={{ fontSize: 24 }}>📂</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Vereins-Events</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Events anschauen</span>
          </button>
        )}
      </div>

      {/* Invite Code (Vorstand+) */}
      {isVorstand && (
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>🔗 Einladung</div>
          {inviteCode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <code style={{ flex: 1, padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, fontSize: 15, fontFamily: 'monospace', letterSpacing: 2, textAlign: 'center', color: '#1e293b' }}>
                {inviteCode}
              </code>
              <button onClick={copyInviteCode} style={{ padding: '8px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                📋 Kopieren
              </button>
            </div>
          ) : (
            <button
              onClick={handleCreateInvite}
              disabled={inviteLoading}
              style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151' }}
            >
              {inviteLoading ? 'Wird erstellt…' : '+ Einladungscode erstellen'}
            </button>
          )}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Code ist 72 Stunden gültig</div>
        </div>
      )}

      {/* Members Preview */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>👥 Mitglieder</span>
          <Link to={`/app/club/${activeClub.id}/members`} style={{ fontSize: 12, color: '#667eea', textDecoration: 'none', fontWeight: 500 }}>
            Alle anzeigen →
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.slice(0, 5).map(m => (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: m.role === 'owner' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : m.role === 'vorstand' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: m.role === 'mitglied' ? '#64748b' : 'white'
              }}>
                {(m.display_name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{m.display_name}</div>
                {m.description && <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.description}</div>}
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{ROLE_LABELS[m.role]}</span>
            </div>
          ))}
          {members.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8' }}>Noch keine Mitglieder geladen.</div>}
        </div>
      </div>

      {/* Activity Feed */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>📋 Aktivität</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {activity.slice(0, 8).map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#374151' }}>
                <strong>{a.user_name || 'System'}</strong>: {ACTIVITY_LABELS[a.action] || a.action}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatTime(a.created_at)}</span>
            </div>
          ))}
          {activity.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8' }}>Noch keine Aktivitäten.</div>}
        </div>
      </div>
    </div>
  )
}
