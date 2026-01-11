import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="container">
      <h1>Table Manager</h1>
      <div className="home-options">
        <Link to="/new-room">
          <button>Neuer Raum anlegen</button>
        </Link>
        <Link to="/load-room">
          <button>Raum laden</button>
        </Link>
      </div>
    </div>
  )
}