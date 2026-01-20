import React, { useEffect, useState } from 'react'
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
  const [debugLevel, setDebugLevel] = useState<number>(0)

  useEffect(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem('debugPlacement') : null
    setDebugLevel(v === '2' ? 2 : (v === '1' ? 1 : 0))
  }, [])

  const toggleDebug = () => {
    const next = (debugLevel + 1) % 3
    setDebugLevel(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('debugPlacement', String(next))
    }
  }

  return (
    <footer className="app-footer no-print" style={{ padding: '0.5rem', borderTop: '1px solid #ccc', marginTop: 'auto' }}>
      <div className="footer-content" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
        <span className="version-info">
          {VERSION_INFO.creator} v{versionDisplay} ({VERSION_INFO.releaseDate})
        </span>
        <button onClick={toggleDebug} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
          Debug Logs: {debugLevel === 0 ? 'OFF' : debugLevel === 1 ? 'TOP3' : 'FULL'}
        </button>
      </div>
    </footer>
  )
}
