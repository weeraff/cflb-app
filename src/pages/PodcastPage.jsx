import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderEpisodes } from '../lib/placeholderData'

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

  const videos = episodes.filter((ep) => ep.source === 'youtube')
  const audioEpisodes = episodes.filter((ep) => ep.source === 'spotify')

  return (
    <section>
      <h1>Episodes &amp; Clips</h1>
      <p className="section-subtitle">
        Watch on YouTube, listen on the go — synced automatically.
        {usingPlaceholder && ' (showing the latest known episodes until podcast-sync goes live)'}
      </p>

      <div className="podcast-layout">
        <div className="podcast-video-column">
          <h2 className="podcast-column-heading">Watch</h2>
          {videos.map((ep) => (
            <div key={ep.id} className="video-card">
              <div className="video-card__embed">
                <iframe title={ep.title} src={ep.embed_url} allow="encrypted-media" allowFullScreen />
              </div>
              <div className="video-card__body">
                <span className={`episode-badge episode-badge--${ep.type}`}>{ep.type}</span>
                <h3>{ep.title}</h3>
                <p>{ep.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="podcast-audio-column">
          <h2 className="podcast-column-heading">Listen</h2>
          <div className="audio-list">
            {audioEpisodes.map((ep) => (
              <div key={ep.id} className="audio-row">
                <span className={`episode-badge episode-badge--${ep.type}`}>{ep.type}</span>
                <h3 className="audio-row__title">{ep.title}</h3>
                <audio controls src={ep.embed_url} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
