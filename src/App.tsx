import React from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import PublicLayout from './components/PublicLayout'
import PublicLayoutNoFooter from './components/PublicLayoutNoFooter'
import AppLayout from './components/AppLayout'
import LandingPage from './components/LandingPage'
import ClubLandingPage from './components/ClubLandingPage'
// import WeddingLandingPage from './components/WeddingLandingPage'
import Home from './components/Home'
import RoomEditor from './components/RoomEditor'
import Room from './components/Room'
import LoadRoom from './components/LoadRoom'
import LoadEvent from './components/LoadEvent'
import Login from './components/Login'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import VerifyEmail from './components/VerifyEmail'
import Profile from './components/Profile'
import AdminPanel from './components/AdminPanel'
import ToGo from './components/ToGo'

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
        {/* <Route path="/sitzplan-hochzeit" element={<WeddingLandingPage />} /> */}
      </Route>
      
      {/* ═══ AUTH ROUTES (No nested layout) ═══ */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login initialMode="register" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      
      {/* ═══ APP ROUTES (Protected, User must be logged in) ═══ */}
      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="profile" element={<Profile />} />
        <Route path="events" element={<LoadEvent />} />
        <Route path="events/:eventId" element={<Room />} />
        <Route path="rooms" element={<LoadRoom />} />
        <Route path="rooms/:roomId" element={<RoomEditor />} />
        <Route path="togo" element={<ToGo />} />
      </Route>
      
      {/* ═══ ADMIN ROUTE (Special handling) ═══ */}
      <Route path="/admin" element={
        auth.user 
          ? ((auth.user as any).is_admin ? <AdminPanel /> : <Navigate to="/app" replace />) 
          : <Navigate to="/login" replace />
      } />
      
      {/* ═══ LEGACY ROUTES (Redirect to new structure) ═══ */}
      <Route path="/new-room" element={<Navigate to="/app/rooms/new" replace />} />
      <Route path="/load-room" element={<Navigate to="/app/rooms" replace />} />
      <Route path="/load-event" element={<Navigate to="/app/events" replace />} />
      <Route path="/room" element={<Navigate to="/app" replace />} />
      <Route path="/togo" element={<Navigate to="/app/togo" replace />} />
      
      {/* ═══ FALLBACK ═══ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
