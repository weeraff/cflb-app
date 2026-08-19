import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderEpisodes } from '../lib/placeholderData'
import { podcastGuests } from '../lib/guests'

function episodeKey(ep) {
  return ep.external_id ?? ep.id
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/channel/UCbfWQYNp7XBsreEFSukTWlQ'
const PREVIOUS_EPISODES_LIMIT = 6
const AUDIO_EPISODES_LIMIT = 8

export default function PodcastPage() {
  const [episodes, setEpisodes] = useState(placeholderEpisodes)
  const [usingPlaceholder, setUsingPlaceholder] = useState(true)
  const [heroMode, setHeroMode] = useState('watch')

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('episodes')
      .select('*')
      .order('published_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setEpisodes(data)
          setUsingPlaceholder(false)
        }
      })
  }, [])

  const fullEpisodes = episodes
    .filter((ep) => ep.source === 'youtube' && ep.type !== 'short')
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
  const audioEpisodes = episodes
    .filter((ep) => ep.source === 'spotify')
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))

  const [latestEpisode, ...previousEpisodes] = fullEpisodes
  const [latestAudio, ...previousAudio] = audioEpisodes
  const visiblePrevious = previousEpisodes.slice(0, PREVIOUS_EPISODES_LIMIT)
  const visibleAudio = previousAudio.slice(0, AUDIO_EPISODES_LIMIT)

  // Front and centre: whichever of watch/listen the visitor picks plays
  // right there, no click-through needed. Default to whichever actually
  // exists if only one does.
  const canWatch = Boolean(latestEpisode)
  const canListen = Boolean(latestAudio)
  const activeHeroMode = heroMode === 'watch' && !canWatch ? 'listen' : heroMode === 'listen' && !canListen ? 'watch' : heroMode
  const heroEpisode = activeHeroMode === 'watch' ? latestEpisode : latestAudio

  const episodesById = new Map(episodes.map((ep) => [episodeKey(ep), ep]))
  const guestLinks = podcastGuests.filter((g) => episodesById.has(g.episodeId))

  return (
    <section>
      <h1>Episodes &amp; Clips</h1>
      <p className="section-subtitle">
        Watch on YouTube, listen on the go, synced automatically.
        {usingPlaceholder && ' (showing the latest known episodes until podcast-sync goes live)'}
      </p>

      <div className="podcast-layout">
        <div className="podcast-main">
          {heroEpisode && (
            <>
              <div className="podcast-hero-header">
                <h2 className="podcast-column-heading">Latest Episode</h2>
                {canWatch && canListen && (
                  <div className="podcast-hero-toggle">
                    <button
                      type="button"
                      className={`podcast-hero-toggle__btn${activeHeroMode === 'watch' ? ' podcast-hero-toggle__btn--active' : ''}`}
                      onClick={() => setHeroMode('watch')}
                    >
                      Watch
                    </button>
                    <button
                      type="button"
                      className={`podcast-hero-toggle__btn${activeHeroMode === 'listen' ? ' podcast-hero-toggle__btn--active' : ''}`}
                      onClick={() => setHeroMode('listen')}
                    >
                      Listen
                    </button>
                  </div>
                )}
              </div>
              <div className="video-card video-card--hero" id={`episode-${episodeKey(heroEpisode)}`}>
                {activeHeroMode === 'watch' ? (
                  <div className="video-card__embed">
                    <iframe title={heroEpisode.title} src={heroEpisode.embed_url} allow="encrypted-media" allowFullScreen />
                  </div>
                ) : (
                  <audio controls src={heroEpisode.embed_url} className="podcast-hero-audio" />
                )}
                <div className="video-card__body">
                  <h3>{heroEpisode.title}</h3>
                </div>
              </div>
            </>
          )}

          {visiblePrevious.length > 0 && (
            <>
              <h2 className="podcast-column-heading">Previous Episodes</h2>
              <div className="episode-list-compact">
                {visiblePrevious.map((ep) => (
                  <a
                    key={ep.id}
                    id={`episode-${episodeKey(ep)}`}
                    className="episode-row"
                    href={`https://www.youtube.com/watch?v=${ep.external_id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      className="episode-row__thumb"
                      src={`https://i.ytimg.com/vi/${ep.external_id}/hqdefault.jpg`}
                      alt=""
                      loading="lazy"
                    />
                    <div className="episode-row__body">
                      <span className="episode-row__title">{ep.title}</span>
                      <span className="episode-row__date">{formatDate(ep.published_at)}</span>
                    </div>
                  </a>
                ))}
              </div>
              <a className="podcast-see-all" href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noreferrer">
                See all episodes on YouTube
              </a>
            </>
          )}
        </div>

        <aside className="podcast-sidebar">
          <h2 className="podcast-column-heading">Listen</h2>
          <div className="audio-list">
            {visibleAudio.map((ep) => (
              <div key={ep.id} id={`episode-${episodeKey(ep)}`} className="audio-row">
                <h3 className="audio-row__title">{ep.title}</h3>
                <audio controls src={ep.embed_url} />
              </div>
            ))}
          </div>
          {previousAudio.length > AUDIO_EPISODES_LIMIT && (
            <p className="podcast-more-note">+{previousAudio.length - AUDIO_EPISODES_LIMIT} more episodes in the feed</p>
          )}

          {guestLinks.length > 0 && (
            <>
              <h2 className="podcast-column-heading">Guests</h2>
              <ul className="guest-list">
                {guestLinks.map((g) => (
                  <li key={g.episodeId}>
                    <a href={`#episode-${g.episodeId}`}>{g.name}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
