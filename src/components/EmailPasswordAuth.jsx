import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { setKeepSignedIn } from '../lib/supabaseClient'

export default function EmailPasswordAuth() {
  const auth = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedInChecked] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  function switchMode(nextMode) {
    setMode(nextMode)
    setNotice(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password || !auth) return

    setBusy(true)
    setNotice(null)
    setKeepSignedIn(keepSignedIn)

    const { error } = mode === 'signup'
      ? await auth.signUpWithPassword(email, password)
      : await auth.signInWithPassword(email, password)

    setBusy(false)

    if (error) {
      setNotice({ type: 'error', text: error.message })
      return
    }

    if (mode === 'signup') {
      setNotice({ type: 'success', text: 'Account created, check your inbox to confirm your email.' })
    }
  }

  return (
    <div className="auth-email-block">
      <div className="auth-mode-toggle">
        <button
          type="button"
          className={`auth-mode-toggle__option${mode === 'signin' ? ' auth-mode-toggle__option--active' : ''}`}
          onClick={() => switchMode('signin')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`auth-mode-toggle__option${mode === 'signup' ? ' auth-mode-toggle__option--active' : ''}`}
          onClick={() => switchMode('signup')}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-email-form">
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={6}
        />
        <label className="auth-keep-signed-in">
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(e) => setKeepSignedInChecked(e.target.checked)}
          />
          Keep me signed in
        </label>
        <button className="button button--secondary" type="submit" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {notice && <p className={`auth-note${notice.type === 'error' ? ' auth-note--error' : ''}`}>{notice.text}</p>}
    </div>
  )
}
