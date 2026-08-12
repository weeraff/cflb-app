import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import TeamCrest from './TeamCrest'

export default function MatchdayBanner() {
  const [fixtures, setFixtures] = useState([])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    supabase
      .from('fixtures')
      .select('*')
      .gte('kickoff_at', startOfToday.toISOString())
      .lt('kickoff_at', startOfTomorrow.toISOString())
      .order('kickoff_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data?.length) setFixtures(data)
      })
  }, [])

  if (fixtures.length === 0) return null

  return (
    <section className="matchday-banner">
      <h2 className="results-heading">Matchday</h2>
      <ul className="matchday-banner__list">
        {fixtures.map((fixture) => (
          <li key={fixture.id} className="matchday-fixture">
            <span className="matchday-fixture__competition">{fixture.competition}</span>
            <span className="matchday-fixture__match">
              <span className="matchday-fixture__team">
                <TeamCrest src={fixture.home_logo} name={fixture.home_team} />
                {fixture.home_team}
              </span>
              <MatchdayStatus fixture={fixture} />
              <span className="matchday-fixture__team">
                <TeamCrest src={fixture.away_logo} name={fixture.away_team} />
                {fixture.away_team}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function MatchdayStatus({ fixture }) {
  if (fixture.status === 'completed') {
    return <span className="matchday-fixture__score">{fixture.home_score} - {fixture.away_score}</span>
  }

  if (fixture.status === 'locked') {
    return <span className="matchday-fixture__live">In progress</span>
  }

  return (
    <span className="matchday-fixture__kickoff">
      {new Date(fixture.kickoff_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
    </span>
  )
}
