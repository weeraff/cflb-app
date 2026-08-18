import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderFixtures } from '../lib/placeholderData'
import FixtureTeamRow from './FixtureTeamRow'
import { formatKickoff } from '../lib/format'

export default function GamesComingUp() {
  const [fixtures, setFixtures] = useState(
    placeholderFixtures.filter((f) => f.status === 'scheduled').slice(0, 5),
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('fixtures')
      .select('*')
      .eq('status', 'scheduled')
      .order('kickoff_at', { ascending: true })
      .limit(5)
      .then(({ data, error }) => {
        if (!error && data) setFixtures(data)
      })
  }, [])

  if (fixtures.length === 0) return null

  return (
    <section>
      <h2 className="results-heading">Games Coming Up</h2>
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
