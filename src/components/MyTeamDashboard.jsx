import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { placeholderEpisodes } from '../lib/placeholderData'
import FixtureTeamRow from './FixtureTeamRow'
import LiveStreamEmbed from './LiveStreamEmbed'
import { formatKickoff } from '../lib/format'

function RankCard({ rank, previousRank }) {
  const movement = previousRank != null && rank != null ? previousRank - rank : null

  return (
    <div className="my-team__card my-team__rank">
      <span className="my-team__label">Leaderboard rank</span>
      <span className="my-team__rank-value">
        {rank != null ? `#${rank}` : '—'}
        {movement != null && movement !== 0 && (
          <span className={`my-team__rank-movement my-team__rank-movement--${movement > 0 ? 'up' : 'down'}`}>
            {movement > 0 ? '▲' : '▼'} {Math.abs(movement)}
          </span>
        )}
      </span>
    </div>
  )
}


export default function MyTeamDashboard() {
  const auth = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [teamOptions, setTeamOptions] = useState([])
  const [teamDraft, setTeamDraft] = useState('')
  const [nextFixture, setNextFixture] = useState(null)
  const [recentFixture, setRecentFixture] = useState(null)
  const [latestEpisode, setLatestEpisode] = useState(null)
  const [watchOpen, setWatchOpen] = useState(false)
  const [highlightsOpen, setHighlightsOpen] = useState(false)
  const [rank, setRank] = useState(null)
  const [previousRank, setPreviousRank] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.user) {
      setProfile(null)
      setProfileChecked(true)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data)
        setProfileChecked(true)
      })
  }, [auth?.user])

  useEffect(() => {
    if (!isSupabaseConfigured || !auth?.user) {
      setRank(null)
      setPreviousRank(null)
      return
    }

    setPreviousRank(profile?.last_rank ?? null)

    supabase
      .from('leaderboard')
      .select('*')
      .order('points', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return
        const index = data.findIndex((entry) => entry.user_id === auth.user.id)
        setRank(index >= 0 ? index + 1 : null)
      })
  }, [auth?.user, profile?.last_rank])

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
      <div className="my-team">
        <p className="auth-note">Sign in on the Predictions page to personalise this with your team.</p>
      </div>
    )
  }

  if (!profileChecked) return null

  if (!profile?.followed_team) {
    return (
      <div className="my-team">
        <RankCard rank={rank} previousRank={previousRank} />
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
    <div className="my-team">
      <RankCard rank={rank} previousRank={previousRank} />
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
          <a
            className="my-team__card my-team__card--episode"
            href={latestEpisode.external_id ? `/podcast#episode-${latestEpisode.external_id}` : '/podcast'}
          >
            <span className="my-team__label">Latest Episode</span>
            <span className="my-team__episode-title">{latestEpisode.title}</span>
          </a>
        )}
      </div>
    </div>
  )
}
