import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { placeholderEpisodes } from '../lib/placeholderData'
import FixtureTeamRow from './FixtureTeamRow'
import LiveStreamEmbed from './LiveStreamEmbed'
import { formatKickoff } from '../lib/format'
import useMyRank from '../hooks/useMyRank'
import useMyProfile from '../hooks/useMyProfile'

function StatsRow({ rank, previousRank, points, lastRoundPoints }) {
  const movement = previousRank != null && rank != null ? previousRank - rank : null

  return (
    <div className="my-team__stats">
      <div className="my-team__stat">
        <span className="my-team__stat-value">
          {rank != null ? `#${rank}` : '—'}
          {movement != null && movement !== 0 && (
            <span className={`my-team__rank-movement my-team__rank-movement--${movement > 0 ? 'up' : 'down'}`}>
              {movement > 0 ? '▲' : '▼'} {Math.abs(movement)}
            </span>
          )}
        </span>
        <span className="my-team__stat-label">Rank</span>
      </div>
      <div className="my-team__stat">
        <span className="my-team__stat-value">{lastRoundPoints != null ? lastRoundPoints : '—'}</span>
        <span className="my-team__stat-label">Last round</span>
      </div>
      <div className="my-team__stat">
        <span className="my-team__stat-value">{points}</span>
        <span className="my-team__stat-label">Total points</span>
      </div>
    </div>
  )
}


