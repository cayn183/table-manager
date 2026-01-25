import React from 'react'
import '../styles/footer.css'

const VERSION_INFO = {
  version: 'dev',
  creator: 'Cayn183',
  releaseDate: '2026-01-16'
}

const env = (import.meta as ImportMeta & { env?: { VITE_BUILD_SHA?: string; VITE_BUILD_VERSION?: string } }).env || {}
const buildSha = env.VITE_BUILD_SHA
const buildVersion = env.VITE_BUILD_VERSION

const baseVersion = buildVersion && buildVersion !== 'unknown' ? buildVersion : VERSION_INFO.version
const versionDisplay = (() => {
  // For dev builds, include the short commit SHA when available
  if ((baseVersion === 'dev' || VERSION_INFO.version === 'dev') && buildSha && buildSha !== 'unknown') {
    return `${baseVersion} (${String(buildSha).substring(0, 7)})`
  }
  // Otherwise display the build version (release) or static version
  return baseVersion
})()

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
