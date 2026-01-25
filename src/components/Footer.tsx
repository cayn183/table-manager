import React from 'react'
import '../styles/footer.css'

const VERSION_INFO = {
  version: 'dev',
  creator: 'Cayn183',
  releaseDate: '2026-01-16'
}

const buildSha = (import.meta as ImportMeta & { env?: { VITE_BUILD_SHA?: string } }).env?.VITE_BUILD_SHA
const versionDisplay = buildSha && buildSha !== 'unknown' 
  ? `${VERSION_INFO.version} (${buildSha.substring(0, 7)})`
  : VERSION_INFO.version

export default function Footer() {
  return (
    <footer className="app-footer no-print" style={{ padding: '0.5rem', borderTop: '1px solid #ccc', marginTop: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        <div className="footer-content" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
          <span className="version-info">
            {VERSION_INFO.creator} v{versionDisplay} ({VERSION_INFO.releaseDate})
          </span>
        </div>
      </div>
    </footer>
  )
}