export default function MyTeamDashboard() {
  const auth = useAuth()
  const { profile, setProfile, checked: profileChecked } = useMyProfile(auth?.user?.id)
  const [teamOptions, setTeamOptions] = useState([])
  const [teamDraft, setTeamDraft] = useState('')
  const [nextFixture, setNextFixture] = useState(null)
  const [recentFixture, setRecentFixture] = useState(null)
  const [latestEpisode, setLatestEpisode] = useState(null)
  const [watchOpen, setWatchOpen] = useState(false)
  const [highlightsOpen, setHighlightsOpen] = useState(false)
  const [lastRoundPoints, setLastRoundPoints] = useState(null)
  const { rank, points } = useMyRank(auth?.user?.id)
  const previousRank = auth?.user ? (profile?.last_rank ?? null) : null

  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.user) {
      setLastRoundPoints(null)
      return
    }

    supabase
      .from('predictions')
      .select('points_awarded, fixtures(round, kickoff_at, status)')
      .eq('user_id', auth.user.id)
      .then(({ data, error }) => {
        if (error || !data) return
        const completed = data.filter((p) => p.fixtures?.status === 'completed')
        if (completed.length === 0) {
          setLastRoundPoints(null)
          return
        }
        const latestRound = completed.sort(
          (a, b) => new Date(b.fixtures.kickoff_at) - new Date(a.fixtures.kickoff_at),
        )[0].fixtures.round
        const total = completed
          .filter((p) => p.fixtures.round === latestRound)
          .reduce((sum, p) => sum + (p.points_awarded ?? 0), 0)
        setLastRoundPoints(total)
      })
  }, [auth?.user])

  useEffect(() => {
    if (!isSupabaseConfigured || profile?.followed_team) return

    supabase
      .from('standings')
      .select('team')
      .order('team', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setTeamOptions([...new Set(data.map((row) => row.team))])
      })
  }, [profile?.followed_team])

  useEffect(() => {
    const team = profile?.followed_team
    if (!isSupabaseConfigured || !team) {
      setNextFixture(null)
      setRecentFixture(null)
      return
    }

    supabase
      .from('fixtures')
      .select('*')
      .or(`home_team.eq.${team},away_team.eq.${team}`)
      .eq('status', 'scheduled')
      .order('kickoff_at', { ascending: true })
      .limit(1)
      .then(({ data, error }) => {
        if (!error && data?.length) setNextFixture(data[0])
      })

    supabase
      .from('fixtures')
      .select('*')
      .or(`home_team.eq.${team},away_team.eq.${team}`)
      .eq('status', 'completed')
      .order('kickoff_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!error && data?.length) setRecentFixture(data[0])
      })
  }, [profile?.followed_team])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLatestEpisode(placeholderEpisodes.find((ep) => ep.type !== 'short') ?? null)
      return
    }

    supabase
      .from('episodes')
      .select('*')
      .neq('type', 'short')
      .order('published_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!error && data?.length) setLatestEpisode(data[0])
      })
  }, [])

  async function saveTeam(e) {
    e.preventDefault()
    if (!teamDraft || !auth?.user) return

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: auth.user.id, display_name: profile?.display_name ?? 'Anonymous', followed_team: teamDraft })
      .select()
      .single()

    if (!error) setProfile(data)
  }

  if (!auth?.user) {
    return (
      <div className="my-team stat-card-theme my-team__signin">
        <p>Sign in to follow your team, track your rank and see your picks in one place.</p>
        <Link className="button" to="/sign-in">Sign in</Link>
      </div>
    )
  }

  if (!profileChecked) return null

  if (!profile?.followed_team) {
    return (
      <div className="my-team stat-card-theme">
        <StatsRow rank={rank} previousRank={previousRank} points={points} lastRoundPoints={lastRoundPoints} />
        <p>Pick a team to follow for their next fixture, watch and highlights right here.</p>
        <form onSubmit={saveTeam} className="my-team__picker">
          <select value={teamDraft} onChange={(e) => setTeamDraft(e.target.value)}>
            <option value="">Choose your team</option>
            {teamOptions.map((team) => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
          <button className="button" type="submit" disabled={!teamDraft}>Follow</button>
        </form>
      </div>
    )
  }

  const canWatch = nextFixture?.stream_status === 'live' && nextFixture?.youtube_video_id
  const canWatchHighlights = Boolean(recentFixture?.highlights_video_id)

  return (
    <div className="my-team stat-card-theme">
      <StatsRow rank={rank} previousRank={previousRank} points={points} lastRoundPoints={lastRoundPoints} />
      <div className="my-team__grid">
        <div className="my-team__card">
          <span className="my-team__label">{profile.followed_team} — Next Fixture</span>
          {nextFixture ? (
            <>
              <div className="my-team__fixture">
                <FixtureTeamRow className="my-team__team" logo={nextFixture.home_logo} name={nextFixture.home_team} />
                <span className="my-team__vs">v</span>
                <FixtureTeamRow className="my-team__team" logo={nextFixture.away_logo} name={nextFixture.away_team} />
              </div>
              <span className="my-team__kickoff">{formatKickoff(nextFixture.kickoff_at)}</span>

              <div className="my-team__actions">
                {canWatch && (
                  <button type="button" className="recent-result__highlights" onClick={() => setWatchOpen(!watchOpen)}>
                    {watchOpen ? 'Hide stream' : '▶ Watch'}
                  </button>
                )}
                {canWatchHighlights && (
                  <button type="button" className="recent-result__highlights" onClick={() => setHighlightsOpen(!highlightsOpen)}>
                    {highlightsOpen ? 'Hide highlights' : '▶ Highlights (last game)'}
                  </button>
                )}
              </div>

              {watchOpen && canWatch && (
                <LiveStreamEmbed videoId={nextFixture.youtube_video_id} title={`${nextFixture.home_team} v ${nextFixture.away_team}`} />
              )}
              {highlightsOpen && canWatchHighlights && (
                <LiveStreamEmbed videoId={recentFixture.highlights_video_id} title={`${recentFixture.home_team} v ${recentFixture.away_team} highlights`} />
              )}
            </>
          ) : (
            <p className="auth-note">No upcoming fixture found for {profile.followed_team}.</p>
          )}
        </div>

        {latestEpisode && (
          <div className="my-team__card my-team__card--episode">
            <span className="my-team__label">Latest Episode</span>
            <span className="my-team__episode-title">{latestEpisode.title}</span>
            {latestEpisode.source === 'youtube' ? (
              <div className="my-team__episode-embed">
                <iframe title={latestEpisode.title} src={latestEpisode.embed_url} allow="encrypted-media" allowFullScreen />
              </div>
            ) : (
              <audio controls src={latestEpisode.embed_url} className="my-team__episode-audio" />
            )}
            <Link className="my-team__episode-link" to="/podcast">All episodes →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
