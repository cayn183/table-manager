import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import UTF8Provider from './components/shared/UTF8Provider'
import './styles.css'
import './styles/footer.css'
import './styles/tablet.css'
import './styles/mobile.css'
import sentry from './sentryClient'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <UTF8Provider>
          <AuthProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </AuthProvider>
        </UTF8Provider>
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>
)

// initialise Sentry in the browser if configured
;(async () => { try { await sentry.initSentry() } catch (e) {} })()
