import React, { useEffect, useState } from 'react'
import { useDeviceType } from '../../utils/useDeviceType'
import TiptapEditor from '../shared/TiptapEditor'
import { getClubMembers, sendEventInvitations, updateClubEvent, getClubTemplates, createClubTemplate, deleteClubTemplate, updateClubTemplate, getSystemTemplates, cloneSystemTemplate } from '../../api/clubApi'
import { uploadFile } from '../../api/apiClient'
import type { ClubMember } from '../../types/club'
import { formatDateShort } from '../../utils/dateFormatting'

interface Props {
  clubId: string
  eventId: string
  token?: string
  initialSelected: string[]
  readOnly?: boolean
  onSave: (selectedIds: string[]) => Promise<void> | void
}

const EDITOR_STYLE = {
  container: { display: 'flex', flexDirection: 'column' as const, gap: 16, padding: 16, background: '#f8fafc', borderRadius: 12 },
  section: { background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#1e293b' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  textarea: { width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'Arial, sans-serif', fontSize: 13, lineHeight: 1.5 },
  button: (variant: 'primary' | 'secondary' | 'danger' = 'secondary') => ({
    padding: '8px 12px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    background: variant === 'primary' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : variant === 'danger' ? '#ef4444' : '#e2e8f0',
    color: variant === 'primary' ? 'white' : variant === 'danger' ? 'white' : '#1e293b',
    transition: 'opacity 0.2s',
  }),
  input: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: '100%' },
  label: { display: 'block', fontSize: 12, color: '#374151', marginBottom: 4, fontWeight: 600 },
  spinner: { display: 'inline-block', width: 14, height: 14, border: '2px solid #ccc', borderTop: '2px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  dialogOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dialogBox: { background: 'white', borderRadius: 12, padding: 24, maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' as const, boxShadow: '0 20px 25px rgba(0,0,0,0.15)' },
  letterPreview: { background: 'white', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.8, color: '#1e293b', minHeight: 300 },
}

