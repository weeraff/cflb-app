const CREST_PALETTE = [
  '#3b82f6',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f97316',
  '#64748b',
]

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function initialsFor(name) {
  const words = name
    .replace(/\b(FC|SC|FA|AFC)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !/^\d+$/.test(w))

  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

// size="md" (20px) is the default used almost everywhere; "sm" (15px)
// is the dense standings table, "lg" (26px) is the Recent Results cards
// where the crest carries more visual weight. Named variants here
// instead of per-page descendant-selector overrides in CSS.
export default function TeamCrest({ src, name, size = 'md' }) {
  const sizeClass = size !== 'md' ? ` team-crest--${size}` : ''

  if (src) return <img className={`team-crest${sizeClass}`} src={src} alt="" loading="lazy" />
  if (!name) return <span className={`team-crest team-crest--placeholder${sizeClass}`} />

  const color = CREST_PALETTE[hashString(name) % CREST_PALETTE.length]
  return (
    <span className={`team-crest team-crest--badge${sizeClass}`} style={{ background: color }} aria-hidden="true">
      {initialsFor(name)}
    </span>
  )
}
