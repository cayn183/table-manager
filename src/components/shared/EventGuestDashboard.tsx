import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import useModuleStateRef from '../../hooks/useModuleStateRef'
import { useDeviceType } from '../../utils/useDeviceType'
import type { EventDashboardConfig, EventMenuData, EventTimelineData, EventSeatingData, EventRoomData } from '../../types/event'

interface Props {
  config: EventDashboardConfig
  eventName: string
  eventDate?: string
  eventFrom?: string
  eventTo?: string
  menuData?: EventMenuData | null
  timelineData?: EventTimelineData | null
  seatingData?: EventSeatingData | null
  roomData?: EventRoomData | null
  onSave: (config: EventDashboardConfig) => Promise<void>
}

const EventGuestDashboard = forwardRef(function EventGuestDashboard({ config, eventName, eventDate, eventFrom, eventTo, menuData, timelineData, seatingData, roomData, onSave }: Props, ref) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const [cfg, setCfg] = useState<EventDashboardConfig>(config)
  const [preview, setPreview] = useState(false)
  const { setRef: setCfgRef, updateRef: updateCfgRef, getCurrentData: getCfgCurrent } = useModuleStateRef(config)

  useImperativeHandle(ref, () => ({ getCurrentData: () => getCfgCurrent() }), [getCfgCurrent])

  useEffect(() => { setCfg(config); setCfgRef(config) }, [config, setCfgRef])

  async function persist(updated: EventDashboardConfig) {
    setCfgRef(updated)
    setCfg(updated)
    await onSave(updated)
  }

  function update(partial: Partial<EventDashboardConfig>) {
    const next = { ...cfg, ...partial }
    setCfg(next)
    updateCfgRef(prev => ({ ...prev, ...partial }))
    persist(next)
  }

  const dateLabel = eventDate
    ? new Date(eventDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : null
  const timeLabel = eventFrom && eventTo ? `${eventFrom} – ${eventTo} Uhr` : eventFrom ? `ab ${eventFrom} Uhr` : null

  const hasTimeline = (timelineData?.entries?.length ?? 0) > 0
  const hasMenu = (menuData?.courses?.length ?? 0) > 0
  const hasSeating = (seatingData?.groups?.length ?? 0) > 0

  const countdown = useMemo(() => {
    if (!eventDate || !cfg.showCountdown) return null
    const eventMs = new Date(eventDate + 'T00:00:00').getTime()
    const nowMs = Date.now()
    const diffMs = eventMs - nowMs
    if (diffMs <= 0) return null
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return days
  }, [eventDate, cfg.showCountdown])

  // Progress tracking
  const progressItems = [
    { label: 'Begrüßung', filled: !!(cfg.welcomeMessage) },
    { label: 'Location', filled: !!(cfg.locationName || cfg.locationAddress) },
    { label: 'Dresscode', filled: !!(cfg.dressCode) },
    { label: 'Kontakt', filled: !!(cfg.contactPhone || cfg.contactEmail) },
    { label: 'Geschenke', filled: !!(cfg.giftRegistryUrl) },
    { label: 'Infos', filled: !!(cfg.additionalInfo) },
  ]
  const filledCount = progressItems.filter(i => i.filled).length

  const mapsUrl = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }
  const sectionStyle: React.CSSProperties = { background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 }
  const sectionHeaderStyle = (icon: string, title: string, filled?: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b', flex: 1 }}>{title}</h4>
      {filled !== undefined && (
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: filled ? '#22c55e' : '#cbd5e1' }} />
      )}
    </div>
  )
  const previewCardStyle: React.CSSProperties = { background: 'white', borderRadius: 16, padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 14 }

  // ── Preview mode ──
  if (preview) {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => setPreview(false)}
          style={{ marginBottom: 16, padding: '8px 18px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >← Zurück zur Konfiguration</button>

        {/* Hero header */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 20, padding: '36px 28px 32px', color: 'white', textAlign: 'center', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Du bist eingeladen zu</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{eventName}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 14, opacity: 0.9, flexWrap: 'wrap' }}>
            {dateLabel && <span>📅 {dateLabel}</span>}
            {timeLabel && <span>🕐 {timeLabel}</span>}
          </div>
          {countdown != null && countdown > 0 && (
            <div style={{ marginTop: 16, padding: '10px 20px', background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'inline-flex', alignItems: 'baseline', gap: 6, backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: 28, fontWeight: 800 }}>{countdown}</span>
              <span style={{ fontSize: 14, opacity: 0.9 }}>{countdown === 1 ? 'Tag' : 'Tage'} noch</span>
            </div>
          )}
        </div>

        {cfg.welcomeMessage && (
          <div style={{ ...previewCardStyle, textAlign: 'center', background: 'linear-gradient(135deg, rgba(102,126,234,0.04), rgba(118,75,162,0.04))' }}>
            <p style={{ margin: 0, fontSize: 15, color: '#475569', fontStyle: 'italic', lineHeight: 1.7 }}>„{cfg.welcomeMessage}"</p>
          </div>
        )}

        {cfg.showLocation && (cfg.locationName || cfg.locationAddress) && (
          <div style={previewCardStyle}>
            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>📍 Location</h4>
            {cfg.locationName && <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{cfg.locationName}</div>}
            {cfg.locationAddress && (
              <a href={mapsUrl(cfg.locationAddress)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#667eea', marginTop: 4, textDecoration: 'none', fontWeight: 500 }}>
                📌 {cfg.locationAddress}
                <span style={{ fontSize: 11, opacity: 0.7 }}>↗</span>
              </a>
            )}
          </div>
        )}

        {cfg.showTimeline && hasTimeline && (
          <div style={previewCardStyle}>
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>⏱️ Ablaufplan</h4>
            <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {timelineData!.entries.sort((a, b) => a.time.localeCompare(b.time)).map(e => (
                <div key={e.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#667eea', border: '2px solid white' }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#667eea' }}>{e.time}{e.endTime ? ` – ${e.endTime}` : ''}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 1 }}>{e.title}</div>
                  {e.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{e.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {cfg.showMenu && hasMenu && (
          <div style={previewCardStyle}>
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>🍽️ Menü</h4>
            {menuData!.title && <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', textAlign: 'center', marginBottom: 14 }}>{menuData!.title}</div>}
            {menuData!.courses.sort((a, b) => a.sortOrder - b.sortOrder).map(course => (
              <div key={course.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#667eea', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>{course.name}</div>
                {course.choices.map(ch => (
                  <div key={ch.id} style={{ marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid #f1f5f9' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{ch.name}</div>
                    {ch.description && <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>{ch.description}</div>}
                    {ch.tags && ch.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        {ch.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', fontWeight: 500 }}>{t}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {menuData!.notes && <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', borderTop: '1px solid #f1f5f9', paddingTop: 10, marginTop: 4 }}>{menuData!.notes}</div>}
          </div>
        )}

        {cfg.showSeating && hasSeating && (
          <div style={previewCardStyle}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>🪑 Dein Tisch</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Deine Tischzuweisung wird hier angezeigt, sobald der Gastgeber sie eingerichtet hat.</p>
          </div>
        )}

        {/* Combined details card for dresscode, contact, gifts */}
        {(cfg.dressCode || cfg.contactPhone || cfg.contactEmail || cfg.giftRegistryUrl) && (
          <div style={previewCardStyle}>
            {cfg.dressCode && (
              <div style={{ marginBottom: (cfg.contactPhone || cfg.contactEmail || cfg.giftRegistryUrl) ? 14 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>👔 Dresscode</div>
                <div style={{ fontSize: 14, color: '#475569' }}>{cfg.dressCode}</div>
              </div>
            )}
            {(cfg.contactPhone || cfg.contactEmail) && (
              <div style={{ marginBottom: cfg.giftRegistryUrl ? 14 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>📞 Kontakt</div>
                {cfg.contactPhone && <div style={{ fontSize: 13, color: '#475569', marginBottom: 2 }}>📱 {cfg.contactPhone}</div>}
                {cfg.contactEmail && <div style={{ fontSize: 13, color: '#475569' }}>✉️ {cfg.contactEmail}</div>}
              </div>
            )}
            {cfg.giftRegistryUrl && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>🎁 Geschenkwünsche</div>
                <a href={cfg.giftRegistryUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#667eea', fontWeight: 600, textDecoration: 'none' }}>
                  Zur Geschenkeliste →
                </a>
              </div>
            )}
          </div>
        )}

        {cfg.additionalInfo && (
          <div style={previewCardStyle}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>ℹ️ Weitere Informationen</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{cfg.additionalInfo}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Config mode ──
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>📱 Gäste-Info Dashboard</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Infos für deine Gäste zusammenstellen</p>
        </div>
        <button onClick={() => setPreview(true)}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >👁️ Vorschau</button>
      </div>

      {/* Progress indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {progressItems.map((item, i) => (
            <div key={i} title={item.label}
              style={{ width: 8, height: 8, borderRadius: '50%', background: item.filled ? '#22c55e' : '#e2e8f0', transition: 'background 0.3s' }} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#64748b' }}>{filledCount} von {progressItems.length} ausgefüllt</span>
      </div>

      {/* ── Section 1: Begrüßung & Event ── */}
      <div style={sectionStyle}>
        {sectionHeaderStyle('🎉', 'Begrüßung & Event', !!(cfg.welcomeMessage || cfg.locationName || cfg.locationAddress))}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Willkommensnachricht</label>
          <textarea value={cfg.welcomeMessage ?? ''} onChange={e => update({ welcomeMessage: e.target.value })}
            placeholder="z.B. Wir freuen uns, euch bei unserem besonderen Tag dabei zu haben!"
            rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📍 Location</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#475569' }}>
              <input type="checkbox" checked={cfg.showLocation} onChange={e => update({ showLocation: e.target.checked })} style={{ width: 16, height: 16 }} />
              Anzeigen
            </label>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Name</label>
              <input type="text" value={cfg.locationName ?? ''} onChange={e => update({ locationName: e.target.value })}
                placeholder="z.B. Schloss Bellevue" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Adresse</label>
              <input type="text" value={cfg.locationAddress ?? ''} onChange={e => update({ locationAddress: e.target.value })}
                placeholder="z.B. Musterstraße 1, 12345 Musterstadt" style={inputStyle} />
            </div>
          </div>
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
          background: cfg.showCountdown ? '#f0f9ff' : '#f8fafc', border: cfg.showCountdown ? '1px solid #bae6fd' : '1px solid #e2e8f0',
          cursor: eventDate ? 'pointer' : 'not-allowed', opacity: eventDate ? 1 : 0.6,
        }}>
          <input type="checkbox" checked={cfg.showCountdown ?? false} disabled={!eventDate}
            onChange={e => update({ showCountdown: e.target.checked })}
            style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: 16 }}>⏳</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Countdown anzeigen</div>
            {!eventDate && <div style={{ fontSize: 11, color: '#94a3b8' }}>Setze zuerst ein Eventdatum</div>}
          </div>
        </label>
      </div>

      {/* ── Section 2: Module einblenden ── */}
      <div style={sectionStyle}>
        {sectionHeaderStyle('🧩', 'Module einblenden')}
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>Zeige Inhalte aus anderen Modulen auf dem Gäste-Dashboard an</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { key: 'showTimeline' as const, label: 'Ablaufplan', icon: '⏱️', available: hasTimeline, hint: 'Erstelle zuerst einen Ablaufplan' },
            { key: 'showMenu' as const, label: 'Menü', icon: '🍽️', available: hasMenu, hint: 'Erstelle zuerst ein Menü' },
            { key: 'showSeating' as const, label: 'Tischzuweisung', icon: '🪑', available: hasSeating, hint: 'Erstelle zuerst eine Tischplanung' },
          ].map(item => (
            <label key={item.key} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
              background: cfg[item.key] ? '#f0f9ff' : '#f8fafc', border: cfg[item.key] ? '1px solid #bae6fd' : '1px solid #e2e8f0',
              cursor: item.available ? 'pointer' : 'not-allowed', opacity: item.available ? 1 : 0.6,
            }}>
              <input type="checkbox" checked={cfg[item.key]} disabled={!item.available}
                onChange={e => update({ [item.key]: e.target.checked })}
                style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
                {!item.available && <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.hint}</div>}
              </div>
              {item.available && cfg[item.key] && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Sichtbar</span>}
            </label>
          ))}
        </div>
      </div>

      {/* ── Section 3: Details & Kontakt ── */}
      <div style={sectionStyle}>
        {sectionHeaderStyle('📋', 'Details & Kontakt', !!(cfg.dressCode || cfg.contactPhone || cfg.contactEmail || cfg.giftRegistryUrl || cfg.additionalInfo))}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>👔 Dresscode</label>
            <input type="text" value={cfg.dressCode ?? ''} onChange={e => update({ dressCode: e.target.value })}
              placeholder="z.B. Festlich / Smart Casual" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>🎁 Geschenkeliste (Link)</label>
            <input type="url" value={cfg.giftRegistryUrl ?? ''} onChange={e => update({ giftRegistryUrl: e.target.value })}
              placeholder="z.B. https://..." style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>📱 Telefon</label>
            <input type="tel" value={cfg.contactPhone ?? ''} onChange={e => update({ contactPhone: e.target.value })}
              placeholder="z.B. +49 123 456789" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>✉️ E-Mail</label>
            <input type="email" value={cfg.contactEmail ?? ''} onChange={e => update({ contactEmail: e.target.value })}
              placeholder="z.B. info@event.de" style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>ℹ️ Weitere Informationen</label>
          <textarea value={cfg.additionalInfo ?? ''} onChange={e => update({ additionalInfo: e.target.value })}
            placeholder="z.B. Parkmöglichkeiten, besondere Hinweise..."
            rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>

      {/* Tipp */}
      <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
        💡 Das Gäste-Dashboard wird über den Einladungslink zugänglich. Gäste sehen nach ihrer Zusage die hier konfigurierten Informationen.
      </div>
    </div>
  )
})

export default EventGuestDashboard
