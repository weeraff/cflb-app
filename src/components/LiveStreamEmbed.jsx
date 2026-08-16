// Inline embed only — never a link out to youtube.com. Reuses the same
// responsive 16:9 embed pattern as the Podcast page's video cards.
export default function LiveStreamEmbed({ videoId, title }) {
  if (!videoId) return null

  return (
    <div className="video-card__embed live-stream-embed">
      <iframe
        title={title ? `Live stream: ${title}` : 'Live stream'}
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        allow="encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
