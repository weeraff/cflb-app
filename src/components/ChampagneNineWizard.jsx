import { useState } from 'react'
import TeamCrest from './TeamCrest'
import { FormGuide } from './CompetitionReference'
import { computeForm, findStandingPosition } from '../lib/form'

const COMPETITION_ORDER = ['NPL NSW', 'League One', 'League Two']
const COMPETITION_QUOTA = { 'NPL NSW': 4, 'League One': 3, 'League Two': 2 }

export function buildChampagneNineFixtures(fixtures) {
  const selected = []
  for (const competition of COMPETITION_ORDER) {
    const quota = COMPETITION_QUOTA[competition]
    const inComp = fixtures
      .filter((f) => f.competition === competition)
      .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))
      .slice(0, quota)
    selected.push(...inComp)
  }
  return selected
}

function TeamBlock({ name, logo, standings, results, competition, score, onChange }) {
  const position = findStandingPosition(name, standings, competition)
  return (
    <div className="champagne-nine__team">
      <div className="champagne-nine__team-identity">
        <TeamCrest src={logo} name={name} />
        <div className="champagne-nine__team-info">
          <span className="champagne-nine__team-name">{name}</span>
          <span className="champagne-nine__team-meta">
            {position ? <span className="champagne-nine__position">{ordinal(position)}</span> : null}
            <FormGuide picks={computeForm(name, results, competition)} />
          </span>
        </div>
      </div>
      <ScoreStepper value={score} onChange={onChange} />
    </div>
  )
}

function ScoreStepper({ value, onChange }) {
  return (
    <div className="score-stepper">
      <button
        type="button"
        className="score-stepper__btn"
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="Decrease score"
      >
        −
      </button>
      <span className="score-stepper__value">{value}</span>
      <button
        type="button"
        className="score-stepper__btn"
        onClick={() => onChange(value + 1)}
        aria-label="Increase score"
      >
        +
      </button>
    </div>
  )
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

function formatKickoff(iso) {
  return new Date(iso).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ChampagneNineWizard({ fixtures, picks, updatePick, standings, results, onComplete, initialStep = 0, initialCompletedCount = 0 }) {
  const [stepIndex, setStepIndex] = useState(initialStep)
  const [completedCount, setCompletedCount] = useState(initialCompletedCount)

  const total = fixtures.length
  const fixture = fixtures[stepIndex]
  if (!fixture) return null

  function goTo(index) {
    if (index <= completedCount) setStepIndex(index)
  }

  function next() {
    const nextCompleted = Math.max(completedCount, stepIndex + 1)
    setCompletedCount(nextCompleted)
    if (stepIndex + 1 >= total) {
      onComplete()
    } else {
      setStepIndex(stepIndex + 1)
    }
  }

  return (
    <div className="champagne-nine">
      <div className="champagne-nine__progress">
        {fixtures.map((f, i) => (
          <button
            key={f.id}
            type="button"
            className={`champagne-nine__dot${i === stepIndex ? ' champagne-nine__dot--active' : ''}${i <= completedCount ? ' champagne-nine__dot--done' : ''}`}
            onClick={() => goTo(i)}
            disabled={i > completedCount}
            aria-label={`Game ${i + 1} of ${total}`}
            aria-current={i === stepIndex}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="champagne-nine__card">
        <div className="champagne-nine__meta">
          <span className="champagne-nine__competition">{fixture.competition}</span>
          <span className="champagne-nine__kickoff">{formatKickoff(fixture.kickoff_at)}</span>
        </div>

        <TeamBlock
          name={fixture.home_team}
          logo={fixture.home_logo}
          standings={standings}
          results={results}
          competition={fixture.competition}
          score={picks[fixture.id]?.home ?? 0}
          onChange={(v) => updatePick(fixture.id, 'home', v)}
        />

        <span className="champagne-nine__vs">v</span>

        <TeamBlock
          name={fixture.away_team}
          logo={fixture.away_logo}
          standings={standings}
          results={results}
          competition={fixture.competition}
          score={picks[fixture.id]?.away ?? 0}
          onChange={(v) => updatePick(fixture.id, 'away', v)}
        />

        <button type="button" className="button champagne-nine__next" onClick={next}>
          {stepIndex + 1 >= total ? 'Review picks' : 'Next game'}
        </button>
      </div>

      <p className="champagne-nine__step-count">Game {stepIndex + 1} of {total}</p>
    </div>
  )
}
