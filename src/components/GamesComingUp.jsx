import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderFixtures } from '../lib/placeholderData'

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
      <ul className="results-list">
        {fixtures.map((fixture) => (
          <li key={fixture.id} className="result-row">
            <span className="result-row__round">{fixture.competition}</span>
            <span className="result-row__match">
              <span className="result-row__team">{fixture.home_team}</span>
              <span className="result-row__score">v</span>
              <span className="result-row__team">{fixture.away_team}</span>
            </span>
            <span className="result-row__ground">{formatKickoff(fixture.kickoff_at)}</span>
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
