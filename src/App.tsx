import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import RoomEditor from './components/RoomEditor'
import Room from './components/Room'
import LoadRoom from './components/LoadRoom'
import LoadEvent from './components/LoadEvent'
import PrintViewPage from './components/PrintViewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new-room" element={<RoomEditor />} />
      <Route path="/load-room" element={<LoadRoom />} />
      <Route path="/load-event" element={<LoadEvent />} />
      <Route path="/room" element={<Room />} />
      <Route path="/printview" element={<PrintViewPage />} />
    </Routes>
  )
}
