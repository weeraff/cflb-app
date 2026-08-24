import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import useCountdown from '../hooks/useCountdown'
import { SPONSORS_ENABLED } from '../lib/featureFlags'
import { computePredictionStats } from '../lib/predictionStats'

function CountdownLockCard({ lockTime, submittedAll, hasFixtures, onCta }) {
  const { locked, label, diffMs } = useCountdown(lockTime)
  const within24h = diffMs != null && diffMs <= 24 * 60 * 60 * 1000

  let ctaText = 'Submit picks'
  let ctaDisabled = false

  if (!hasFixtures) {
    ctaText = 'No round open'
    ctaDisabled = true
  } else if (locked) {
    ctaText = 'Locked'
    ctaDisabled = true
  } else if (submittedAll) {
    ctaText = 'Picks submitted ✓'
    ctaDisabled = true
  } else if (within24h) {
    ctaText = `${label} left`
  }

  return (
    <div className="pd-card pd-card--countdown">
      <span className="pd-label">{locked || !hasFixtures ? 'This round' : 'Picks lock in'}</span>
      {!locked && hasFixtures && <span className="pd-countdown__time">{label}</span>}
      {(locked || !hasFixtures) && <span className="pd-countdown__time pd-countdown__time--locked">{hasFixtures ? 'Locked' : '—'}</span>}
      <button type="button" className="pd-cta" disabled={ctaDisabled} onClick={onCta}>
        {ctaText}
      </button>
    </div>
  )
}

function RankStreakPair({ rank, previousRank, streak, longestStreak, totalPoints }) {
  const movement = previousRank != null && rank != null ? previousRank - rank : null

  return (
    <div className="pd-pair pd-pair--trio">
      <div className="pd-card pd-card--stat">
        <span className="pd-label">Leaderboard rank</span>
        <span className="pd-stat">
          {rank != null ? `#${rank}` : '—'}
          {movement != null && movement !== 0 && (
            <span className={`pd-movement pd-movement--${movement > 0 ? 'up' : 'down'}`}>
              {movement > 0 ? '▲' : '▼'} {Math.abs(movement)}
            </span>
          )}
        </span>
      </div>
      <div className="pd-card pd-card--stat">
        <span className="pd-label">Total points</span>
        <span className="pd-stat">{totalPoints ?? 0}</span>
      </div>
      <div className="pd-card pd-card--stat">
        <span className="pd-label">Correct-pick streak</span>
        <span className="pd-stat">
          {streak != null ? streak : '—'}
          {longestStreak != null && longestStreak > 0 && (
            <span className="pd-movement">best {longestStreak}</span>
          )}
        </span>
      </div>
    </div>
  )
}

function ConsistencyCard({ stats }) {
  if (!stats || stats.totalScored === 0) return null

  const { recentRecord, bySide, exactRate } = stats
  const sideLabels = { home: 'Home picks', away: 'Away picks', draw: 'Draw picks' }

  return (
    <div className="pd-card pd-card--consistency">
      <span className="pd-label">Your Form</span>
      {recentRecord && (
        <p className="pd-consistency__headline">
          {recentRecord.correct}/{recentRecord.total} correct in your last {recentRecord.total} picks
        </p>
      )}
      <ul className="pd-consistency__list">
        {Object.entries(bySide)
          .filter(([, side]) => side.total > 0)
          .map(([key, side]) => (
            <li key={key}>
              <span>{sideLabels[key]}</span>
              <span>{side.correct}/{side.total}</span>
            </li>
          ))}
        {exactRate != null && (
          <li>
            <span>Exact scoreline rate</span>
            <span>{exactRate}%</span>
          </li>
        )}
      </ul>
    </div>
  )
}

function BeatHostCard({ hostEntries }) {
  if (!hostEntries || hostEntries.length === 0) {
    return (
      <div className="pd-card pd-card--host">
        <span className="pd-label">Beat the Host</span>
        <p className="pd-host__empty">Season points go head-to-head with the hosts once results start coming in.</p>
      </div>
    )
  }

  return (
    <div className="pd-card pd-card--host">
      <span className="pd-label">Beat the Host</span>
      {hostEntries.map((entry) => {
        const ahead = entry.user_points > entry.host_points
        return (
          <div key={entry.host_id} className="pd-host__row">
            <div className="pd-host__side">
              <span className="pd-host__value">{entry.user_points}</span>
              <span className="pd-host__name">You</span>
            </div>
            <span className={`pd-host__vs${ahead ? ' pd-host__vs--ahead' : ''}`}>vs</span>
            <div className="pd-host__side">
              <span className="pd-host__value">{entry.host_points}</span>
              <span className="pd-host__name">{entry.host_name}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SponsorPlaceholderCard() {
  return (
    <div className="pd-card pd-card--sponsor-slot">
      <span className="pd-label">Sponsor slot</span>
      <span className="pd-video__runtime">Coming soon</span>
    </div>
  )
}

export default function PredictionsDashboard({ userId, lockTime, submittedAll, hasFixtures, rank, previousRank, onCta, predictions, totalPoints }) {
  const [streak, setStreak] = useState(null)
  const [longestStreak, setLongestStreak] = useState(null)
  const [hostEntries, setHostEntries] = useState(null)
  const stats = predictions ? computePredictionStats(predictions) : null

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setStreak(null)
      setLongestStreak(null)
      setHostEntries(null)
      return
    }

    supabase
      .from('streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setStreak(data?.current_streak ?? 0)
        setLongestStreak(data?.longest_streak ?? 0)
      })

    const seasonId = new Date().getFullYear().toString()
    supabase
      .from('beat_host_season')
      .select('host_id, user_points, host_points')
      .eq('user_id', userId)
      .eq('season_id', seasonId)
      .then(async ({ data, error }) => {
        if (error || !data) return
        if (data.length === 0) {
          setHostEntries([])
          return
        }
        const { data: hostProfiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', data.map((row) => row.host_id))
        const nameById = Object.fromEntries((hostProfiles ?? []).map((p) => [p.id, p.display_name]))
        setHostEntries(data.map((row) => ({ ...row, host_name: nameById[row.host_id] ?? 'Host' })))
      })
  }, [userId])

  return (
    <div className="predictions-dashboard stat-card-theme">
      <CountdownLockCard lockTime={lockTime} submittedAll={submittedAll} hasFixtures={hasFixtures} onCta={onCta} />
      {userId && (
        <>
          <RankStreakPair rank={rank} previousRank={previousRank} streak={streak} longestStreak={longestStreak} totalPoints={totalPoints} />
          <ConsistencyCard stats={stats} />
          <BeatHostCard hostEntries={hostEntries} />
        </>
      )}
      {SPONSORS_ENABLED && (
        <div className="pd-pair pd-pair--placeholders">
          <SponsorPlaceholderCard />
        </div>
      )}
    </div>
  )
}