export default function InviteMembers({ clubId, eventId, token, initialSelected, readOnly, onSave }: Props) {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'
  const [members, setMembers] = useState<ClubMember[]>([])
  const [selected, setSelected] = useState<string[]>(initialSelected || [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templateLogoUrl, setTemplateLogoUrl] = useState<string | null>(null)
  const [logoWidth, setLogoWidth] = useState(200)
  const [logoAlign, setLogoAlign] = useState<'left' | 'center' | 'right'>('left')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [templateBody, setTemplateBody] = useState('<p>Sehr geehrte*r {{name}},</p><p><br></p><p>[Ihr Einladungstext hier]</p><p><br></p><p>Mit freundlichen Grüßen</p>')
  const [templates, setTemplates] = useState<any[]>([])
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [systemTemplates, setSystemTemplates] = useState<any[]>([])
  const [showSystemModal, setShowSystemModal] = useState(false)
  const [cloningTemplateId, setCloningTemplateId] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editorFileRef = React.useRef<HTMLInputElement | null>(null)



  useEffect(() => {
    setLoading(true)
    getClubMembers(clubId, token || undefined).then(list => setMembers(list)).catch((e) => setError(e?.message)).finally(() => setLoading(false))
  }, [clubId, token])

  useEffect(() => {
    let mounted = true
    getClubTemplates(clubId, token).then(list => { if (mounted) setTemplates(list) }).catch(() => {})
    getSystemTemplates(token).then(list => { if (mounted) setSystemTemplates(list) }).catch(() => {})
    return () => { mounted = false }
  }, [clubId, token])

  useEffect(() => { setSelected(initialSelected || []) }, [initialSelected])

  function toggle(id: string) {
    if (readOnly) return
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function selectAll() { if (readOnly) return; setSelected(members.map(m => m.id)) }
  function selectVorstand() { if (readOnly) return; setSelected(members.filter(m => m.role === 'vorstand' || m.role === 'owner').map(m => m.id)) }

  function escapeHtmlLocal(text?: string | null) { return !text ? '' : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

  function personalize(html: string, member: ClubMember) {
    const date = formatDateShort(new Date().toISOString())
    return html
      .replace(/\{\{name\}\}/g, escapeHtmlLocal(member.display_name || ''))
      .replace(/\{\{address\}\}/g, escapeHtmlLocal(member.address || ''))
      .replace(/\{\{date\}\}/g, escapeHtmlLocal(date || ''))
  }

  function buildLetterHtml(member: ClubMember) {
    const logo = templateLogoUrl
      ? `<div style="text-align:${logoAlign};margin-bottom:20px"><img src="${escapeHtmlLocal(templateLogoUrl)}" style="width:${logoWidth}px;max-width:100%"/></div>`
      : ''
    const body = personalize(templateBody, member)
    const addr = member.address ? `<div style="margin-bottom:20px">${escapeHtmlLocal(member.display_name)}<br/>${escapeHtmlLocal(member.address)}</div>` : ''
    return `<div style="page-break-after:always;margin-bottom:40px;font-family:Georgia,serif">${logo}${addr}<br/><div style="font-size:13px;line-height:1.8">${body}</div></div>`
  }

  function renderLetterPreview() {
    const sample = members.find(m => selected.includes(m.id)) || members[0]
    if (!sample) return <div style={{ ...EDITOR_STYLE.letterPreview, color: '#94a3b8' }}>Keine Mitglieder vorhanden</div>
    const html = buildLetterHtml(sample)
    return <div style={EDITOR_STYLE.letterPreview} dangerouslySetInnerHTML={{ __html: html }} />
  }

  async function createTemplate() {
    if (readOnly) { setError('Nur Vorstand kann Templates anlegen.'); return }
    const name = prompt('Name der Vorlage (z.B. "Hochzeit 2026")', 'Neue Vorlage')
    if (!name) return
    try {
      const t = await createClubTemplate(clubId, { name, type: 'html', content: templateBody }, token)
      setTemplates(prev => [t, ...prev])
      setError(null)
    } catch (e: any) { setError('Vorlage speichern fehlgeschlagen: ' + e?.message) }
  }

  async function applyTemplate(templateId: string) {
    const t = templates.find(x => x.id === templateId)
    if (!t) return
    setTemplateBody(t.content || '')
    setShowTemplatesModal(false)
  }

  function applySystemTemplate(tpl: any) {
    setTemplateBody(tpl.content || '')
    setShowSystemModal(false)
  }

  async function saveSystemTemplateToClub(tpl: any) {
    if (readOnly) { setError('Nur Vorstand kann Templates anlegen.'); return }
    setCloningTemplateId(tpl.id)
    try {
      const saved = await cloneSystemTemplate(clubId, tpl.id, token)
      setTemplates(prev => [saved, ...prev])
      setShowSystemModal(false)
      setError(null)
    } catch (e: any) { setError('Speichern fehlgeschlagen: ' + e?.message) }
    finally { setCloningTemplateId(null) }
  }

  async function deleteTemplate(templateId: string) {
    if (!confirm('Vorlage wirklich löschen?')) return
    try {
      await deleteClubTemplate(clubId, templateId, token)
      setTemplates(prev => prev.filter(p => p.id !== templateId))
      setError(null)
    } catch (e: any) { setError('Löschen fehlgeschlagen: ' + e?.message) }
  }

  async function handleDownloadSerienPdf() {
    if (readOnly) { setError('Nur Vorstand kann PDF erstellen.'); return }
    const memberIds = members.filter(m => selected.includes(m.id)).map(m => m.id)
    if (memberIds.length === 0) { setError('Keine Empfänger ausgewählt.'); return }
    setDownloadingPdf(true)
    setError(null)
    try {
      const payload = { memberIds, logoUrl: templateLogoUrl ?? undefined, logoWidth, logoAlign, body: templateBody }
      const RUNTIME_BASE = (window as any).__RUNTIME_CONFIG__?.VITE_API_URL
      const BUILD_BASE = (import.meta as any).env?.VITE_API_URL
      const base = RUNTIME_BASE || BUILD_BASE || `${window.location.protocol}//${window.location.hostname}:4000`
      const res = await fetch(`${base}/clubs/${clubId}/events/${eventId}/serienpdf`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let parsed = null
        try { parsed = text ? JSON.parse(text) : null } catch { }
        throw new Error((parsed?.error || parsed?.message) || `Fehler ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `serienbrief-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e: any) {
      console.error('PDF error', e)
      setError('PDF-Generierung fehlgeschlagen: ' + e?.message)
    } finally { setDownloadingPdf(false) }
  }

  async function handleSendEmail() {
    if (readOnly) { setError('Nur Vorstand kann E-Mails versenden.'); return }
    const memberIds = members.filter(m => selected.includes(m.id)).map(m => m.id)
    if (memberIds.length === 0) { setError('Keine Empfänger ausgewählt.'); return }
    setSendingEmail(true)
    setError(null)
    try {
      const payload = { memberIds, logoUrl: templateLogoUrl ?? undefined, logoWidth, logoAlign, body: templateBody }
      await sendEventInvitations(clubId, eventId, payload, token)
    } catch (e: any) { setError('E-Mail-Versand fehlgeschlagen: ' + e?.message) }
    finally { setSendingEmail(false) }
  }

  return (
    <div style={EDITOR_STYLE.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {error && <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, border: '1px solid #fca5a5', color: '#991b1b' }}>{error}</div>}

      {/* Members Selection */}
      <div style={EDITOR_STYLE.section}>
        <div style={EDITOR_STYLE.sectionTitle}>Mitgliederauswahl ({selected.length} von {members.length})</div>
        {loading ? <div style={{ textAlign: 'center', color: '#94a3b8' }}>Laden...</div> : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={selectAll} style={EDITOR_STYLE.button('secondary')} disabled={readOnly}>Alle</button>
              <button onClick={selectVorstand} style={EDITOR_STYLE.button('secondary')} disabled={readOnly}>Vorstand</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {members.map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', padding: 8, background: selected.includes(m.id) ? '#ede9fe' : 'transparent', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} disabled={readOnly} style={{ marginRight: 8 }} />
                  <span style={{ fontSize: 13, color: '#1e293b' }}>{m.display_name}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Editor & Preview Grid */}
      <div style={{ ...EDITOR_STYLE.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
        {/* Editor */}
        <div style={EDITOR_STYLE.section}>
          <div style={EDITOR_STYLE.sectionTitle}>Einladungstext</div>
          {/* Logo Upload */}
          <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <label style={EDITOR_STYLE.label}>Logo</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...EDITOR_STYLE.button('primary'), cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {uploadingLogo ? <><div style={EDITOR_STYLE.spinner} /> Hochladen...</> : '🖼 Bild hochladen'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={readOnly} onChange={async (e) => {
                  const f = e.currentTarget.files?.[0]
                  if (!f) return
                  setUploadingLogo(true)
                  try {
                    const fd = new FormData()
                    fd.append('image', f)
                    const resp = await uploadFile(`/clubs/${clubId}/uploads`, fd, token)
                    if (resp?.url) setTemplateLogoUrl(resp.url)
                  } catch (err: any) {
                    setError('Logo-Upload fehlgeschlagen: ' + (err?.message || String(err)))
                  } finally { setUploadingLogo(false) }
                }} />
              </label>
              {templateLogoUrl && (
                <button onClick={() => setTemplateLogoUrl(null)} style={{ ...EDITOR_STYLE.button('danger'), padding: '6px 10px' }} title="Logo entfernen">✕</button>
              )}
            </div>

            {templateLogoUrl && (
              <>
                {/* Preview */}
                <div style={{ marginBottom: 10, padding: 8, background: 'white', borderRadius: 4, border: '1px solid #e2e8f0', textAlign: logoAlign }}>
                  <img src={templateLogoUrl} alt="Logo Vorschau" style={{ width: logoWidth, maxWidth: '100%' }} />
                </div>
                {/* Size */}
                <label style={EDITOR_STYLE.label}>Breite: {logoWidth} px</label>
                <input type="range" min={40} max={500} step={10} value={logoWidth}
                  onChange={e => setLogoWidth(Number(e.target.value))}
                  style={{ width: '100%', marginBottom: 8 }}
                />
                {/* Alignment */}
                <label style={EDITOR_STYLE.label}>Ausrichtung</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button key={a} onClick={() => setLogoAlign(a)}
                      style={{ ...EDITOR_STYLE.button(logoAlign === a ? 'primary' : 'secondary'), flex: 1, textAlign: 'center' }}>
                      {a === 'left' ? '⬅ Links' : a === 'center' ? '↔ Mitte' : 'Rechts ➡'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <label style={{ ...EDITOR_STYLE.label, marginTop: 4 }}>Brief-Text (Platzhalter: {'{{name}}'}, {'{{address}}'}, {'{{date}}'})</label>
          <TiptapEditor
            value={templateBody}
            onChange={setTemplateBody}
            readOnly={readOnly}
            placeholder="Schreiben Sie hier Ihren Einladungstext..."
            style={{ minHeight: 200 }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={createTemplate} style={EDITOR_STYLE.button('primary')} disabled={readOnly}>
              💾 Als Vorlage speichern
            </button>
            <button onClick={() => setShowSystemModal(true)} style={EDITOR_STYLE.button('secondary')}>
              📚 Vorlage laden{systemTemplates.length > 0 ? ` (${systemTemplates.length})` : ''}
            </button>
            {templates.length > 0 && (
              <button onClick={() => setShowTemplatesModal(true)} style={EDITOR_STYLE.button('secondary')}>
                📋 Vereinsvorlagen ({templates.length})
              </button>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div style={EDITOR_STYLE.section}>
          <div style={EDITOR_STYLE.sectionTitle}>Vorschau (erste ausgewählte Person)</div>
          {renderLetterPreview()}
        </div>
      </div>

      {/* Actions */}
      <div style={{ ...EDITOR_STYLE.section, display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleDownloadSerienPdf}
            disabled={readOnly || selected.length === 0 || downloadingPdf}
            style={{
              ...EDITOR_STYLE.button(downloadingPdf ? 'secondary' : 'primary'),
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: (readOnly || selected.length === 0) ? 0.5 : 1,
            }}
          >
            {downloadingPdf && <div style={EDITOR_STYLE.spinner} />}
            📄 Serien-PDF exportieren
          </button>
          <button
            onClick={handleSendEmail}
            disabled={readOnly || selected.length === 0 || sendingEmail}
            style={{
              ...EDITOR_STYLE.button('secondary'),
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: (readOnly || selected.length === 0) ? 0.5 : 1,
            }}
          >
            {sendingEmail && <div style={EDITOR_STYLE.spinner} />}
            ✉️ E-Mails versenden
          </button>
        </div>
        <button onClick={() => onSave(selected)} disabled={saving} style={EDITOR_STYLE.button('primary')}>
          {saving ? '...wird gespeichert' : '✓ Speichern'}
        </button>
      </div>

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div style={EDITOR_STYLE.dialogOverlay} onClick={() => setShowTemplatesModal(false)}>
          <div style={EDITOR_STYLE.dialogBox} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 16, color: '#1e293b' }}>Vereins-Vorlagen ({templates.length})</h2>
            {templates.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>Keine Vorlagen gespeichert</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map(t => (
                  <div key={t.id} style={{ padding: 12, background: '#f1f5f9', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{(t.content || '').substring(0, 60)}...</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => applyTemplate(t.id)} style={{ ...EDITOR_STYLE.button('primary'), padding: '6px 10px' }}>Nutzen</button>
                      <button onClick={() => deleteTemplate(t.id)} style={{ ...EDITOR_STYLE.button('danger'), padding: '6px 10px' }}>Löschen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTemplatesModal(false)} style={EDITOR_STYLE.button('secondary')}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {/* System Templates Modal */}
      {showSystemModal && (
        <div style={EDITOR_STYLE.dialogOverlay} onClick={() => setShowSystemModal(false)}>
          <div style={{ ...EDITOR_STYLE.dialogBox, maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 4, color: '#1e293b' }}>📚 Mustervorlagen ({systemTemplates.length})</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Wähle eine Vorlage zum direkten Laden oder speichere sie als eigene Vereinsvorlage.
            </p>
            {systemTemplates.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>Keine Mustervorlagen vorhanden.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {systemTemplates.map(t => (
                  <div key={t.id} style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}
                          dangerouslySetInnerHTML={{ __html: (t.content || '').replace(/<[^>]+>/g, ' ').substring(0, 120) + '…' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => applySystemTemplate(t)}
                          style={{ ...EDITOR_STYLE.button('primary'), whiteSpace: 'nowrap' }}
                        >
                          📝 Laden
                        </button>
                        {!readOnly && (
                          <button
                            onClick={() => saveSystemTemplateToClub(t)}
                            disabled={cloningTemplateId === t.id}
                            style={{ ...EDITOR_STYLE.button('secondary'), whiteSpace: 'nowrap', fontSize: 12 }}
                          >
                            {cloningTemplateId === t.id ? '…' : '💾 Als Vereinsvorlage'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSystemModal(false)} style={EDITOR_STYLE.button('secondary')}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
