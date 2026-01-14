import React from 'react'
import '../styles/footer.css'

const VERSION_INFO = {
  version: '0.6.0',
  creator: 'Cayn183',
  releaseDate: '2026-01-14'
}

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="version-info">
          {VERSION_INFO.creator} v{VERSION_INFO.version} ({VERSION_INFO.releaseDate})
        </span>
      </div>
    </footer>
  )
}
