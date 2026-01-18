import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import Footer from './components/Footer'
import './styles.css'
import './styles/footer.css'

function Root() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <App />
      </div>
      <Footer />
    </div>
  )
}
  // For debugging rotation/top3 summaries during development, enable TOP3 logs
  try {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('debugPlacement')) {
      localStorage.setItem('debugPlacement', '1')
      console.info('[debugPlacement] defaulted to TOP3 for rotation diagnostics')
    }
  } catch (e) {
    // ignore
  }

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
)
