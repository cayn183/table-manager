import React from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import PublicLayout from './components/layout/PublicLayout'
import PublicLayoutNoFooter from './components/layout/PublicLayoutNoFooter'
import AppLayout from './components/layout/AppLayout'
import LandingPage from './components/landing/LandingPage'
import ClubLandingPage from './components/landing/ClubLandingPage'
import WeddingLandingPage from './components/landing/WeddingLandingPage'
import GuestListLandingPage from './components/landing/GuestListLandingPage'
import Home from './components/shared/Home'
import Room from './components/room/Room'
import LoadEvent from './components/room/LoadEvent'
import Login from './components/auth/Login'
import ForgotPassword from './components/auth/ForgotPassword'
import ResetPassword from './components/auth/ResetPassword'
import VerifyEmail from './components/auth/VerifyEmail'
import Profile from './components/auth/Profile'
import AdminPanel from './components/shared/AdminPanel'
import ToGo from './components/togo/ToGo'
import ReservationPage from './components/reservation/ReservationPage'
import ReservationCancelPage from './components/reservation/ReservationCancelPage'
import EventInvitePage from './components/reservation/EventInvitePage'
import EventOpenInvitePage from './components/reservation/EventOpenInvitePage'
import ClubMembers from './components/club/ClubMembers'
import ClubSettings from './components/club/ClubSettings'
import ClubEvents from './components/club/ClubEvents'
import ClubEventDetail from './components/club/ClubEventDetail'
import PrivateEventDetail from './components/shared/PrivateEventDetail'
import NotFound from './components/shared/NotFound'
import { ClubProvider } from './components/club/ClubContext'

function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (auth.loading) return null
  if (!auth.user) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return <>{children}</>
}

export default function App() {
  const auth = useAuth()
  if (auth.loading) return null
  
  return (
    <Routes>
      {/* ═══ LANDING PAGE (has its own layout/nav/footer) ═══ */}
      <Route path="/" element={<LandingPage />} />
      
      {/* ═══ SEO LANDING PAGES (shared PublicLayoutNoFooter with nav, no footer) ═══ */}
      <Route element={<PublicLayoutNoFooter />}>
        <Route path="/sitzplan-verein" element={<ClubLandingPage />} />
        <Route path="/sitzplan-hochzeit" element={<WeddingLandingPage />} />
        <Route path="/gaesteliste" element={<GuestListLandingPage />} />
      </Route>
      
      {/* ═══ AUTH ROUTES (No nested layout) ═══ */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login initialMode="register" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      
      {/* ═══ PUBLIC RESERVATION ROUTES (No login required) ═══ */}
      <Route path="/e/:shareToken" element={<ReservationPage />} />
      <Route path="/e/cancel/:cancelToken" element={<ReservationCancelPage />} />
      
      {/* ═══ PUBLIC GUEST INVITE ROUTES (No login required) ═══ */}
      <Route path="/invite/:token" element={<EventInvitePage />} />
      <Route path="/event/:shareToken" element={<EventOpenInvitePage />} />
      
      {/* ═══ APP ROUTES (Protected, User must be logged in) ═══ */}
      <Route path="/app" element={<RequireAuth><ClubProvider><AppLayout /></ClubProvider></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="profile" element={<Profile />} />
        <Route path="events" element={<LoadEvent />} />
        <Route path="events/:eventId" element={<PrivateEventDetail />} />
        <Route path="togo" element={<ToGo />} />
        <Route path="club/:clubId/members" element={<ClubMembers />} />
        <Route path="club/:clubId/settings" element={<ClubSettings />} />
        <Route path="club/:clubId/events" element={<ClubEvents />} />
        <Route path="club/:clubId/events/:eventId" element={<ClubEventDetail />} />
      </Route>
      
      {/* ═══ ADMIN ROUTE (Special handling) ═══ */}
      <Route path="/admin" element={
        auth.user 
          ? ((auth.user as any).is_admin ? <AdminPanel /> : <Navigate to="/app" replace />) 
          : <Navigate to="/login" replace />
      } />
      
      {/* ═══ LEGACY ROUTES (Redirect to new structure) ═══ */}
      <Route path="/new-room" element={<Navigate to="/app" replace />} />
      <Route path="/load-room" element={<Navigate to="/app" replace />} />
      <Route path="/load-event" element={<Navigate to="/app/events" replace />} />
      <Route path="/room" element={<Navigate to="/app" replace />} />
      <Route path="/togo" element={<Navigate to="/app/togo" replace />} />
      
      {/* ═══ FALLBACK ═══ */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
