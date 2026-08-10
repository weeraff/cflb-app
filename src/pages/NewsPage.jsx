import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderNews } from '../lib/placeholderData'
import MatchdayBanner from '../components/MatchdayBanner'

export default function NewsPage() {
  const [articles, setArticles] = useState(placeholderNews)
  const [usingPlaceholder, setUsingPlaceholder] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('news_items')
      .select('*')
      .order('published_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setArticles(data)
          setUsingPlaceholder(false)
        }
      })
  }, [])

  return (
    <section>
      <MatchdayBanner />

      <h1>NPL Football News</h1>
      <p className="section-subtitle">
        Pulled from journalists and outlets covering NSW football.
        {usingPlaceholder && ' (live snapshot from confirmed sources, auto-updates once news-sync is deployed)'}
      </p>

      {articles[0] && (
        <a
          href={articles[0].url}
          target="_blank"
          rel="noopener noreferrer"
          className="news-hero"
        >
          {articles[0].image_url && (
            <img className="news-hero__image" src={articles[0].image_url} alt="" loading="lazy" />
          )}
          <div className="news-hero__scrim" />
          <div className="news-hero__body">
            <span className="news-item__source">{articles[0].source}</span>
            <span className="news-item__title">{articles[0].title}</span>
            <p className="news-item__snippet">{articles[0].snippet}</p>
          </div>
        </a>
      )}

      <ul className="news-list">
        {articles.slice(1, 6).map((article) => (
          <li key={article.id}>
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="news-item">
              {article.image_url && (
                <img className="news-item__image" src={article.image_url} alt="" loading="lazy" />
              )}
              <div className="news-item__body">
                <span className="news-item__source">{article.source}</span>
                <span className="news-item__title">{article.title}</span>
                <p className="news-item__snippet">{article.snippet}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
