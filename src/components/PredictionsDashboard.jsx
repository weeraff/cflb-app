import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

function useCountdown(lockTime) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!lockTime) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [lockTime])

  if (!lockTime) return { locked: true, label: '' }

  const diffMs = lockTime - now
  if (diffMs <= 0) return { locked: true, label: '' }

  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  let label
  if (days > 0) label = `${days}d ${hours}h`
  else if (hours > 0) label = `${hours}h ${minutes}m`
  else label = `${minutes}m`

  return { locked: false, label, diffMs }
}

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

function RankStreakPair({ rank, previousRank, streak }) {
  const movement = previousRank != null && rank != null ? previousRank - rank : null

  return (
    <div className="pd-pair">
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
        <span className="pd-label">Correct-pick streak</span>
        <span className="pd-stat">{streak != null ? streak : '—'}</span>
      </div>
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

function VideoPlaceholderCard() {
  return (
    <div className="pd-card pd-card--video">
      <span className="pd-video__thumb" aria-hidden="true">▶</span>
      <div className="pd-video__body">
        <span className="pd-label">Round Wrap</span>
        <span className="pd-video__runtime">Coming soon · 0:00</span>
      </div>
    </div>
  )
}

function SponsorPlaceholderCard() {
  return <div className="pd-card pd-card--sponsor-slot" aria-hidden="true" />
}

export default function PredictionsDashboard({ userId, lockTime, submittedAll, hasFixtures, rank, onCta }) {
  const [previousRank, setPreviousRank] = useState(null)
  const [streak, setStreak] = useState(null)
  const [hostEntries, setHostEntries] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setPreviousRank(null)
      setStreak(null)
      setHostEntries(null)
      return
    }

    supabase
      .from('profiles')
      .select('last_rank')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setPreviousRank(data?.last_rank ?? null))

    supabase
      .from('streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setStreak(data?.current_streak ?? 0))

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
    <div className="predictions-dashboard">
      <CountdownLockCard lockTime={lockTime} submittedAll={submittedAll} hasFixtures={hasFixtures} onCta={onCta} />
      {userId ? (
        <>
          <RankStreakPair rank={rank} previousRank={previousRank} streak={streak} />
          <BeatHostCard hostEntries={hostEntries} />
        </>
      ) : (
        <div className="pd-card pd-card--signin-prompt">
          Sign in to see your rank, streak, and Beat the Host score.
        </div>
      )}
      <div className="pd-pair pd-pair--placeholders">
        <VideoPlaceholderCard />
        <SponsorPlaceholderCard />
      </div>
    </div>
  )
}
