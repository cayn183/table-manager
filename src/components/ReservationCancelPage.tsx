import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicRequest } from '../api/apiClient'

export default function ReservationCancelPage() {
  const { cancelToken } = useParams<{ cancelToken: string }>()
  const [loading, setLoading] = useState(true)
  const [reservation, setReservation] = useState<any>(null)
  const [cancelled, setCancelled] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cancelToken) return
    publicRequest('GET', `/public/reservations/${cancelToken}`)
      .then(data => {
        setReservation(data)
        if (data.status === 'cancelled') setCancelled(true)
      })
      .catch((e: any) => setError(e?.message || 'Reservierung nicht gefunden.'))
      .finally(() => setLoading(false))
  }, [cancelToken])

  async function handleCancel() {
    if (!cancelToken) return
    setCancelling(true)
    try {
      await publicRequest('DELETE', `/public/reservations/${cancelToken}`)
      setCancelled(true)
    } catch (e: any) {
      setError(e?.message || 'Stornierung fehlgeschlagen.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <p style={{ textAlign: 'center', color: '#64748b' }}>Lade…</p>
        </div>
      </div>
    )
  }

  if (error && !reservation) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>😕</span>
            <h2 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Nicht gefunden</h2>
            <p style={{ color: '#64748b' }}>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (cancelled) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>✅</span>
            <h2 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Reservierung storniert</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
              Deine Reservierung für <strong>{reservation?.eventTitle}</strong> wurde erfolgreich storniert.
              Du erhältst eine Bestätigung per E-Mail.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <h2 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Reservierung stornieren?</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>
            Möchtest du die Reservierung für <strong>{reservation?.eventTitle}</strong> wirklich stornieren?
          </p>
          {reservation && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', margin: '16px 0', textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Name: <strong style={{ color: '#1e293b' }}>{reservation.name}</strong></div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Personen: <strong style={{ color: '#1e293b' }}>{reservation.groupSize}</strong></div>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13, margin: '12px 0' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                padding: '12px 24px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: cancelling ? 'wait' : 'pointer',
                opacity: cancelling ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {cancelling ? 'Wird storniert…' : 'Ja, stornieren'}
            </button>
            <button
              onClick={() => window.history.back()}
              style={{
                padding: '12px 24px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1.5px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 11, color: '#cbd5e1' }}>Powered by PlatzPilot</span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fef2f2 100%)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '32px 28px',
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
  },
}
