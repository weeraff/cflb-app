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
const SHORTS_LIMIT = 12
const AUDIO_EPISODES_LIMIT = 8

export default function PodcastPage() {
  const [episodes, setEpisodes] = useState(placeholderEpisodes)
  const [usingPlaceholder, setUsingPlaceholder] = useState(true)

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
  const shorts = episodes
    .filter((ep) => ep.source === 'youtube' && ep.type === 'short')
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
  const audioEpisodes = episodes
    .filter((ep) => ep.source === 'spotify')
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))

  const [latestEpisode, ...previousEpisodes] = fullEpisodes
  const visiblePrevious = previousEpisodes.slice(0, PREVIOUS_EPISODES_LIMIT)
  const visibleShorts = shorts.slice(0, SHORTS_LIMIT)
  const visibleAudio = audioEpisodes.slice(0, AUDIO_EPISODES_LIMIT)

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
          {latestEpisode && (
            <>
              <h2 className="podcast-column-heading">Latest Episode</h2>
              <div className="video-card video-card--hero" id={`episode-${episodeKey(latestEpisode)}`}>
                <div className="video-card__embed">
                  <iframe title={latestEpisode.title} src={latestEpisode.embed_url} allow="encrypted-media" allowFullScreen />
                </div>
                <div className="video-card__body">
                  <h3>{latestEpisode.title}</h3>
                  <p>{latestEpisode.description}</p>
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

          {visibleShorts.length > 0 && (
            <>
              <h2 className="podcast-column-heading">Shorts</h2>
              <div className="shorts-row">
                {visibleShorts.map((ep) => (
                  <a
                    key={ep.id}
                    id={`episode-${episodeKey(ep)}`}
                    className="short-card"
                    href={`https://www.youtube.com/shorts/${ep.external_id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      className="short-card__thumb"
                      src={`https://i.ytimg.com/vi/${ep.external_id}/hqdefault.jpg`}
                      alt=""
                      loading="lazy"
                    />
                    <span className="short-card__title">{ep.title}</span>
                  </a>
                ))}
              </div>
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
          {audioEpisodes.length > AUDIO_EPISODES_LIMIT && (
            <p className="podcast-more-note">+{audioEpisodes.length - AUDIO_EPISODES_LIMIT} more episodes in the feed</p>
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
