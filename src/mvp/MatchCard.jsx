import { crestFor } from './lib/crests'
import { formatKickoff } from './lib/format'
import { pointsLabel } from './lib/round'

const BADGE_COLOURS = ['#1d5a43', '#2f6f8f', '#7a4b94', '#a8452f', '#4a5b2f', '#2f4a7a']

function initials(name) {
  const words = name.replace(/\b(FC|SC)\b/gi, '').trim().split(/\s+/).filter((w) => !/^\d+$/.test(w))
  return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : (words[0] ?? '?').slice(0, 2).toUpperCase()
}

function Crest({ name }) {
  const src = crestFor(name)
  if (src) return <img className="m-team__crest" src={src} alt="" loading="lazy" />
  const colour = BADGE_COLOURS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % BADGE_COLOURS.length]
  return (
    <span className="m-team__crest m-team__crest--badge" style={{ background: colour }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

function Stepper({ value, onStep, teamName }) {
  return (
    <div className="m-stepper">
      <button type="button" className="m-stepper__btn m-press" onClick={() => onStep(-1)} aria-label={`${teamName} one less goal`}>
        −
      </button>
      <span className={`m-stepper__value${value == null ? ' m-stepper__value--blank' : ''}`} aria-live="polite" aria-label={`${teamName} ${value ?? 'no pick'}`}>
        {value ?? '–'}
      </span>
      <button type="button" className="m-stepper__btn m-press" onClick={() => onStep(1)} aria-label={`${teamName} one more goal`}>
        +
      </button>
    </div>
  )
}

function Team({ name, value, editing, onStep }) {
  return (
    <div className="m-team">
      <Crest name={name} />
      <div className="m-team__name">{name}</div>
      {editing ? <Stepper value={value} onStep={onStep} teamName={name} /> : <div className="m-pick">{value ?? '–'}</div>}
    </div>
  )
}

// mode: "edit" (steppers), "saved" (read-only picks before lock) or
// "locked" (picks plus real score and points once known).
export default function MatchCard({ fixture, pick, isJoker, mode, points, jokerUsed, onStep, onJoker }) {
  const editing = mode === 'edit'
  const finished = fixture.status === 'completed' && fixture.home_score != null

  return (
    <article className={`m-card${isJoker ? ' m-card--joker' : ''}`} aria-label={`${fixture.home_team} v ${fixture.away_team}`}>
      <div className="m-card__when">
        {formatKickoff(fixture.kickoff_at)}
        {fixture.ground ? ` · ${fixture.ground}` : ''}
      </div>

      {!editing && <div className="m-card__label">Your pick</div>}

      <div className="m-card__match">
        <Team name={fixture.home_team} value={pick?.home} editing={editing} onStep={(d) => onStep('home', d)} />
        <div className="m-card__vs">vs</div>
        <Team name={fixture.away_team} value={pick?.away} editing={editing} onStep={(d) => onStep('away', d)} />
      </div>

      <div className="m-card__foot">
        {editing && jokerUsed ? (
          <span className="m-joker-tag m-joker-tag--muted">🃏 Joker already played this round</span>
        ) : editing ? (
          <button type="button" className="m-joker m-press" aria-pressed={isJoker} onClick={onJoker}>
            🃏 {isJoker ? 'Joker: double points' : 'Play Joker'}
          </button>
        ) : (
          <span className="m-joker-tag">{isJoker ? '🃏 Joker' : ''}</span>
        )}

        {mode === 'locked' && (
          <span className="m-card__result">
            {finished ? (
              <>
                {!pick && 'No pick · '}Result <strong>{fixture.home_score}–{fixture.away_score}</strong>{' '}
                <span className={`m-points${points > 0 ? ' m-points--won' : ''}`}>{pointsLabel(points)}</span>
              </>
            ) : pick ? (
              'Waiting on result'
            ) : (
              'No pick'
            )}
          </span>
        )}
      </div>
    </article>
  )
}
