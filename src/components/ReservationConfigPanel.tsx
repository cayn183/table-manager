import React, { useEffect, useState, useCallback } from 'react'
import api, { uploadFile } from '../api/apiClient'
import type { ReservationConfig, ReservationMenuItem, ReservationInfo, Reservation } from '../types/reservation'

type Props = {
  eventId: string
  isToGo?: boolean
  onClose: () => void
}

export default function ReservationConfigPanel({ eventId, isToGo, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'config' | 'reservations'>('config')

  // Config state
  const [isPublic, setIsPublic] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [maxCapacity, setMaxCapacity] = useState<number | ''>('')
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [phoneField, setPhoneField] = useState(false)
  const [notesField, setNotesField] = useState(false)
  const [menuItems, setMenuItems] = useState<ReservationMenuItem[]>([])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  // Reservations list
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(false)

  // ── Load existing config ──────────────────────────────────────────
  useEffect(() => {
    api.get(`/events/${eventId}/reservation-info`)
      .then((data: ReservationInfo) => {
        setIsPublic(data.isPublic)
        setShareToken(data.shareToken)
        if (data.reservationConfig) {
          const c = data.reservationConfig
          setDescription(c.description || '')
          setMaxCapacity(c.maxCapacity || '')
          setAutoConfirm(c.autoConfirm ?? true)
          setPhoneField(!!c.optionalFields?.phone)
          setNotesField(!!c.optionalFields?.notes)
          setMenuItems(c.menuItems || [])
          setLogoUrl(c.logoUrl || null)
        }
      })
      .catch(() => { /* first time — no config yet */ })
      .finally(() => setLoading(false))
  }, [eventId])

  // ── Load reservations when tab switches ───────────────────────────
  const loadReservations = useCallback(() => {
    setLoadingReservations(true)
    api.get(`/events/${eventId}/reservations`)
      .then((data: Reservation[]) => setReservations(data))
      .catch(() => {})
      .finally(() => setLoadingReservations(false))
  }, [eventId])

  useEffect(() => {
    if (tab === 'reservations') loadReservations()
  }, [tab, loadReservations])

  // ── Publish / unpublish ───────────────────────────────────────────
  async function handlePublish() {
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const config: ReservationConfig = {
        logoUrl,
        description: description.trim() || null,
        maxCapacity: maxCapacity ? Number(maxCapacity) : null,
        autoConfirm,
        optionalFields: { phone: phoneField, notes: notesField },
        menuItems,
      }
      const result = await api.post(`/events/${eventId}/publish`, { reservationConfig: config })
      setShareToken(result.shareToken)
      setIsPublic(true)
      setSuccess('Reservierungsseite ist jetzt aktiv!')
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Veröffentlichen.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnpublish() {
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await api.post(`/events/${eventId}/unpublish`)
      setIsPublic(false)
      setSuccess('Reservierungsseite deaktiviert.')
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Deaktivieren.')
    } finally {
      setSaving(false)
    }
  }

  // ── Logo upload ───────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo darf maximal 2 MB groß sein.')
      return
    }
    setLogoUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const result = await uploadFile(`/events/${eventId}/reservation-logo`, formData)
      setLogoUrl(result.logoUrl)
    } catch (e: any) {
      setError(e?.message || 'Logo-Upload fehlgeschlagen.')
    } finally {
      setLogoUploading(false)
    }
  }

  // ── Menu item management ──────────────────────────────────────────
  function addMenuItem() {
    setMenuItems([...menuItems, { id: `mi-${Date.now()}`, label: '', description: '' }])
  }

  function updateMenuItem(index: number, field: 'label' | 'description', value: string) {
    setMenuItems(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  function removeMenuItem(index: number) {
    setMenuItems(prev => prev.filter((_, i) => i !== index))
  }

  // ── Update reservation status ─────────────────────────────────────
  async function updateReservationStatus(reservationId: string, status: 'confirmed' | 'rejected') {
    try {
      await api.patch(`/events/${eventId}/reservations/${reservationId}`, { status })
      setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status } : r))
    } catch (e: any) {
      setError(e?.message || 'Status-Update fehlgeschlagen.')
    }
  }

  // ── Share link ────────────────────────────────────────────────────
  const shareUrl = shareToken ? `${window.location.origin}/e/${shareToken}` : null

  function copyShareLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
      .then(() => setSuccess('Link kopiert!'))
      .catch(() => {})
  }

  // ── Aggregated food counts ────────────────────────────────────────
  const foodAgg: Record<string, number> = {}
  reservations.filter(r => r.status !== 'cancelled' && r.status !== 'rejected').forEach(r => {
    if (r.food_selections) {
      (r.food_selections as any[]).forEach(sel => {
        const item = menuItems.find(m => m.id === sel.menuItemId)
        const label = item?.label || sel.menuItemId
        foodAgg[label] = (foodAgg[label] || 0) + (sel.quantity || 0)
      })
    }
  })

  const totalPersons = reservations
    .filter(r => r.status !== 'cancelled' && r.status !== 'rejected')
    .reduce((sum, r) => sum + r.group_size, 0)

  if (loading) {
    return (
      <div style={modalOverlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={e => e.stopPropagation()}>
          <p style={{ textAlign: 'center', color: '#64748b' }}>Lade…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            🎟️ Reservierungsseite
          </h3>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
          <button
            onClick={() => setTab('config')}
            style={{ ...tabStyle, ...(tab === 'config' ? tabActiveStyle : {}) }}
          >
            ⚙️ Einstellungen
          </button>
          <button
            onClick={() => setTab('reservations')}
            style={{ ...tabStyle, ...(tab === 'reservations' ? tabActiveStyle : {}) }}
          >
            📋 Reservierungen {reservations.length > 0 ? `(${reservations.length})` : ''}
          </button>
        </div>

        {/* ── Messages ─────────────────────────────────────────── */}
        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        {tab === 'config' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
            {/* ── Share link (if active) ──────────────────────── */}
            {isPublic && shareUrl && (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 6 }}>🔗 Öffentlicher Link</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    readOnly
                    value={shareUrl}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1.5px solid #d1d5db', fontSize: 12, fontFamily: 'monospace', color: '#334155', background: '#fff' }}
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button onClick={copyShareLink} style={smallBtnStyle}>📋 Kopieren</button>
                </div>
              </div>
            )}

            {/* ── Logo upload ─────────────────────────────────── */}
            <div>
              <label style={labelStyle}>Vereins-Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {logoUrl && (
                  <img
                    src={logoUrl.startsWith('http') ? logoUrl : `${window.location.origin}${logoUrl}`}
                    alt="Logo"
                    style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                )}
                <label style={{ ...smallBtnStyle, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {logoUploading ? '⏳ Lädt…' : '📁 Logo hochladen'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                    disabled={logoUploading}
                  />
                </label>
                {logoUrl && (
                  <button onClick={() => setLogoUrl(null)} style={{ ...smallBtnStyle, color: '#ef4444' }}>✕</button>
                )}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>PNG oder JPEG, max. 2 MB</p>
            </div>

            {/* ── Description ─────────────────────────────────── */}
            <div>
              <label style={labelStyle}>Beschreibung / Begrüßungstext</label>
              <textarea
                maxLength={1000}
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="Willkommen bei unserem Vereinsfest! Bitte reserviert euch rechtzeitig einen Platz…"
              />
              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>{description.length}/1000</div>
            </div>

            {/* ── Max capacity ────────────────────────────────── */}
            <div>
              <label style={labelStyle}>Maximale Kapazität (Personen)</label>
              <input
                type="number"
                min={1}
                max={99999}
                value={maxCapacity}
                onChange={e => setMaxCapacity(e.target.value ? parseInt(e.target.value) : '')}
                style={inputStyle}
                placeholder="Unbegrenzt"
              />
            </div>

            {/* ── Auto-confirm toggle ─────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 14px', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  {autoConfirm ? '✅ Automatische Bestätigung' : '👀 Manuelle Genehmigung'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {autoConfirm ? 'Reservierungen werden sofort bestätigt' : 'Du prüfst jede Anfrage manuell'}
                </div>
              </div>
              <ToggleSwitch checked={autoConfirm} onChange={setAutoConfirm} />
            </div>

            {/* ── Optional fields ─────────────────────────────── */}
            <div>
              <label style={labelStyle}>Optionale Felder</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={checkboxLabelStyle}>
                  <input type="checkbox" checked={phoneField} onChange={e => setPhoneField(e.target.checked)} />
                  Telefonnummer
                </label>
                <label style={checkboxLabelStyle}>
                  <input type="checkbox" checked={notesField} onChange={e => setNotesField(e.target.checked)} />
                  Bemerkungsfeld
                </label>
              </div>
            </div>

            {/* ── Menu items (ToGo) ───────────────────────────── */}
            {isToGo && (
              <div>
                <label style={labelStyle}>Speisekarte (für ToGo-Events)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {menuItems.map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          type="text"
                          maxLength={200}
                          placeholder="Gerichtname"
                          value={item.label}
                          onChange={e => updateMenuItem(i, 'label', e.target.value)}
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          maxLength={500}
                          placeholder="Beschreibung (optional)"
                          value={item.description || ''}
                          onChange={e => updateMenuItem(i, 'description', e.target.value)}
                          style={{ ...inputStyle, fontSize: 12 }}
                        />
                      </div>
                      <button onClick={() => removeMenuItem(i)} style={{ ...smallBtnStyle, color: '#ef4444', padding: '6px 8px' }}>✕</button>
                    </div>
                  ))}
                  <button onClick={addMenuItem} style={{ ...smallBtnStyle, alignSelf: 'flex-start' }}>+ Gericht hinzufügen</button>
                </div>
              </div>
            )}

            {/* ── Actions ─────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {!isPublic ? (
                <button onClick={handlePublish} disabled={saving} style={primaryBtnStyle}>
                  {saving ? '⏳ Wird aktiviert…' : '🚀 Seite aktivieren'}
                </button>
              ) : (
                <>
                  <button onClick={handlePublish} disabled={saving} style={primaryBtnStyle}>
                    {saving ? '⏳ Speichern…' : '💾 Einstellungen speichern'}
                  </button>
                  <button onClick={handleUnpublish} disabled={saving} style={dangerBtnStyle}>
                    Deaktivieren
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ── Reservations tab ──────────────────────────────────── */
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={statBadgeStyle}>
                👥 {totalPersons} Personen
              </div>
              <div style={statBadgeStyle}>
                📋 {reservations.filter(r => r.status === 'confirmed').length} bestätigt
              </div>
              <div style={statBadgeStyle}>
                ⏳ {reservations.filter(r => r.status === 'pending').length} ausstehend
              </div>
            </div>

            {/* Food aggregation */}
            {Object.keys(foodAgg).length > 0 && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>🍽️ Bestellübersicht</div>
                {Object.entries(foodAgg).map(([label, count]) => (
                  <div key={label} style={{ fontSize: 13, color: '#78350f', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>{label}</span>
                    <strong>× {count}</strong>
                  </div>
                ))}
              </div>
            )}

            {loadingReservations ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Lade Reservierungen…</p>
            ) : reservations.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>Noch keine Reservierungen.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reservations.map(r => (
                  <div key={r.id} style={reservationCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{r.email}{r.phone ? ` • ${r.phone}` : ''}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          👥 {r.group_size} Personen • {new Date(r.created_at).toLocaleDateString('de-DE')}
                        </div>
                        {r.notes && <div style={{ fontSize: 12, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>📝 {r.notes}</div>}
                      </div>
                      <span style={{
                        ...statusBadgeBase,
                        ...(r.status === 'confirmed' ? { background: '#dcfce7', color: '#166534' } :
                            r.status === 'pending' ? { background: '#fef9c3', color: '#854d0e' } :
                            r.status === 'rejected' ? { background: '#fee2e2', color: '#991b1b' } :
                            { background: '#f1f5f9', color: '#475569' }),
                      }}>
                        {r.status === 'confirmed' ? '✅' : r.status === 'pending' ? '⏳' : r.status === 'rejected' ? '❌' : '🚫'} {statusLabel(r.status)}
                      </span>
                    </div>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => updateReservationStatus(r.id, 'confirmed')} style={{ ...smallBtnStyle, background: '#dcfce7', color: '#166534' }}>
                          ✅ Bestätigen
                        </button>
                        <button onClick={() => updateReservationStatus(r.id, 'rejected')} style={{ ...smallBtnStyle, background: '#fee2e2', color: '#991b1b' }}>
                          ❌ Ablehnen
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Toggle Switch ────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        border: 'none',
        background: checked ? '#667eea' : '#cbd5e1',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        background: '#fff',
        position: 'absolute',
        top: 3,
        left: checked ? 25 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function statusLabel(s: string): string {
  switch (s) {
    case 'confirmed': return 'Bestätigt'
    case 'pending': return 'Ausstehend'
    case 'rejected': return 'Abgelehnt'
    case 'cancelled': return 'Storniert'
    default: return s
  }
}

// ── Styles ────────────────────────────────────────────────────────────
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.6)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 2000,
}
const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: '28px 24px', width: 'min(640px, 95vw)',
  maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
}
const closeBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b', padding: 4,
}
const tabStyle: React.CSSProperties = {
  flex: 1, padding: '8px 12px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', background: 'transparent', color: '#64748b', transition: 'all 0.15s',
}
const tabActiveStyle: React.CSSProperties = {
  background: '#fff', color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s',
}
const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: '#334155',
}
const smallBtnStyle: React.CSSProperties = {
  padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: 6, background: '#fff',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569', transition: 'all 0.15s',
}
const primaryBtnStyle: React.CSSProperties = {
  flex: 1, padding: '12px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(102,126,234,0.3)', transition: 'all 0.2s',
}
const dangerBtnStyle: React.CSSProperties = {
  padding: '12px 20px', background: '#fff', color: '#ef4444', border: '1.5px solid #fca5a5',
  borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
}
const errorStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13,
  fontWeight: 500, marginBottom: 12,
}
const successStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 8, background: '#dcfce7', color: '#166534', fontSize: 13,
  fontWeight: 500, marginBottom: 12,
}
const statBadgeStyle: React.CSSProperties = {
  padding: '6px 12px', background: '#f1f5f9', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#475569',
}
const reservationCardStyle: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 10, border: '1.5px solid #f1f5f9', background: '#fafbfc',
}
const statusBadgeBase: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
}
