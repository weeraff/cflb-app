import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderStandings } from '../lib/placeholderData'

export default function TablePage() {
  const [standings, setStandings] = useState(placeholderStandings)
  const [usingPlaceholder, setUsingPlaceholder] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('standings')
      .select('*')
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setStandings(data)
          setUsingPlaceholder(false)
        }
      })
  }, [])

  return (
    <section>
      <h1>Championship Table</h1>
      <p className="section-subtitle">
        Sourced from Football Australia.
        {usingPlaceholder && ' (showing sample standings until the source is connected)'}
      </p>

      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.team} className={zoneClass(row.position, standings.length)}>
              <td>{row.position}</td>
              <td>{row.team}</td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{row.gd}</td>
              <td><strong>{row.points}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="standings-legend">
        <span><span className="dot dot--promotion" />Promotion</span>
        <span><span className="dot dot--relegation" />Relegation</span>
      </div>
    </section>
  )
}

function zoneClass(position, total) {
  if (total < 4) return ''
  if (position <= 2) return 'zone--promotion'
  if (position > total - 2) return 'zone--relegation'
  return ''
}
