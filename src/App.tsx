import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import RoomEditor from './components/RoomEditor'
import Room from './components/Room'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new-room" element={<RoomEditor />} />
      <Route path="/load-room" element={<div>Raum laden - noch nicht implementiert</div>} />
      <Route path="/room" element={<Room />} />
    </Routes>
  )
}
