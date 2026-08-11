import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { pushSupported, subscribeToPush } from '../lib/pushNotifications'

export default function NotificationOptIn() {
  const auth = useAuth()
  const [permission, setPermission] = useState(
    pushSupported ? Notification.permission : 'unsupported',
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!pushSupported) return
    setPermission(Notification.permission)
  }, [])

  if (!auth?.user || permission !== 'default') return null

  async function enable() {
    setBusy(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') await subscribeToPush(auth.user.id)
    } catch {
      // User dismissed the browser prompt or denied it, nothing to do.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="notice-bar">
      <p className="notice-bar__text">Get a nudge when a new episode drops or a big result comes in.</p>
      <button className="notice-bar__action" onClick={enable} disabled={busy}>
        {busy ? 'Enabling...' : 'Turn on notifications'}
      </button>
    </div>
  )
}
