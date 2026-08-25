// src/components/OnboardingFlow.jsx
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderStandings } from '../lib/placeholderData'

const LEAGUES = ['NPL NSW', 'League One', 'League Two']

const AGE_GROUPS = [
  { value: 'first_grade', label: 'First Grade' },
  { value: '20s', label: "20's" },
  { value: 'youth', label: 'Youth' },
]

function OptionButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      className={`onboarding__option${selected ? ' onboarding__option--selected' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function OnboardingFlow({ userId, onComplete }) {
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState(null)
  const [league, setLeague] = useState(null)
  const [leagueOther, setLeagueOther] = useState('')
  const [team, setTeam] = useState('')
  const [teamOther, setTeamOther] = useState('')
  const [ageGroup, setAgeGroup] = useState(null)
  const [marketingOptIn, setMarketingOptIn] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Supabase not configured at all (preview/dev environment) is a legitimate
  // case where showing placeholder clubs is fine. A genuine fetch failure
  // (network error, RLS, empty result) against a *configured* Supabase is
  // different: standingsFetchFailed drives free-text fallback so we never
  // write a stale placeholder club into someone's profile.
  const [standingsRows, setStandingsRows] = useState(isSupabaseConfigured ? [] : placeholderStandings)
  const [standingsFetchFailed, setStandingsFetchFailed] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('standings')
      .select('competition, team')
      .order('competition', { ascending: true })
      .order('team', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!fetchError && data?.length) {
          setStandingsRows(data)
        } else {
          setStandingsFetchFailed(true)
        }
      })
  }, [])

  // True only for "Supabase is configured but the live fetch actually
  // failed". Skip the standings-backed dropdowns entirely and fall back to
  // free-text league/team inputs so a fetch failure can never surface stale
  // placeholder clubs as if they were real options.
  const useFreeText = isSupabaseConfigured && standingsFetchFailed

  const leagues = [...new Set(standingsRows.map((row) => row.competition))]
  const effectiveLeague = league === 'other' ? null : league
  const teamsInLeague = effectiveLeague
    ? standingsRows.filter((row) => row.competition === effectiveLeague).map((row) => row.team)
    : []

  function nextStep() {
    setError('')
    setStep((s) => s + 1)
  }

  function handleNameSubmit(e) {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Enter a name for the leaderboard.')
      return
    }
    nextStep()
  }

  function handleRoleSelect(value) {
    setRole(value)
    setStep(value === 'fan' ? 2 : 2) // both paths go to step 2 next; step content branches on role
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    const resolvedLeague = role === 'fan' ? null : ((useFreeText || league === 'other') ? leagueOther.trim() : league)
    const resolvedTeam = (role === 'fan' && (useFreeText || team === '__other'))
      ? teamOther.trim()
      : team.trim()

    if (!resolvedTeam) {
      setError('Pick or enter a team.')
      setSubmitting(false)
      return
    }

    const { data, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        display_name: displayName.trim(),
        role,
        league: resolvedLeague,
        followed_team: resolvedTeam,
        age_group: role === 'fan' ? null : ageGroup,
        marketing_opt_in: marketingOptIn,
      })
      .select()
      .single()

    setSubmitting(false)

    if (upsertError) {
      setError('Could not save your profile, try again.')
      return
    }

    onComplete(data)
  }

  return (
    <section className="onboarding">
      {step === 0 && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">What's your name?</h1>
          <form onSubmit={handleNameSubmit} className="onboarding__form">
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              autoFocus
            />
            <button type="submit" className="button">Next</button>
          </form>
        </div>
      )}

      {step === 1 && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Are you a...</h1>
          <div className="onboarding__options">
            <OptionButton selected={role === 'player'} onClick={() => handleRoleSelect('player')}>Player</OptionButton>
            <OptionButton selected={role === 'coach'} onClick={() => handleRoleSelect('coach')}>Coach</OptionButton>
            <OptionButton selected={role === 'fan'} onClick={() => handleRoleSelect('fan')}>Fan</OptionButton>
          </div>
        </div>
      )}

      {step === 2 && role !== 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Which league?</h1>
          <div className="onboarding__options">
            {LEAGUES.map((name) => (
              <OptionButton key={name} selected={league === name} onClick={() => { setLeague(name); setTeam('') }}>{name}</OptionButton>
            ))}
          </div>
          <button
            type="button"
            className="button"
            disabled={!league}
            onClick={nextStep}
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && role === 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Which team do you follow?</h1>
          {(useFreeText || team === '__other') ? (
            <input
              type="text"
              placeholder="Your team"
              value={teamOther}
              onChange={(e) => setTeamOther(e.target.value)}
              className="onboarding__text-input"
              autoFocus
            />
          ) : (
            <select className="onboarding__select" value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">Choose a team</option>
              {leagues.map((name) => (
                <optgroup key={name} label={name}>
                  {standingsRows.filter((row) => row.competition === name).map((row) => (
                    <option key={row.team} value={row.team}>{row.team}</option>
                  ))}
                </optgroup>
              ))}
              <option value="__other">Other</option>
            </select>
          )}
          {error && <p className="auth-note auth-note--error">{error}</p>}
          <button
            type="button"
            className="button"
            disabled={(useFreeText || team === '__other') ? !teamOther.trim() : !team}
            onClick={() => { setError(''); nextStep() }}
          >
            Next
          </button>
        </div>
      )}

      {step === 3 && role !== 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Which team?</h1>
          {(useFreeText || league === 'other') ? (
            <input
              type="text"
              placeholder="Your team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="onboarding__text-input"
            />
          ) : (
            <select className="onboarding__select" value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">Choose a team</option>
              {teamsInLeague.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
          <button type="button" className="button" disabled={!team.trim()} onClick={nextStep}>Next</button>
        </div>
      )}

      {step === 3 && role === 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Keep you posted?</h1>
          <label className="onboarding__checkbox">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
            Email me when a new episode drops
          </label>
          {error && <p className="auth-note auth-note--error">{error}</p>}
          <button type="button" className="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Saving...' : 'Done'}
          </button>
        </div>
      )}

      {step === 4 && role !== 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Age group?</h1>
          <div className="onboarding__options">
            {AGE_GROUPS.map(({ value, label }) => (
              <OptionButton key={value} selected={ageGroup === value} onClick={() => setAgeGroup(value)}>{label}</OptionButton>
            ))}
          </div>
          <button type="button" className="button" disabled={!ageGroup} onClick={nextStep}>Next</button>
        </div>
      )}

      {step === 5 && role !== 'fan' && (
        <div className="onboarding__step">
          <h1 className="onboarding__title">Keep you posted?</h1>
          <label className="onboarding__checkbox">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
            Email me when a new episode drops
          </label>
          {error && <p className="auth-note auth-note--error">{error}</p>}
          <button type="button" className="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Saving...' : 'Done'}
          </button>
        </div>
      )}
    </section>
  )
}
