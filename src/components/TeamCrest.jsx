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

export default function TeamCrest({ src, name }) {
  if (src) return <img className="team-crest" src={src} alt="" loading="lazy" />
  if (!name) return <span className="team-crest team-crest--placeholder" />

  const color = CREST_PALETTE[hashString(name) % CREST_PALETTE.length]
  return (
    <span className="team-crest team-crest--badge" style={{ background: color }} aria-hidden="true">
      {initialsFor(name)}
    </span>
  )
}
