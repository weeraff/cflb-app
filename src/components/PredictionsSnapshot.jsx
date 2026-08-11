import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function PredictionsSnapshot() {
  const auth = useAuth()
  const [rank, setRank] = useState(null)
  const [points, setPoints] = useState(0)
  const [picksMade, setPicksMade] = useState(0)
  const [fixturesOpen, setFixturesOpen] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.user) return

    supabase
      .from('leaderboard')
      .select('*')
      .order('points', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return
        const index = data.findIndex((entry) => entry.user_id === auth.user.id)
        if (index !== -1) {
          setRank(index + 1)
          setPoints(data[index].points)
        }
      })

    supabase
      .from('fixtures')
      .select('id')
      .eq('featured', true)
      .then(({ data, error }) => {
        if (error || !data) return
        setFixturesOpen(data.length)

        if (data.length) {
          supabase
            .from('predictions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', auth.user.id)
            .in('fixture_id', data.map((f) => f.id))
            .then(({ count }) => {
              setPicksMade(count ?? 0)
              setLoaded(true)
            })
        } else {
          setLoaded(true)
        }
      })
  }, [auth?.user])

  if (!auth?.user) {
    return (
      <section className="dashboard-card">
        <span className="dashboard-card__label">Predictions</span>
        <p className="dashboard-card__body">Sign in to pick this week's scorelines and see where you land on the leaderboard.</p>
        <Link className="button button--small" to="/predictions">Make your picks</Link>
      </section>
    )
  }

  return (
    <section className="dashboard-card">
      <span className="dashboard-card__label">Your Predictions</span>
      <div className="dashboard-card__stats">
        <div>
          <span className="dashboard-card__stat">{rank ? `#${rank}` : '-'}</span>
          <span className="dashboard-card__stat-label">Leaderboard</span>
        </div>
        <div>
          <span className="dashboard-card__stat">{points}</span>
          <span className="dashboard-card__stat-label">Points</span>
        </div>
        {loaded && fixturesOpen > 0 && (
          <div>
            <span className="dashboard-card__stat">{picksMade}/{fixturesOpen}</span>
            <span className="dashboard-card__stat-label">Picks this week</span>
          </div>
        )}
      </div>
      <Link className="button button--small" to="/predictions">
        {loaded && fixturesOpen > 0 && picksMade < fixturesOpen ? 'Finish your picks' : 'View predictions'}
      </Link>
    </section>
  )
}
