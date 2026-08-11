import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import ShareRankButton from './ShareRankButton'

export default function PredictionsSnapshot() {
  const auth = useAuth()
  const [rank, setRank] = useState(null)
  const [points, setPoints] = useState(0)
  const [displayName, setDisplayName] = useState('')
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
          setDisplayName(data[index].display_name)
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
      <section className="rank-panel rank-panel--empty">
        <span className="rank-panel__ordinal rank-panel__ordinal--ghost">?</span>
        <div className="rank-panel__meta">
          <p className="rank-panel__prompt">Sign in and pick this week's scorelines to see where you land on the leaderboard.</p>
          <Link className="button button--small" to="/predictions">Make your picks</Link>
        </div>
      </section>
    )
  }

  if (!rank) {
    return (
      <section className="rank-panel rank-panel--empty">
        <span className="rank-panel__ordinal rank-panel__ordinal--ghost">?</span>
        <div className="rank-panel__meta">
          <p className="rank-panel__prompt">Make a pick to enter the leaderboard.</p>
          <Link className="button button--small" to="/predictions">Make your picks</Link>
        </div>
      </section>
    )
  }

  return (
    <section className={`rank-panel${rank === 1 ? ' rank-panel--gold' : ''}`}>
      <div className="rank-panel__main">
        <span className="rank-panel__ordinal">
          {rank}
          <sup className="rank-panel__suffix">{ordinalSuffix(rank)}</sup>
        </span>
        <div className="rank-panel__meta">
          <span className="rank-panel__points">{points} pts</span>
          {loaded && fixturesOpen > 0 && (
            <span className="rank-panel__picks">{picksMade}/{fixturesOpen} picks this week</span>
          )}
        </div>
      </div>
      <div className="dashboard-card__actions">
        <Link className="button button--small" to="/predictions">
          {loaded && fixturesOpen > 0 && picksMade < fixturesOpen ? 'Finish your picks' : 'View predictions'}
        </Link>
        <ShareRankButton displayName={displayName} rank={rank} points={points} />
      </div>
    </section>
  )
}

function ordinalSuffix(n) {
  const j = n % 10
  const k = n % 100
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}
