import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import Footer from './components/Footer'
import UserMenu from './components/UserMenu'
import ErrorBoundary from './components/ErrorBoundary'
import './styles.css'
import './styles/footer.css'
import sentry from './sentryClient'

function Root() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <UserMenu />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <App />
      </div>
      <Footer />
    </div>
  )
}
  // Debug placement feature removed from UI; keep codebase quiet by default

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Root />
          </ErrorBoundary>
        </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

// initialise Sentry in the browser if configured
;(async () => { try { await sentry.initSentry() } catch (e) {} })()
