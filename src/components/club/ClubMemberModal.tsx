import React, { useState, useEffect } from 'react'
import type { ClubMember, ClubMemberProfileInput } from '../../types/club'

interface Props {
  /** null = create new manual member */
  member?: ClubMember | null
  onSave: (data: ClubMemberProfileInput & { first_name: string; last_name: string }) => Promise<void>
  onClose: () => void
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box', outline: 'none',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4,
}

export default function ClubMemberModal({ member, onSave, onClose }: Props) {
  const isEdit = !!member

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    salutation: '' as 'herr' | 'frau' | 'divers' | '',
    role: 'mitglied' as 'mitglied' | 'vorstand',
    member_since: '',
    birth_date: '',
    phone: '',
    contact_email: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    iban: '',
    bic: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (member) {
      const nameParts = member.display_name?.split(' ') ?? []
      // Parse address into components (format: "Straße 1, 12345 Ort")
      let street = '', house_number = '', postal_code = '', city = ''
      if (member.address) {
        const addressLines = member.address.split('\n').map(l => l.trim())
        if (addressLines.length > 0) {
          // Try to parse street and house number from first line
          const streetLine = addressLines[0]
          const streetMatch = streetLine.match(/^(.+?)\s+(\d+\w*)$/)
          if (streetMatch) {
            street = streetMatch[1]
            house_number = streetMatch[2]
          } else {
            street = streetLine
          }
          // Second line might be postal code and city
          if (addressLines.length > 1) {
            const cityLine = addressLines[1]
            const cityMatch = cityLine.match(/^(\d+)\s+(.+)$/)
            if (cityMatch) {
              postal_code = cityMatch[1]
              city = cityMatch[2]
            }
          }
        }
      }
      setForm({
        first_name: member.first_name ?? nameParts[0] ?? '',
        last_name: member.last_name ?? nameParts.slice(1).join(' ') ?? '',
        salutation: (member.salutation as any) ?? '',
        role: (member.role === 'vorstand' ? 'vorstand' : 'mitglied'),
        member_since: member.member_since?.slice(0, 10) ?? member.joined_at?.slice(0, 10) ?? '',
        birth_date: member.birth_date?.slice(0, 10) ?? '',
        phone: member.phone ?? '',
        contact_email: member.contact_email ?? member.email ?? '',
        street: street,
        house_number: house_number,
        postal_code: postal_code,
        city: city,
        iban: member.iban ?? '',
        bic: member.bic ?? '',
        notes: member.notes ?? '',
      })
    }
  }, [member])

  function set(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Vor- und Nachname sind Pflichtfelder.')
      return
    }
    setSaving(true)
    setError('')
    try {
      // Combine address components
      const address = [
        form.street && form.house_number ? `${form.street} ${form.house_number}` : form.street,
        form.postal_code && form.city ? `${form.postal_code} ${form.city}` : form.city
      ].filter(Boolean).join('\n') || undefined

      await onSave({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        salutation: form.salutation || undefined,
        role: form.role,
        member_since: form.member_since || undefined,
        birth_date: form.birth_date || undefined,
        phone: form.phone || undefined,
        contact_email: form.contact_email || undefined,
        address: address,
        iban: form.iban || undefined,
        bic: form.bic || undefined,
        notes: form.notes || undefined,
      })
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'white', borderRadius: 14, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
            {isEdit ? '✏️ Mitglied bearbeiten' : '➕ Mitglied anlegen'}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stammdaten */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Stammdaten
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL_STYLE}>Vorname *</label>
                <input style={FIELD_STYLE} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Max" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Nachname *</label>
                <input style={FIELD_STYLE} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Mustermann" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Anrede</label>
                <select style={FIELD_STYLE} value={form.salutation} onChange={e => set('salutation', e.target.value as any)}>
                  <option value="">-- Keine --</option>
                  <option value="herr">Herr</option>
                  <option value="frau">Frau</option>
                  <option value="divers">Divers</option>
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Rolle im Verein</label>
                <select style={FIELD_STYLE} value={form.role} onChange={e => set('role', e.target.value as any)}>
                  <option value="mitglied">Mitglied</option>
                  <option value="vorstand">Vorstand</option>
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Mitglied seit</label>
                <input type="date" style={FIELD_STYLE} value={form.member_since} onChange={e => set('member_since', e.target.value)} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Geburtsdatum</label>
                <input type="date" style={FIELD_STYLE} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Kontakt */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Kontakt
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL_STYLE}>E-Mail</label>
                  <input type="email" style={FIELD_STYLE} value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="max@beispiel.de" />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Telefonnummer</label>
                  <input type="tel" style={FIELD_STYLE} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+49 123 456789" />
                </div>
              </div>
              <div>
                <label style={LABEL_STYLE}>Adresse</label>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ ...LABEL_STYLE, marginBottom: 4 }}>Straße</label>
                    <input style={FIELD_STYLE} value={form.street} onChange={e => set('street', e.target.value)} placeholder="Musterstraße" />
                  </div>
                  <div>
                    <label style={{ ...LABEL_STYLE, marginBottom: 4 }}>Hausnummer</label>
                    <input style={FIELD_STYLE} value={form.house_number} onChange={e => set('house_number', e.target.value)} placeholder="42" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div>
                    <label style={{ ...LABEL_STYLE, marginBottom: 4 }}>Postleitzahl</label>
                    <input style={FIELD_STYLE} value={form.postal_code} onChange={e => set('postal_code', e.target.value)} placeholder="12345" />
                  </div>
                  <div>
                    <label style={{ ...LABEL_STYLE, marginBottom: 4 }}>Ort</label>
                    <input style={FIELD_STYLE} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Berlin" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bankverbindung */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              🔒 Bankverbindung (intern)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL_STYLE}>IBAN</label>
                <input style={FIELD_STYLE} value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="DE00 0000 0000 0000 0000 00" />
              </div>
              <div>
                <label style={LABEL_STYLE}>BIC</label>
                <input style={FIELD_STYLE} value={form.bic} onChange={e => set('bic', e.target.value)} placeholder="DEUTDEDB" />
              </div>
            </div>
          </section>

          {/* Notizen */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Notizen
            </div>
            <textarea
              style={{ ...FIELD_STYLE, minHeight: 72, resize: 'vertical' }}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Interne Notizen zum Mitglied…"
            />
          </section>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#991b1b' }}>
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#475569' }}
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 22px', background: saving ? '#a5b4fc' : '#667eea', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Speichern…' : isEdit ? 'Speichern' : 'Anlegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
