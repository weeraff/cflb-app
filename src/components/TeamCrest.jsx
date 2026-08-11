export default function TeamCrest({ src }) {
  if (!src) return <span className="team-crest team-crest--placeholder" />
  return <img className="team-crest" src={src} alt="" loading="lazy" />
}
