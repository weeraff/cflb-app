import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Drawer } from 'vaul'
import { supabase, setKeepSignedIn } from '../lib/supabaseClient'
import { savePending } from './lib/pendingSignup'
import { CONSENT_TEXT } from './lib/consent'
import { isInAppBrowser } from './lib/inAppBrowser'
import { cleanName, NAME_TAKEN_MESSAGE } from './lib/names'

function friendlyAuthError(error) {
  const msg = error?.message ?? ''
  if (/already registered|already exists/i.test(msg)) return 'That email already has an account. Sign in instead.'
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match. Try again."
  if (/password/i.test(msg) && /6/.test(msg)) return 'Password needs at least 6 characters.'
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first. Check your inbox for the link.'
  return msg || 'Something went wrong. Try again.'
}

export default function SignUpSheet({ open, mode, onOpenChange, onModeChange }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [optIn, setOptIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const inApp = isInAppBrowser()
  const isSignup = mode === 'signup'

  async function handleGoogle() {
    setMessage(null)
    if (isSignup) savePending({ optIn })
    setKeepSignedIn(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        // Always show Google's account chooser. Otherwise a phone with one
        // Google account signed in skips straight to it, and there's no way
        // to use a different one.
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) setMessage({ type: 'error', text: friendlyAuthError(error) })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage(null)
    setKeepSignedIn(true)

    if (isSignup) {
      const name = cleanName(displayName)
      if (name.length < 2) {
        setBusy(false)
        setMessage({ type: 'error', text: 'Your leaderboard name needs at least 2 characters.' })
        return
      }
      const { data: available, error: checkError } = await supabase.rpc('display_name_available', { p_name: name })
      if (!checkError && available === false) {
        setBusy(false)
        setMessage({ type: 'error', text: NAME_TAKEN_MESSAGE })
        return
      }
      savePending({ displayName: name, optIn })
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name } },
      })
      setBusy(false)
      if (error) {
        setMessage({ type: 'error', text: friendlyAuthError(error) })
        return
      }
      if (!data.session) {
        setMessage({ type: 'info', text: 'Nearly there. Tap the link we just emailed you and your picks will save. Open it on this phone.' })
      }
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setMessage({ type: 'error', text: friendlyAuthError(error) })
  }

  const google = (
    <button type="button" className="m-btn m-btn--google m-btn--block m-press" onClick={handleGoogle}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
        <path fill="#FBBC05" d="M10.6 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
      </svg>
      Continue with Google
    </button>
  )

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="m-sheet-overlay" />
        <Drawer.Content className="m-sheet" aria-describedby="m-sheet-desc">
          <div className="m-sheet__handle" />
          <div className="m-sheet__body">
            <Drawer.Title className="m-sheet__title">{isSignup ? 'Save your picks' : 'Welcome back'}</Drawer.Title>
            <Drawer.Description id="m-sheet-desc" className="m-sheet__desc">
              {isSignup ? "It's free. Create your account to lock them in and get on the leaderboard." : 'Sign in to see and lock in your picks.'}
            </Drawer.Description>

            {!inApp && (
              <>
                {google}
                <div className="m-divider">or with email</div>
              </>
            )}

            <form className="m-form" onSubmit={handleSubmit}>
              {isSignup && (
                <label className="m-field">
                  Your name on the leaderboard
                  <input className="m-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required autoComplete="nickname" />
                </label>
              )}
              <label className="m-field">
                Email
                <input className="m-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
              </label>
              <label className="m-field">
                Password
                <input
                  className="m-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
              </label>

              {isSignup && (
                <label className="m-check">
                  <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
                  {CONSENT_TEXT}
                </label>
              )}

              {message && <p className={`m-form-msg m-form-msg--${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}

              {isSignup && (
                <p className="m-form-msg m-form-msg--info">
                  By creating an account you agree to the{' '}
                  <Link to="/terms" onClick={() => onOpenChange(false)}>
                    competition terms
                  </Link>
                  . You must be 18 or over.
                </p>
              )}

              <button type="submit" className="m-btn m-btn--block m-press" disabled={busy}>
                {busy ? 'One sec...' : isSignup ? 'Create account and lock in' : 'Sign in and lock in'}
              </button>
            </form>

            {inApp && (
              <>
                <div className="m-divider">or</div>
                {google}
                <p className="m-form-msg m-form-msg--info" style={{ marginTop: '0.5rem' }}>
                  Google sign-in may not work inside Instagram. Use email, or open this page in your browser.
                </p>
              </>
            )}

            <p className="m-switch">
              {isSignup ? 'Already playing?' : 'New here?'}
              <button type="button" onClick={() => { setMessage(null); onModeChange(isSignup ? 'signin' : 'signup') }}>
                {isSignup ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
