import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getClub, updateClub, deleteClub, transferOwnership, getClubMembers, getClubActivity, getClubActivityCsvUrl } from '../../api/clubApi'
import type { ActivityQuery, ActivityPage } from '../../api/clubApi'
import { useClubs } from './ClubContext'
import type { Club, ClubMember, ClubActivity } from '../../types/club'
import { ACTIVITY_LABELS, ACTIVITY_ICONS } from '../../types/club'

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

  // Activity log state
  const [activityItems, setActivityItems] = useState<ClubActivity[]>([])
  const [activityCursor, setActivityCursor] = useState<string | null>(null)
  const [activityHasMore, setActivityHasMore] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityFilter, setActivityFilter] = useState<string>('')
  const [activityFrom, setActivityFrom] = useState('')
  const [activityTo, setActivityTo] = useState('')

  const isOwner = club?.my_role === 'owner'
  const isVorstand = club?.my_role === 'owner' || club?.my_role === 'vorstand'

  const loadActivity = useCallback(async (reset = false) => {
    if (!clubId) return
    setActivityLoading(true)
    try {
      const query: ActivityQuery = { limit: 20 }
      if (activityFilter) query.action = activityFilter
      if (activityFrom) query.from = activityFrom
      if (activityTo) query.to = activityTo
      if (!reset && activityCursor) query.before = activityCursor
      const page = await getClubActivity(clubId, query, token || undefined)
      setActivityItems(prev => reset ? page.items : [...prev, ...page.items])
      setActivityCursor(page.nextCursor)
      setActivityHasMore(page.hasMore)
    } catch { /* ignore */ } finally {
      setActivityLoading(false)
    }
  }, [clubId, token, activityFilter, activityFrom, activityTo, activityCursor])

  useEffect(() => {
    if (!clubId) return
    Promise.all([
      getClub(clubId, token || undefined).then(c => { setClub(c); setName(c.name); setDescription(c.description || '') }),
      getClubMembers(clubId, token || undefined).then(setMembers)
    ]).finally(() => setLoading(false))
  }, [clubId, token])

  // Load activity when filters change
  useEffect(() => {
    if (!loading && isVorstand) {
      setActivityItems([])
      setActivityCursor(null)
      setActivityHasMore(false)
      loadActivity(true)
    }
  }, [activityFilter, activityFrom, activityTo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial activity load after club is loaded
  useEffect(() => {
    if (!loading && isVorstand && activityItems.length === 0) {
      loadActivity(true)
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Activity Log (Vorstand+) */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>📋 Aktivitätsprotokoll</h3>
          <a
            href={getClubActivityCsvUrl(clubId!, { action: activityFilter || undefined, from: activityFrom || undefined, to: activityTo || undefined })}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: '#667eea', textDecoration: 'none', fontWeight: 500, cursor: 'pointer' }}
          >
            ⬇ CSV Export
          </a>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <select
            value={activityFilter}
            onChange={e => setActivityFilter(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, color: '#374151', background: 'white' }}
          >
            <option value="">Alle Aktionen</option>
            {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input
            type="date"
            value={activityFrom}
            onChange={e => setActivityFrom(e.target.value)}
            placeholder="Von"
            title="Von Datum"
            style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, color: '#374151' }}
          />
          <input
            type="date"
            value={activityTo}
            onChange={e => setActivityTo(e.target.value)}
            placeholder="Bis"
            title="Bis Datum"
            style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, color: '#374151' }}
          />
          {(activityFilter || activityFrom || activityTo) && (
            <button
              onClick={() => { setActivityFilter(''); setActivityFrom(''); setActivityTo('') }}
              style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#64748b' }}
            >
              ✕ Filter zurücksetzen
            </button>
          )}
        </div>

        {/* Timeline */}
        {activityItems.length === 0 && !activityLoading && (
          <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Keine Aktivitäten gefunden.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {activityItems.map((item, idx) => (
            <div key={item.id} style={{
              display: 'flex', gap: 12, padding: '10px 0',
              borderBottom: idx < activityItems.length - 1 ? '1px solid #f1f5f9' : 'none'
            }}>
              <span style={{ fontSize: 18, lineHeight: '24px', flexShrink: 0 }}>
                {ACTIVITY_ICONS[item.action] || '📌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                  {ACTIVITY_LABELS[item.action] || item.action}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {item.user_name || 'System'} — {new Date(item.created_at).toLocaleString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
                {item.details && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        {activityHasMore && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              onClick={() => loadActivity(false)}
              disabled={activityLoading}
              style={{ padding: '8px 20px', background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: activityLoading ? 0.6 : 1 }}
            >
              {activityLoading ? 'Laden…' : 'Mehr laden'}
            </button>
          </div>
        )}
        {activityLoading && activityItems.length === 0 && (
          <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>Laden…</p>
        )}
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
