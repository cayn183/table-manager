import React from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LandingPage from './components/LandingPage'
import Home from './components/Home'
import RoomEditor from './components/RoomEditor'
import Room from './components/Room'
import LoadRoom from './components/LoadRoom'
import LoadEvent from './components/LoadEvent'
import Login from './components/Login'
import Profile from './components/Profile'
import AdminPanel from './components/AdminPanel'
import ToGo from './components/ToGo'

function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (auth.loading) return null
  if (!auth.user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const auth = useAuth()
  if (auth.loading) return null
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login initialMode="register" />} />
      <Route path="/app" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/admin" element={auth.user ? ((auth.user as any).is_admin ? <AdminPanel /> : <Navigate to="/app" replace />) : <Navigate to="/login" replace />} />
      <Route path="/new-room" element={<RequireAuth><RoomEditor /></RequireAuth>} />
      <Route path="/load-room" element={<RequireAuth><LoadRoom /></RequireAuth>} />
      <Route path="/load-event" element={<RequireAuth><LoadEvent /></RequireAuth>} />
      <Route path="/room" element={<RequireAuth><Room /></RequireAuth>} />
      <Route path="/togo" element={<RequireAuth><ToGo /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
