import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { placeholderNews } from '../lib/placeholderData'
import MatchdayBanner from '../components/MatchdayBanner'
import NotificationOptIn from '../components/NotificationOptIn'
import ArticleOverlay from '../components/ArticleOverlay'

export default function NewsPage() {
  const [articles, setArticles] = useState(placeholderNews)
  const [usingPlaceholder, setUsingPlaceholder] = useState(true)
  const [openArticle, setOpenArticle] = useState(null)

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
      <h1>This Week</h1>
      <p className="section-subtitle">
        Pulled from journalists and outlets covering NSW football.
        {usingPlaceholder && ' (live snapshot from confirmed sources, auto-updates once news-sync is deployed)'}
      </p>

      <div className="news-cover">
        {articles[0] && (
          <button type="button" className="news-hero" onClick={() => setOpenArticle(articles[0])}>
            {articles[0].image_url && (
              <img className="news-hero__image" src={articles[0].image_url} alt="" loading="lazy" />
            )}
            <div className="news-hero__scrim" />
            <div className="news-hero__body">
              <span className="news-item__source">{articles[0].source}</span>
              <span className="news-item__title">{articles[0].title}</span>
              <p className="news-item__snippet">{articles[0].snippet}</p>
            </div>
          </button>
        )}

        <div className="news-sidebar">
          <NotificationOptIn />
          <MatchdayBanner />
        </div>
      </div>

      <h2 className="results-heading">Latest News</h2>
      <ul className="news-list">
        {articles.slice(1, 6).map((article) => (
          <li key={article.id}>
            <button type="button" className="news-item" onClick={() => setOpenArticle(article)}>
              {article.image_url && (
                <img className="news-item__image" src={article.image_url} alt="" loading="lazy" />
              )}
              <div className="news-item__body">
                <span className="news-item__source">{article.source}</span>
                <span className="news-item__title">{article.title}</span>
                <p className="news-item__snippet">{article.snippet}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <ArticleOverlay article={openArticle} onClose={() => setOpenArticle(null)} />
    </section>
  )
}
