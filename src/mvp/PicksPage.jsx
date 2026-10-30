import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import useCountdown from '../hooks/useCountdown'
import { useMvp } from './MvpLayout'
import AccountLine from './AccountLine'
import { PrizeLine, RulesCard, StartNotice } from './Rules'
import MatchCard from './MatchCard'
import { loadPending, savePending } from './lib/pendingSignup'
import {
  COMPETITION,
  roundFixtures,
  openFixtures,
  nextKickoff,
  hasKickedOff,
  isRoundLocked,
  isJokerLocked,
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
  // Re-checked every 15 seconds so games lock on screen as they kick off.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])

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

  // Each game locks at its own kickoff, so only games still to start can
  // be picked; ones already under way show the saved pick and result.
  const open = useMemo(() => (fixtures ? openFixtures(fixtures, now) : []), [fixtures, now])
  const nextMs = fixtures ? nextKickoff(fixtures, now)?.getTime() : undefined
  const next = useMemo(() => (nextMs ? new Date(nextMs) : null), [nextMs])
  const countdown = useCountdown(next)
  const locked = fixtures ? isRoundLocked(fixtures, now) : false
  const started = fixtures ? open.length < fixtures.length : false
  const jokerFrozen = fixtures ? isJokerLocked(fixtures, saved.jokerId, now) : false
  const hasSaved = allPicked(open, saved.picks)
  const mode = locked ? 'locked' : hasSaved && !editing ? 'saved' : 'edit'
  const roundName = fixtures?.[0]?.round ?? 'This round'
  const picked = countPicked(open, draft.picks)
  const ready = allPicked(open, draft.picks)

  function step(fixtureId, side, delta) {
    setNotice(null)
    setDraft((d) => {
      const current = d.picks[fixtureId] ?? { home: null, away: null }
      return { ...d, picks: { ...d.picks, [fixtureId]: { ...current, [side]: stepScore(current[side], delta) } } }
    })
  }

  function joker(fixtureId) {
    if (jokerFrozen) return
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
      .upsert(toPredictionRows(user.id, open, draft.picks, jokerFrozen ? saved.jokerId : draft.jokerId), { onConflict: 'user_id,fixture_id' })
    setSaving(false)
    if (error) {
      setNotice(
        isLockError(error)
          ? { type: 'error', text: "A game just kicked off, so that one's locked. Check your other picks and lock in again." }
          : { type: 'error', text: "Couldn't save your picks. Check your connection and try again.", retry: true },
      )
      if (isLockError(error)) {
        setNow(new Date())
        loadFixtures()
      }
      return
    }
    buzz()
    setSaved((s) => ({ picks: { ...s.picks, ...draft.picks }, jokerId: jokerFrozen ? s.jokerId : draft.jokerId, points: s.points }))
    setEditing(false)
    setNotice({ type: 'success', text: "You're locked in. You can change any game until it kicks off." })
  }

  const completionNotice =
    completion.status === 'saving'
      ? { type: 'info', text: 'Saving your picks...' }
      : completion.status === 'error'
        ? { type: 'error', text: "Your account's ready but your picks didn't save.", retry: true, onRetry: completion.retry }
        : completion.status === 'locked'
          ? { type: 'error', text: 'A game kicked off before your picks saved. Check your picks and lock in again.' }
          : completion.status === 'done' && completion.joinedLeague
            ? { type: 'success', text: `You're in ${completion.joinedLeague}. Check the Leaderboard tab.` }
            : null

  const shown = completionNotice ?? notice
  const pending = !user ? loadPending() : null

  return (
    <div className={`m-app${mode === 'edit' && open.length ? ' m-app--with-bar' : ''}`}>
      <header className="m-head">
        <div className="m-head__top">
          <img className="m-head__logo" src="/logo-header.png" alt="Champagne Football Lemonade Banter" />
          {fixtures?.length ? (
            <span className={`m-pill${locked ? ' m-pill--locked' : ''}`}>
              {locked ? 'Locked' : `⏱ ${countdown.label} to ${started ? 'next kickoff' : 'kickoff'}`}
            </span>
          ) : null}
        </div>
        <h1 className="m-head__title">{fixtures?.length ? `${roundName} picks` : 'Picks'}</h1>
        <PrizeLine />
        <AccountLine />
      </header>

      <main className="m-list">
        {fixtures?.length > 0 && <StartNotice roundName={roundName} locked={locked} />}

        <RulesCard />

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
            Change your mind? You can edit any game until it kicks off.
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
          const cardMode = hasKickedOff(fixture, now) ? 'locked' : mode
          const source = cardMode === 'edit' ? draft : saved
          return (
            <MatchCard
              key={fixture.id}
              fixture={fixture}
              pick={source.picks[fixture.id]}
              isJoker={source.jokerId === fixture.id}
              mode={cardMode}
              points={saved.points[fixture.id]}
              jokerUsed={jokerFrozen}
              onStep={(side, delta) => step(fixture.id, side, delta)}
              onJoker={() => joker(fixture.id)}
            />
          )
        })}
      </main>

      {mode === 'edit' && open.length > 0 && (
        <div className="m-lockbar m-glass">
          <span className="m-lockbar__count">
            {picked} of {open.length} picked
          </span>
          <button type="button" className="m-btn m-press" disabled={!ready || saving} onClick={lockIn}>
            {saving ? 'Saving...' : 'Lock in picks'}
          </button>
        </div>
      )}
    </div>
  )
}
