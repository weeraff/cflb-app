import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadPending, clearPending } from './lib/pendingSignup'
import { consentFields } from './lib/consent'
import { cleanName, isNameTakenError, nameWithSuffix } from './lib/names'
import { COMPETITION, roundFixtures, filterPicksToRound, allPicked, toPredictionRows, isLockError } from './lib/round'

// Until a player chooses a name, show only their first name. Google hands
// over the full name, which shouldn't go public without them choosing it.
function fallbackName(user) {
  const meta = user.user_metadata ?? {}
  const first = (meta.given_name || meta.full_name || meta.name || '').trim().split(/\s+/)[0]
  return (first || user.email?.split('@')[0] || 'Player').slice(0, 40)
}

// Runs once a player who started signed out has an account: creates their
// profile (with the consent they chose), joins any league they were
// invited to, and saves the picks they made before signing up.
//
// status: idle | saving | done | locked | error. `version` bumps on every
// successful run so pages can reload their data.
export default function useCompleteSignup(user, profileChecked, setProfile) {
  const [state, setState] = useState({ status: 'idle', error: null, joinedLeague: null, version: 0, needsName: false })
  const running = useRef(false)

  const run = useCallback(async () => {
    const pending = loadPending()
    if (!user || !profileChecked || !pending || running.current) return
    running.current = true
    setState((s) => ({ ...s, status: 'saving', error: null }))

    try {
      // Look it up fresh: right after sign-in the cached profile can still
      // be the signed-out "none" from a moment ago.
      const { data: existing, error: lookupError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (lookupError) throw lookupError
      const profile = existing

      // Google sign-ups never typed a name, so ask them to pick one.
      let needsName = false
      if (!profile) {
        needsName = !pending.displayName
        const wanted = cleanName(pending.displayName || fallbackName(user))
        const consent = typeof pending.optIn === 'boolean' ? consentFields(pending.optIn) : {}
        let created = null
        for (let attempt = 0; attempt < 4 && !created; attempt++) {
          const display_name = attempt === 0 ? wanted : nameWithSuffix(wanted)
          const { data, error } = await supabase.from('profiles').insert({ id: user.id, display_name, ...consent }).select().single()
          if (!error) created = data
          else if (isNameTakenError(error)) needsName = true
          else throw error
        }
        if (!created) throw new Error('Could not find a free leaderboard name')
        setProfile(created)
      } else if (profile.marketing_opt_in == null && typeof pending.optIn === 'boolean') {
        const { data, error } = await supabase
          .from('profiles')
          .update(consentFields(pending.optIn))
          .eq('id', user.id)
          .select()
          .single()
        if (error) throw error
        setProfile(data)
      }

      let joinedLeague = null
      if (pending.joinCode) {
        const { data, error } = await supabase.rpc('join_league_by_code', { p_code: pending.joinCode })
        if (!error) joinedLeague = data?.[0]?.league_name ?? null
      }

      if (pending.picks && Object.keys(pending.picks).length > 0) {
        const { data: fixtures, error: fixturesError } = await supabase
          .from('fixtures')
          .select('*')
          .eq('featured', true)
          .eq('competition', COMPETITION)
        if (fixturesError) throw fixturesError
        const round = roundFixtures(fixtures ?? [])
        const { picks, jokerId } = filterPicksToRound(round, pending.picks, pending.jokerId)
        if (allPicked(round, picks)) {
          const { error } = await supabase
            .from('predictions')
            .upsert(toPredictionRows(user.id, round, picks, jokerId), { onConflict: 'user_id,fixture_id' })
          if (error) throw error
        }
      }

      clearPending()
      setState((s) => ({ status: 'done', error: null, joinedLeague, version: s.version + 1, needsName }))
    } catch (error) {
      if (isLockError(error)) {
        clearPending()
        setState((s) => ({ ...s, status: 'locked', error, version: s.version + 1 }))
      } else {
        setState((s) => ({ ...s, status: 'error', error }))
      }
    } finally {
      running.current = false
    }
  }, [user, profileChecked, setProfile])

  useEffect(() => {
    run()
    // Only re-run when the signed-in user or their profile lookup changes,
    // not on every profile edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileChecked])

  const nameChosen = useCallback(() => setState((s) => ({ ...s, needsName: false })), [])

  return { ...state, retry: run, nameChosen }
}
