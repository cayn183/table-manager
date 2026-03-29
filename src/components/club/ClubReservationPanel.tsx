import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useDeviceType } from '../../utils/useDeviceType'
import {
  publishClubEvent,
  unpublishClubEvent,
  getClubEventReservationInfo,
  getClubEventReservations,
  updateClubReservationStatus,
} from '../../api/clubApi'
import type { ReservationConfig, ReservationMenuItem, Reservation } from '../../types/reservation'
import type { MenuItem } from '../../types/togo'
import { formatDateShort } from '../../utils/dateFormatting'

interface Props {
  clubId: string
  eventId: string
  token?: string
  isVorstand: boolean
  hasFoodModule: boolean
  hasSeatingModule: boolean
  eventTitle: string
  eventTimeFrom?: string
  eventTimeTo?: string
  /** Menu items from the Speiseplanung module */
  menuItemsFromFood?: MenuItem[]
  /** IDs of reservations already synced to food/seating modules */
  syncedReservationIds?: string[]
  /** Called when reservations should be synced into food/seating modules */
  onSync?: (reservations: Reservation[], newSyncedIds: string[]) => Promise<void>
}

export default function ClubReservationPanel({
  clubId,
  eventId,
  token,
  isVorstand,
  hasFoodModule,
  hasSeatingModule,
  eventTitle,
  menuItemsFromFood = [],
  syncedReservationIds = [],
  onSync,
}: Props) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'config' | 'reservations'>('config')

  const [isPublic, setIsPublic] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [maxCapacity, setMaxCapacity] = useState<number | ''>('')
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [phoneField, setPhoneField] = useState(false)
  const [notesField, setNotesField] = useState(false)
  const [ownMenuItems, setOwnMenuItems] = useState<ReservationMenuItem[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(false)

  const autoSyncDone = useRef(false)

  const effectiveMenuItems: ReservationMenuItem[] = hasFoodModule
    ? menuItemsFromFood.filter(m => m.available).map(m => ({ id: m.id, label: m.name, description: m.description }))
    : ownMenuItems

  useEffect(() => {
    setLoading(true)
    getClubEventReservationInfo(clubId, eventId, token)
      .then(data => {
        setIsPublic(data.isPublic)
        setShareToken(data.shareToken)
        if (data.reservationConfig) {
          const c = data.reservationConfig
          setDescription(c.description || '')
          setMaxCapacity(c.maxCapacity || '')
          setAutoConfirm(c.autoConfirm ?? true)
          setPhoneField(!!c.optionalFields?.phone)
          setNotesField(!!c.optionalFields?.notes)
          if (!hasFoodModule) setOwnMenuItems(c.menuItems || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clubId, eventId, token])

  const loadReservations = useCallback(() => {
    setLoadingReservations(true)
    return getClubEventReservations(clubId, eventId, token)
      .then(data => { setReservations(data); return data })
      .catch(() => [] as Reservation[])
      .finally(() => setLoadingReservations(false))
  }, [clubId, eventId, token])

  useEffect(() => {
    if (tab !== 'reservations') return
    loadReservations().then(loaded => {
      if (autoSyncDone.current || !onSync || !loaded.length) return
      const unsynced = loaded.filter(r => r.status === 'confirmed' && !syncedReservationIds.includes(r.id))
      if (!unsynced.length) { autoSyncDone.current = true; return }
      autoSyncDone.current = true
      const newIds = [...syncedReservationIds, ...unsynced.map(r => r.id)]
      setSyncing(true)
      onSync(unsynced, newIds)
        .then(() => setSuccess(`${unsynced.length} Reservierung${unsynced.length > 1 ? 'en' : ''} synchronisiert.`))
        .catch(() => {})
        .finally(() => setSyncing(false))
    })
  }, [tab])

  async function handlePublish() {
    setError(null); setSuccess(null); setSaving(true)
    try {
      const config: ReservationConfig = {
        description: description.trim() || null,
        maxCapacity: maxCapacity ? Number(maxCapacity) : null,
        autoConfirm,
        optionalFields: { phone: phoneField, notes: notesField },
        menuItems: effectiveMenuItems,
      }
      const result = await publishClubEvent(clubId, eventId, config, token)
      setShareToken(result.shareToken)
      setIsPublic(true)
      setSuccess('Reservierungsseite ist jetzt aktiv!')
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Ver�ffentlichen.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnpublish() {
    setError(null); setSuccess(null); setSaving(true)
    try {
      await unpublishClubEvent(clubId, eventId, token)
      setIsPublic(false)
      setSuccess('Reservierungsseite deaktiviert.')
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Deaktivieren.')
    } finally {
      setSaving(false)
    }
  }

  function addOwnMenuItem() {
    setOwnMenuItems(prev => [...prev, { id: `mi-${Date.now()}`, label: '', description: '' }])
  }
  function updateOwnMenuItem(idx: number, field: 'label' | 'description', val: string) {
    setOwnMenuItems(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m))
  }
  function removeOwnMenuItem(idx: number) {
    setOwnMenuItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleUpdateStatus(reservationId: string, status: 'confirmed' | 'rejected') {
    try {
      await updateClubReservationStatus(clubId, eventId, reservationId, status, token)
      const updated = reservations.map(r => r.id === reservationId ? { ...r, status } : r)
      setReservations(updated)
      if (status === 'confirmed' && onSync && !syncedReservationIds.includes(reservationId)) {
        const confirmed = updated.find(r => r.id === reservationId)
        if (confirmed) {
          const newIds = [...syncedReservationIds, reservationId]
          setSyncing(true)
          onSync([confirmed], newIds)
            .then(() => setSuccess('Best�tigt und synchronisiert.'))
            .catch(() => setSuccess('Best�tigt. (Sync fehlgeschlagen)'))
            .finally(() => setSyncing(false))
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Status-Update fehlgeschlagen.')
    }
  }

  const shareUrl = shareToken ? `${window.location.origin}/e/${shareToken}` : null
  function copyShareLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => setSuccess('Link kopiert!')).catch(() => {})
  }

  const activeReservations = reservations.filter(r => r.status !== 'cancelled' && r.status !== 'rejected')
  const foodAgg: Record<string, number> = {}
  activeReservations.forEach(r => {
    if (r.food_selections) {
      ;(r.food_selections as any[]).forEach(sel => {
        const item = effectiveMenuItems.find(m => m.id === sel.menuItemId)
        const label = item?.label || sel.menuItemId
        foodAgg[label] = (foodAgg[label] || 0) + (sel.quantity || 0)
      })
    }
  })

  const totalPersons = activeReservations.reduce((s, r) => s + r.group_size, 0)
  const unsyncedCount = reservations.filter(r => r.status === 'confirmed' && !syncedReservationIds.includes(r.id)).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', fontSize: 14 }}>
        Lade
      </div>
    )
  }

  if (!isVorstand) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}></div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Reservierungsseite</h3>
          {isPublic && shareUrl ? (
            <>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>
                Die Reservierungsseite f�r {eventTitle}" ist aktiv.
              </p>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
              > Anmeldeseite �ffnen</a>
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              Die Reservierungsseite ist noch nicht aktiviert.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: isMobile ? '12px 14px' : '16px 24px' }}>

      {(hasFoodModule || hasSeatingModule) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {hasFoodModule && <span style={moduleBadgeStyle('#f0fdf4', '#166534')}> Speiseplanung verkn�pft</span>}
          {hasSeatingModule && <span style={moduleBadgeStyle('#eff6ff', '#1e40af')}> G�steplanung verkn�pft</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f1f5f9', borderRadius: 8, padding: 3, flexShrink: 0 }}>
        <button onClick={() => setTab('config')} style={{ ...innerTabStyle, ...(tab === 'config' ? innerTabActiveStyle : {}) }}>
          {isMobile ? '⚙️ Einstellungen' : '⚙️ Einstellungen'}
        </button>
        <button onClick={() => setTab('reservations')} style={{ ...innerTabStyle, ...(tab === 'reservations' ? innerTabActiveStyle : {}) }}>
          {isMobile ? `📋 (${reservations.length})` : `📋 Anmeldungen ${reservations.length > 0 ? `(${reservations.length})` : ''}`}
          {unsyncedCount > 0 && <span style={{ marginLeft: 4, background: '#f59e0b', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{unsyncedCount} neu</span>}
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}
      {success && <div style={successStyle}>{success}</div>}
      {syncing && <div style={{ ...successStyle, background: '#eff6ff', color: '#1e40af' }}> Synchronisiere</div>}

      {tab === 'config' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, paddingBottom: 16 }}>

          {isPublic && shareUrl && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 6 }}> �ffentlicher Link</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input readOnly value={shareUrl}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1.5px solid #d1d5db', fontSize: 12, fontFamily: 'monospace', color: '#334155', background: '#fff' }}
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button onClick={copyShareLink} style={smallBtnStyle}> Kopieren</button>
              </div>
            </div>
          )}

          {!isPublic && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#9a3412' }}>
               Die Reservierungsseite ist noch nicht aktiv. Konfiguriere sie und aktiviere sie unten.
            </div>
          )}

          <div>
            <label style={labelStyle}>Beschreibung / Begr��ungstext</label>
            <textarea maxLength={1000} value={description} onChange={e => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="Willkommen bei unserem Vereinsfest! Bitte meldet euch rechtzeitig an"
            />
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>{description.length}/1000</div>
          </div>

          <div>
            <label style={labelStyle}>Maximale Kapazit�t (Personen)</label>
            <input type="number" min={1} max={99999} value={maxCapacity}
              onChange={e => setMaxCapacity(e.target.value ? parseInt(e.target.value) : '')}
              style={inputStyle} placeholder="Unbegrenzt"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 14px', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                {autoConfirm ? ' Automatische Best�tigung' : ' Manuelle Genehmigung'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {autoConfirm
                  ? 'Anmeldungen werden sofort best�tigt und synchronisiert'
                  : 'Du pr�fst jede Anfrage manuell  Sync erfolgt beim Best�tigen'}
              </div>
            </div>
            <ToggleSwitch checked={autoConfirm} onChange={setAutoConfirm} />
          </div>

          <div>
            <label style={labelStyle}>Optionale Felder</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={checkboxLabelStyle}><input type="checkbox" checked={phoneField} onChange={e => setPhoneField(e.target.checked)} /> Telefonnummer</label>
              <label style={checkboxLabelStyle}><input type="checkbox" checked={notesField} onChange={e => setNotesField(e.target.checked)} /> Bemerkungsfeld</label>
            </div>
          </div>

          {hasFoodModule ? (
            <div>
              <label style={labelStyle}>Speisekarte</label>
              {effectiveMenuItems.length === 0 ? (
                <div style={{ padding: '12px 14px', background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                   Noch keine Gerichte in der Speiseplanung vorhanden.<br />
                  <span style={{ fontSize: 12, color: '#78350f' }}>F�ge zuerst Gerichte in Speiseplanung" hinzu  sie erscheinen dann automatisch auf der Anmeldeseite.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {effectiveMenuItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', flex: 1 }}>{item.label}</span>
                      {item.description && <span style={{ fontSize: 12, color: '#64748b' }}>{item.description}</span>}
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}></span>
                    </div>
                  ))}
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Bearbeite Gerichte in der Speiseplanung  �nderungen wirken sich direkt auf die Anmeldeseite aus.</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Speisekarte (optional)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ownMenuItems.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input type="text" maxLength={200} placeholder="Gerichtname" value={item.label}
                        onChange={e => updateOwnMenuItem(i, 'label', e.target.value)} style={inputStyle} />
                      <input type="text" maxLength={500} placeholder="Beschreibung (optional)" value={item.description || ''}
                        onChange={e => updateOwnMenuItem(i, 'description', e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
                    </div>
                    <button onClick={() => removeOwnMenuItem(i)} style={{ ...smallBtnStyle, color: '#ef4444', padding: '6px 8px' }}></button>
                  </div>
                ))}
                <button onClick={addOwnMenuItem} style={{ ...smallBtnStyle, alignSelf: 'flex-start' }}>+ Gericht hinzuf�gen</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            {!isPublic ? (
              <button onClick={handlePublish} disabled={saving} style={primaryBtnStyle}>
                {saving ? ' Wird aktiviert' : ' Seite aktivieren & ver�ffentlichen'}
              </button>
            ) : (
              <>
                <button onClick={handlePublish} disabled={saving} style={primaryBtnStyle}>
                  {saving ? ' Speichern' : ' Einstellungen speichern'}
                </button>
                <button onClick={handleUnpublish} disabled={saving} style={dangerBtnStyle}>Deaktivieren</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>

          {(hasFoodModule || hasSeatingModule) && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af' }}>
              {hasFoodModule && hasSeatingModule
                ? ' Best�tigte Anmeldungen werden automatisch mit Speiseplanung & G�steplanung synchronisiert.'
                : hasFoodModule
                  ? ' Best�tigte Anmeldungen mit Speisen werden in die Speiseplanung �bertragen.'
                  : ' Best�tigte Anmeldungen werden in die G�steplanung �bertragen.'}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={statBadgeStyle}> {totalPersons} Personen</div>
            <div style={statBadgeStyle}> {reservations.filter(r => r.status === 'confirmed').length} best�tigt</div>
            <div style={statBadgeStyle}> {reservations.filter(r => r.status === 'pending').length} ausstehend</div>
            {unsyncedCount > 0 && <div style={{ ...statBadgeStyle, background: '#fef3c7', color: '#92400e' }}> {unsyncedCount} unsynced</div>}
          </div>

          {Object.keys(foodAgg).length > 0 && (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 6 }}> Bestell�bersicht</div>
              {Object.entries(foodAgg).map(([label, count]) => (
                <div key={label} style={{ fontSize: 13, color: '#78350f', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>{label}</span><strong> {count}</strong>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => { autoSyncDone.current = false; loadReservations() }} style={{ ...smallBtnStyle, marginBottom: 12 }}>
             Aktualisieren
          </button>

          {loadingReservations ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Lade</p>
          ) : reservations.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
              {isPublic ? 'Noch keine Anmeldungen.' : 'Reservierungsseite ist noch nicht aktiv.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reservations.map(r => {
                const isSynced = syncedReservationIds.includes(r.id)
                const hasFoodSel = r.food_selections && (r.food_selections as any[]).some((f: any) => f.quantity > 0)
                return (
                  <div key={r.id} style={{ ...reservationCardStyle, borderColor: r.status === 'confirmed' ? '#bbf7d0' : '#f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{r.email}{r.phone ? `  ${r.phone}` : ''}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                           {r.group_size} {r.group_size === 1 ? 'Person' : 'Personen'}  {formatDateShort(r.created_at)}
                        </div>
                        {r.notes && <div style={{ fontSize: 12, color: '#475569', marginTop: 4, fontStyle: 'italic' }}> {r.notes}</div>}
                        {hasFoodSel && (
                          <div style={{ fontSize: 11, color: '#78350f', marginTop: 4 }}>
                             {(r.food_selections as any[])
                              .filter((f: any) => f.quantity > 0)
                              .map((f: any) => {
                                const item = effectiveMenuItems.find(m => m.id === f.menuItemId)
                                return `${item?.label || f.menuItemId} ${f.quantity}`
                              }).join(', ')}
                          </div>
                        )}
                        {r.status === 'confirmed' && (hasFoodModule || hasSeatingModule) && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {isSynced ? (
                              <>
                                {hasFoodModule && hasFoodSel && <span style={syncBadge('#dcfce7', '#166534')}> Speiseplanung</span>}
                                {hasSeatingModule && <span style={syncBadge('#dbeafe', '#1e40af')}>{hasFoodSel ? ' G�steplanung (Tisch)' : ' G�steplanung (ToGo)'}</span>}
                              </>
                            ) : (
                              <span style={syncBadge('#fef3c7', '#92400e')}> Sync ausstehend</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{
                          ...statusBadgeBase,
                          ...(r.status === 'confirmed' ? { background: '#dcfce7', color: '#166534' } :
                              r.status === 'pending'   ? { background: '#fef9c3', color: '#854d0e' } :
                              r.status === 'rejected'  ? { background: '#fee2e2', color: '#991b1b' } :
                                                         { background: '#f1f5f9', color: '#475569' }),
                        }}>
                          {r.status === 'confirmed' ? '' : r.status === 'pending' ? '' : r.status === 'rejected' ? '' : ''} {statusLabel(r.status)}
                        </span>
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => handleUpdateStatus(r.id, 'confirmed')}
                          style={{ ...smallBtnStyle, background: '#dcfce7', color: '#166534', border: '1.5px solid #bbf7d0' }}>
                           Best�tigen
                        </button>
                        <button onClick={() => handleUpdateStatus(r.id, 'rejected')}
                          style={{ ...smallBtnStyle, background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fca5a5' }}>
                           Ablehnen
                        </button>
                      </div>
                    )}
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

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ width: 48, height: 26, borderRadius: 13, border: 'none', background: checked ? '#667eea' : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 3, left: checked ? 25 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

function statusLabel(s: string): string {
  switch (s) {
    case 'confirmed': return 'Best�tigt'
    case 'pending':   return 'Ausstehend'
    case 'rejected':  return 'Abgelehnt'
    case 'cancelled': return 'Storniert'
    default:          return s
  }
}

function moduleBadgeStyle(bg: string, color: string): React.CSSProperties {
  return { padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: bg, color }
}
function syncBadge(bg: string, color: string): React.CSSProperties {
  return { display: 'inline-block', padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: bg, color }
}
const innerTabStyle: React.CSSProperties = { flex: 1, padding: '8px 12px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#64748b' }
const innerTabActiveStyle: React.CSSProperties = { background: '#fff', color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const checkboxLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: '#334155' }
const smallBtnStyle: React.CSSProperties = { padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: 6, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }
const primaryBtnStyle: React.CSSProperties = { flex: 1, padding: '12px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const dangerBtnStyle: React.CSSProperties = { padding: '12px 20px', background: '#fff', color: '#ef4444', border: '1.5px solid #fca5a5', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const errorStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 500, marginBottom: 12 }
const successStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, background: '#dcfce7', color: '#166534', fontSize: 13, fontWeight: 500, marginBottom: 12 }
const statBadgeStyle: React.CSSProperties = { padding: '6px 12px', background: '#f1f5f9', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#475569' }
const reservationCardStyle: React.CSSProperties = { padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
const statusBadgeBase: React.CSSProperties = { padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }