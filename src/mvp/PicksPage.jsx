import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import useCountdown from '../hooks/useCountdown'
import { useMvp } from './MvpLayout'
import MatchCard from './MatchCard'
import { loadPending, savePending } from './lib/pendingSignup'
import {
  COMPETITION,
  roundFixtures,
  roundLockTime,
  countPicked,
  allPicked,
  stepScore,
  toggleJoker,
  filterPicksToRound,
  toPredictionRows,
  picksFromPredictions,
  isLockError,
} from './lib/round'

function buzz() {
  try {
    navigator.vibrate?.(15)
  } catch {
    // unsupported (iOS Safari): silently skip
  }
}

export default function PicksPage() {
  const { user, openSignUp, completion } = useMvp()
  const [fixtures, setFixtures] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [draft, setDraft] = useState({ picks: {}, jokerId: null })
  const [saved, setSaved] = useState({ picks: {}, jokerId: null, points: {} })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const loadFixtures = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoadError(null)
    const { data, error } = await supabase.from('fixtures').select('*').eq('featured', true).eq('competition', COMPETITION)
    if (error) {
      setLoadError(error)
      return
    }
    setFixtures(roundFixtures(data ?? []))
  }, [])

  useEffect(() => {
    loadFixtures()
  }, [loadFixtures])

  // Saved picks for this round (signed in), or held picks (signed out).
  useEffect(() => {
    if (!fixtures) return
    if (!user) {
      const pending = loadPending()
      setSaved({ picks: {}, jokerId: null, points: {} })
      if (pending?.picks) setDraft(filterPicksToRound(fixtures, pending.picks, pending.jokerId))
      return
    }
    supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .in('fixture_id', fixtures.map((f) => f.id))
      .then(({ data, error }) => {
        if (error) return
        const next = picksFromPredictions(data ?? [])
        setSaved(next)
        setDraft((d) => (Object.keys(d.picks).length ? d : { picks: next.picks, jokerId: next.jokerId }))
      })
  }, [fixtures, user, completion.version])

  const lockTime = useMemo(() => (fixtures ? roundLockTime(fixtures) : null), [fixtures])
  const countdown = useCountdown(lockTime)
  const locked = fixtures ? fixtures.length === 0 || countdown.locked : false
  const hasSaved = fixtures ? allPicked(fixtures, saved.picks) : false
  const mode = locked ? 'locked' : hasSaved && !editing ? 'saved' : 'edit'
  const roundName = fixtures?.[0]?.round ?? 'This round'
  const picked = fixtures ? countPicked(fixtures, draft.picks) : 0
  const ready = fixtures ? allPicked(fixtures, draft.picks) : false

  function step(fixtureId, side, delta) {
    setNotice(null)
    setDraft((d) => {
      const current = d.picks[fixtureId] ?? { home: null, away: null }
      return { ...d, picks: { ...d.picks, [fixtureId]: { ...current, [side]: stepScore(current[side], delta) } } }
    })
  }

  function joker(fixtureId) {
    buzz()
    setDraft((d) => ({ ...d, jokerId: toggleJoker(d.jokerId, fixtureId) }))
  }

  async function lockIn() {
    if (!ready || saving) return
    if (!user) {
      savePending({ picks: draft.picks, jokerId: draft.jokerId })
      openSignUp('signup')
      return
    }
    setSaving(true)
    setNotice(null)
    const { error } = await supabase
      .from('predictions')
      .upsert(toPredictionRows(user.id, fixtures, draft.picks, draft.jokerId), { onConflict: 'user_id,fixture_id' })
    setSaving(false)
    if (error) {
      setNotice(
        isLockError(error)
          ? { type: 'error', text: 'Picks for this round are locked. Get in early for the next one.' }
          : { type: 'error', text: "Couldn't save your picks. Check your connection and try again.", retry: true },
      )
      if (isLockError(error)) loadFixtures()
      return
    }
    buzz()
    setSaved({ picks: draft.picks, jokerId: draft.jokerId, points: {} })
    setEditing(false)
    setNotice({ type: 'success', text: "You're locked in. Edit any time before the first kickoff." })
  }

  const completionNotice =
    completion.status === 'saving'
      ? { type: 'info', text: 'Saving your picks...' }
      : completion.status === 'error'
        ? { type: 'error', text: "Your account's ready but your picks didn't save.", retry: true, onRetry: completion.retry }
        : completion.status === 'locked'
          ? { type: 'error', text: 'The round locked before your picks saved. Get in early for the next one.' }
          : completion.status === 'done' && completion.joinedLeague
            ? { type: 'success', text: `You're in ${completion.joinedLeague}. Check the Leaderboard tab.` }
            : null

  const shown = completionNotice ?? notice
  const pending = !user ? loadPending() : null

  return (
    <div className={`m-app${mode === 'edit' && fixtures?.length ? ' m-app--with-bar' : ''}`}>
      <header className="m-head">
        <div className="m-head__top">
          <img className="m-head__logo" src="/logo-header.png" alt="Champagne Football Lemonade Banter" />
          {fixtures?.length ? (
            <span className={`m-pill${locked ? ' m-pill--locked' : ''}`}>{locked ? 'Locked' : `⏱ ${countdown.label} to lock`}</span>
          ) : null}
        </div>
        <h1 className="m-head__title">{fixtures?.length ? `${roundName} picks` : 'Picks'}</h1>
        <p className="m-head__sub">
          {mode === 'locked'
            ? 'Picks are in. Points land after each full time.'
            : 'Pick every score. 3 pts exact, 1 pt right result. Joker doubles one game.'}
        </p>
      </header>

      <main className="m-list">
        {pending?.joinName && (
          <div className="m-notice">
            <strong>Join {pending.joinName}</strong>
            Make your picks and create your account to join.
          </div>
        )}

        {shown && (
          <div className={`m-notice m-notice--${shown.type}`} role={shown.type === 'error' ? 'alert' : 'status'}>
            {shown.text}
            {shown.retry && (
              <div>
                <button type="button" className="m-btn m-press" onClick={shown.onRetry ?? lockIn}>
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {loadError && (
          <div className="m-notice m-notice--error" role="alert">
            Couldn't load the fixtures.
            <div>
              <button type="button" className="m-btn m-press" onClick={loadFixtures}>
                Try again
              </button>
            </div>
          </div>
        )}

        {fixtures && fixtures.length === 0 && (
          <div className="m-notice">
            <strong>Next round coming soon</strong>
            Fixtures appear here as soon as they're confirmed.
          </div>
        )}

        {mode === 'saved' && (
          <div className="m-notice">
            <strong>You're locked in</strong>
            Change your mind? You can edit until the first kickoff.
            <div>
              <button
                type="button"
                className="m-btn m-btn--light m-press"
                onClick={() => {
                  setDraft({ picks: saved.picks, jokerId: saved.jokerId })
                  setEditing(true)
                  setNotice(null)
                }}
              >
                Edit picks
              </button>
            </div>
          </div>
        )}

        {fixtures?.map((fixture) => {
          const source = mode === 'edit' ? draft : saved
          return (
            <MatchCard
              key={fixture.id}
              fixture={fixture}
              pick={source.picks[fixture.id]}
              isJoker={source.jokerId === fixture.id}
              mode={mode}
              points={saved.points[fixture.id]}
              onStep={(side, delta) => step(fixture.id, side, delta)}
              onJoker={() => joker(fixture.id)}
            />
          )
        })}
      </main>

      {mode === 'edit' && fixtures?.length > 0 && (
        <div className="m-lockbar m-glass">
          <span className="m-lockbar__count">
            {picked} of {fixtures.length} picked
          </span>
          <button type="button" className="m-btn m-press" disabled={!ready || saving} onClick={lockIn}>
            {saving ? 'Saving...' : 'Lock in picks'}
          </button>
        </div>
      )}
    </div>
  )
}
