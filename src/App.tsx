import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Home from './components/Home'
import RoomEditor from './components/RoomEditor'
import Room from './components/Room'
import LoadRoom from './components/LoadRoom'
import LoadEvent from './components/LoadEvent'
import PrintViewPage from './components/PrintViewPage'
import Login from './components/Login'
import Profile from './components/Profile'
import AdminPanel from './components/AdminPanel'
import FeedbackForm from './components/FeedbackForm'

export default function App() {
  const auth = useAuth()
  return (
    <Routes>
      <Route path="/" element={auth.user ? <Home /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin" element={auth.user ? ((auth.user as any).is_admin ? <AdminPanel /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />} />
      <Route path="/feedback" element={auth.user ? <FeedbackForm /> : <FeedbackForm />} />
      <Route path="/new-room" element={<RoomEditor />} />
      <Route path="/load-room" element={<LoadRoom />} />
      <Route path="/load-event" element={<LoadEvent />} />
      <Route path="/room" element={<Room />} />
      <Route path="/printview" element={<PrintViewPage />} />
    </Routes>
  )
}
