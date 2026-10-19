import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useMyProfile from '../hooks/useMyProfile'
import useCompleteSignup from './useCompleteSignup'
import SignUpSheet from './SignUpSheet'
import ConsentPrompt from './ConsentPrompt'
import ErrorBoundary from './ErrorBoundary'
import { loadPending } from './lib/pendingSignup'
import './mvp.css'

const MvpContext = createContext(null)

export function useMvp() {
  return useContext(MvpContext)
}

function PicksIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 3 2-1 4h-4l-1-4z" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4" />
    </svg>
  )
}

export default function MvpLayout() {
  const auth = useAuth()
  const user = auth?.user ?? null
  const { profile, setProfile, checked } = useMyProfile(user?.id)
  const completion = useCompleteSignup(user, checked, setProfile)
  const [sheet, setSheet] = useState({ open: false, mode: 'signup' })

  // Light theme for the MVP without touching the old app's global CSS.
  useEffect(() => {
    document.body.classList.add('m-body')
    const meta = document.querySelector('meta[name="theme-color"]')
    const previous = meta?.getAttribute('content')
    meta?.setAttribute('content', '#1d5a43')
    return () => {
      document.body.classList.remove('m-body')
      if (previous) meta?.setAttribute('content', previous)
    }
  }, [])

  // Signing in from the sheet closes it; completion takes over from there.
  useEffect(() => {
    if (user) setSheet((s) => (s.open ? { ...s, open: false } : s))
  }, [user])

  const openSignUp = useCallback((mode = 'signup') => setSheet({ open: true, mode }), [])

  const needsConsent =
    Boolean(user) && checked && profile != null && profile.marketing_opt_in == null && !loadPending() && completion.status !== 'saving'

  const value = useMemo(
    () => ({ user, profile, profileChecked: checked, setProfile, openSignUp, completion, signOut: auth?.signOut }),
    [user, profile, checked, setProfile, openSignUp, completion, auth?.signOut],
  )

  return (
    <MvpContext.Provider value={value}>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>

      <nav className="m-tabs m-glass" aria-label="Main">
        <NavLink to="/" end className="m-press">
          <PicksIcon />
          Picks
        </NavLink>
        <NavLink to="/leaderboard" className="m-press">
          <TableIcon />
          Leaderboard
        </NavLink>
      </nav>

      <SignUpSheet
        open={sheet.open}
        mode={sheet.mode}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        onModeChange={(mode) => setSheet((s) => ({ ...s, mode }))}
      />

      {needsConsent && <ConsentPrompt userId={user.id} onSaved={setProfile} />}
    </MvpContext.Provider>
  )
}
