import React from 'react'
import '../styles/footer.css'

const VERSION_INFO = {
  version: '0.6.3',
  creator: 'Cayn183',
  releaseDate: '2026-01-15'
}

const buildSha = import.meta.env.VITE_BUILD_SHA
const versionDisplay = buildSha && buildSha !== 'unknown' 
  ? `${VERSION_INFO.version} (${buildSha.substring(0, 7)})`
  : VERSION_INFO.version

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="version-info">
          {VERSION_INFO.creator} v{versionDisplay} ({VERSION_INFO.releaseDate})
        </span>
      </div>
    </footer>
  )
}
