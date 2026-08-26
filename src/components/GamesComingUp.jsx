import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderFixtures, COMPETITIONS } from '../lib/placeholderData'
import FixtureTeamRow from './FixtureTeamRow'
import { formatKickoff } from '../lib/format'

const COMPETITION_LABELS = {
  'NPL NSW': 'NPL NSW',
  'League One': 'Football NSW League One',
  'League Two': 'Football NSW League Two',
}

export default function GamesComingUp() {
  const [allFixtures, setAllFixtures] = useState(
    placeholderFixtures.filter((f) => f.status === 'scheduled'),
  )
  const [activeCompetition, setActiveCompetition] = useState(COMPETITIONS[0])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('fixtures')
      .select('*')
      .eq('status', 'scheduled')
      .order('kickoff_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setAllFixtures(data)
      })
  }, [])

  const fixtures = allFixtures.filter((f) => f.competition === activeCompetition)

  return (
    <section>
      <h2 className="results-heading">Games Coming Up</h2>

      <label className="competition-select-label" htmlFor="games-coming-up-competition">
        Competition
      </label>
      <select
        id="games-coming-up-competition"
        className="competition-select"
        value={activeCompetition}
        onChange={(e) => setActiveCompetition(e.target.value)}
      >
        {COMPETITIONS.map((name) => (
          <option key={name} value={name}>
            {COMPETITION_LABELS[name] ?? name}
          </option>
        ))}
      </select>

      {fixtures.length === 0 && <p className="auth-note">No fixtures scheduled this week.</p>}

      <ul className="mini-fixture-list">
        {fixtures.map((fixture) => (
          <li key={fixture.id} className="mini-fixture">
            <div className="mini-fixture__meta">
              <span>{fixture.competition}</span>
              <span>{formatKickoff(fixture.kickoff_at)}</span>
            </div>
            <FixtureTeamRow tag="div" className="mini-fixture__team" logo={fixture.home_logo} name={fixture.home_team} />
            <FixtureTeamRow tag="div" className="mini-fixture__team" logo={fixture.away_logo} name={fixture.away_team} />
            {fixture.competition === 'NPL NSW' && (
              <span className="mini-fixture__stream-note">
                {fixture.stream_status === 'scheduled' ? 'Live stream starting soon' : 'Stream starts at kickoff'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
