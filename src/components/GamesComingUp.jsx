import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderFixtures } from '../lib/placeholderData'
import TeamCrest from './TeamCrest'

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
            <div className="mini-fixture__team">
              <TeamCrest src={fixture.home_logo} name={fixture.home_team} />
              <span>{fixture.home_team}</span>
            </div>
            <div className="mini-fixture__team">
              <TeamCrest src={fixture.away_logo} name={fixture.away_team} />
              <span>{fixture.away_team}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function formatKickoff(iso) {
  return new Date(iso).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
