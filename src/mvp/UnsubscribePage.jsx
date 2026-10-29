import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

// Landing page for the unsubscribe link in reminder emails. Works signed
// out: the signed token in the link is what authorises the change.
export default function UnsubscribePage() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('working')

  useEffect(() => {
    const u = params.get('u')
    const t = params.get('t')
    if (!u || !t) {
      setStatus('invalid')
      return
    }
    supabase.functions
      .invoke('unsubscribe', { body: { u, t } })
      .then(({ data, error }) => setStatus(!error && data?.ok ? 'done' : 'invalid'))
  }, [params])

  return (
    <div className="m-app">
      <header className="m-head">
        <div className="m-head__top">
          <img className="m-head__logo" src="/logo-header.png" alt="Champagne Football Lemonade Banter" />
        </div>
        <h1 className="m-head__title">{status === 'done' ? "You're unsubscribed" : status === 'invalid' ? 'That link didn’t work' : 'One sec...'}</h1>
      </header>
      <main className="m-list">
        <div className="m-notice" role="status">
          {status === 'done' && "No more reminder emails. You're still in the comp, and your picks and points are safe."}
          {status === 'invalid' && 'Try the link from your latest email again, or email info@champagnefootball.com.au and we’ll sort it.'}
          {status === 'working' && 'Updating your email settings.'}
        </div>
        <Link to="/" className="m-btn m-btn--block m-press">
          Back to picks
        </Link>
      </main>
    </div>
  )
}
