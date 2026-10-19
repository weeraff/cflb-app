import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './lib/pushNotifications.js'

registerServiceWorker()

// After a deploy, a tab opened on the previous version asks for page files
// that no longer exist, and Vercel answers with index.html, so the lazy
// import fails and the screen goes blank. Reload once to pick up the new
// version. The timestamp guard stops a reload loop if something is
// genuinely broken.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'cflb-reloaded-for-update'
  const last = Number(sessionStorage.getItem(KEY) || 0)
  if (Date.now() - last < 10000) return
  sessionStorage.setItem(KEY, String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
