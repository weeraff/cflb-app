import { useEffect } from 'react'

// Shows a news article inline over the app instead of navigating away to
// it — closing the overlay drops the reader straight back onto News
// exactly where they left it. Still the source's own page in the iframe
// (their branding, their page), just without a full page navigation.
export default function ArticleOverlay({ article, onClose }) {
  useEffect(() => {
    if (!article) return

    document.body.style.overflow = 'hidden'
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [article, onClose])

  if (!article) return null

  return (
    <div className="article-overlay" role="dialog" aria-modal="true" aria-label={article.title}>
      <div className="article-overlay__bar">
        <span className="article-overlay__source">{article.source}</span>
        <div className="article-overlay__actions">
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="article-overlay__open">
            Open in browser ↗
          </a>
          <button type="button" className="article-overlay__close" onClick={onClose} aria-label="Close article">
            ✕
          </button>
        </div>
      </div>
      <iframe className="article-overlay__frame" src={article.url} title={article.title} />
    </div>
  )
}
