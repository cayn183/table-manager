import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useClubs } from '../club/ClubContext'
import userStorage from '../../utils/userStorage'
import FeedbackForm from './FeedbackForm'
import PrivateEventWizardModal from './PrivateEventWizardModal'
import ClubCreateModal from '../club/ClubCreateModal'
import ClubJoinModal from '../club/ClubJoinModal'
import ClubDashboard from '../club/ClubDashboard'
import { useHelp } from './HelpContext'
import { useDeviceType } from '../../utils/useDeviceType'
import type { PrivateEventItem } from '../../types/event'

const STORAGE_KEY = 'currentRoom'
export default function Home() {
  const navigate = useNavigate()
  const auth = useAuth()
  const { openHelp } = useHelp()
  const { clubs, loading: clubsLoading } = useClubs()
  const device = useDeviceType()
  const isMobile = device === 'mobile'
  const userId = auth.user ? auth.user.id : null
  const [showEventModal, setShowEventModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showCreateClubModal, setShowCreateClubModal] = useState(false)
  const [showJoinClubModal, setShowJoinClubModal] = useState(false)
  const [mobileTab, setMobileTab] = useState<'private' | 'club'>('private')

  function handleEventCreated(event: PrivateEventItem) {
    setShowEventModal(false)
    navigate(`/app/events/${event.id}`)
  }

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Main Content */}
      <div className="page-content-wrapper" style={{ flex: 1, padding: isMobile ? '16px 14px' : '40px 24px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        {/* Welcome Section */}
        <div className="home-welcome-banner" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '14px 16px' : '24px 28px',
          marginBottom: isMobile ? '14px' : '32px',
          color: 'white',
          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {!isMobile && <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '140px',
            height: '140px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '50%'
          }} />}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? 10 : 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: isMobile ? '17px' : '22px', fontWeight: '700', letterSpacing: '-0.01em' }}>
                👋 Willkommen, {auth.user?.name || 'Freund'}!
              </h2>
              {!isMobile && (
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.85 }}>
                  Viel Spaß beim Planen! ❓ Anleitung für schnelle Hilfe — 📢 Feedback für Fragen & Wünsche.
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? '6px' : '10px', flexShrink: 0 }}>
              <button
                onClick={() => setShowFeedbackModal(true)}
                style={{
                  padding: isMobile ? '6px 10px' : '8px 14px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: isMobile ? '12px' : '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(4px)'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                📢 Feedback
              </button>
              {!isMobile && (
                <button
                  onClick={() => openHelp('home')}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backdropFilter: 'blur(4px)'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  ❓ Anleitung
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile: Tab Switcher ── */}
        {isMobile && clubs.length > 0 && (
          <div style={{
            display: 'flex',
            background: '#e2e8f0',
            borderRadius: 10,
            padding: 3,
            marginBottom: 14,
            gap: 3,
          }}>
            <button
              onClick={() => setMobileTab('private')}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                borderRadius: 8,
                background: mobileTab === 'private' ? 'white' : 'transparent',
                color: mobileTab === 'private' ? '#667eea' : '#64748b',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: mobileTab === 'private' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              🏠 Privat
            </button>
            <button
              onClick={() => setMobileTab('club')}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                borderRadius: 8,
                background: mobileTab === 'club' ? 'white' : 'transparent',
                color: mobileTab === 'club' ? '#10b981' : '#64748b',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: mobileTab === 'club' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              🏆 Verein
            </button>
          </div>
        )}

        {/* ── Mobile: Conditional sections ── */}
        {isMobile ? (
          <>
            {/* Show private section when: no clubs (always), or mobileTab === 'private' */}
            {(clubs.length === 0 || mobileTab === 'private') && (
              <div>
                <div className="home-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <button
                    onClick={() => setShowEventModal(true)}
                    style={{
                      padding: '14px 16px',
                      background: 'white',
                      border: '2px solid #667eea',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#667eea',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '22px', flexShrink: 0 }}>✨</span>
                    <span>Neues Event</span>
                  </button>
                  <Link to="/app/events" style={{ textDecoration: 'none' }}>
                    <button style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'white',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1e293b',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>📂</span>
                      <span>Events laden</span>
                    </button>
                  </Link>
                  <Link to="/app/rooms" style={{ textDecoration: 'none' }}>
                    <button style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'white',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1e293b',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>🏠</span>
                      <span>Räume laden</span>
                    </button>
                  </Link>
                  <Link to="/app/rooms/new" onClick={() => { userStorage.removeItem(STORAGE_KEY, userId); localStorage.removeItem(STORAGE_KEY) }} style={{ textDecoration: 'none' }}>
                    <button style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'white',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1e293b',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>🏗️</span>
                      <span>Raum erstellen</span>
                    </button>
                  </Link>
                </div>
                {/* Club join/create — compact on mobile private tab */}
                {clubs.length === 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button
                      onClick={() => setShowCreateClubModal(true)}
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        background: 'white',
                        border: '2px solid #10b981',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>🏆</span>
                      <span>Verein erstellen</span>
                    </button>
                    <button
                      onClick={() => setShowJoinClubModal(true)}
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        background: 'white',
                        border: '2px solid #f59e0b',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>🤝</span>
                      <span>Beitreten</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Club section on mobile */}
            {clubs.length > 0 && mobileTab === 'club' && (
              <div>
                <ClubDashboard />
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button
                    onClick={() => setShowCreateClubModal(true)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    🏆 Neuer Verein
                  </button>
                  <button
                    onClick={() => setShowJoinClubModal(true)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    🤝 Beitreten
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Desktop: Two-column layout (unchanged) ── */
          <div className="home-two-column" style={{
            display: 'grid',
            gridTemplateColumns: clubs.length > 0 ? '1fr 1fr' : '1fr',
            gap: 32,
            maxWidth: clubs.length > 0 ? '1200px' : '800px',
            margin: '0 auto'
          }}>
            {/* ── Left Column: Private ── */}
            <div>
              {clubs.length > 0 && (
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🏠 Privat
                </h3>
              )}
              {/* Action Buttons */}
              <div className="home-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <button 
              onClick={() => setShowEventModal(true)}
              style={{
                padding: '32px 24px',
                background: 'white',
                border: '2px solid #667eea',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                color: '#667eea',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(102,126,234,0.3)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            >
              <span style={{ fontSize: '32px' }}>✨</span>
              <span>Neues Event anlegen</span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Starte ein neues Event mit Raum und Familien</span>
            </button>
            <Link to="/app/events" style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%',
                padding: '32px 24px',
                background: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}>
                <span style={{ fontSize: '32px' }}>📂</span>
                <span>Event laden</span>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Bestehende Events öffnen und bearbeiten</span>
              </button>
            </Link>
            <Link to="/app/rooms" style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%',
                padding: '32px 24px',
                background: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}>
                <span style={{ fontSize: '32px' }}>🏠</span>
                <span>Raum laden</span>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Gespeicherte Raum-Layouts verwenden</span>
              </button>
            </Link>
            <Link to="/app/rooms/new" onClick={() => { userStorage.removeItem(STORAGE_KEY, userId); localStorage.removeItem(STORAGE_KEY) }} style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%',
                padding: '32px 24px',
                background: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}>
                <span style={{ fontSize: '32px' }}>🏗️</span>
                <span>Raum anlegen</span>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Neuen Raum mit Tisch-Layout erstellen</span>
              </button>
            </Link>

            {/* Club Buttons */}
            <button
              onClick={() => setShowCreateClubModal(true)}
              style={{
                padding: '32px 24px',
                background: 'white',
                border: '2px solid #10b981',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                color: '#10b981',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.3)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            >
              <span style={{ fontSize: '32px' }}>🏆</span>
              <span>Verein erstellen</span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Einen neuen Verein gründen</span>
            </button>
            <button
              onClick={() => setShowJoinClubModal(true)}
              style={{
                padding: '32px 24px',
                background: 'white',
                border: '2px solid #f59e0b',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                color: '#f59e0b',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(245,158,11,0.3)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            >
              <span style={{ fontSize: '32px' }}>🤝</span>
              <span>Verein beitreten</span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '400' }}>Per Einladungscode beitreten</span>
            </button>
              </div>
            </div>

            {/* ── Right Column: Club Dashboard (only visible when in a club) ── */}
            {clubs.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🏆 Verein
                </h3>
                <ClubDashboard />
              </div>
            )}
          </div>
        )}
      </div>

      {showEventModal && (
        <PrivateEventWizardModal
          onClose={() => setShowEventModal(false)}
          onCreated={handleEventCreated}
        />
      )}

      {showFeedbackModal && (
        <div onClick={() => setShowFeedbackModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 96%)', background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 10px 40px rgba(2,6,23,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>📢 Feedback senden</h3>
              <button onClick={() => setShowFeedbackModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}>✕</button>
            </div>
            <FeedbackForm onDone={() => setShowFeedbackModal(false)} />
          </div>
        </div>
      )}

      {showCreateClubModal && <ClubCreateModal onClose={() => setShowCreateClubModal(false)} />}
      {showJoinClubModal && <ClubJoinModal onClose={() => setShowJoinClubModal(false)} />}
    </div>
  )
}