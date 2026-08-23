import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'cflb-install-dismissed'

// iOS never fires beforeinstallprompt and has no programmatic install —
// Add to Home Screen only happens through the Share sheet, so that path
// gets static instructions instead of a button. It's also the only path
// that matters for push: Safari blocks Web Push entirely outside an
// installed (home-screen) PWA, so this prompt is what actually unlocks
// notifications working on iPhone, not just a nicer icon.
function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    function handleBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    function handleInstalled() {
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (installed || dismissed) return null
  if (!isIos() && !deferredPrompt) return null

  return (
    <div className="notice-bar install-prompt">
      {isIos() ? (
        <p className="notice-bar__text">
          Add CFLB to your Home Screen to get live score and pick notifications: tap <strong>Share ⬆</strong>, then <strong>Add to Home Screen</strong>.
        </p>
      ) : (
        <p className="notice-bar__text">Install CFLB for a full-screen app and score notifications.</p>
      )}
      <div className="install-prompt__actions">
        {!isIos() && (
          <button type="button" className="notice-bar__action" onClick={install}>
            Install
          </button>
        )}
        <button type="button" className="install-prompt__dismiss" onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  )
}
