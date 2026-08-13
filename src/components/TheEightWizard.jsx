import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import TeamCrest from './TeamCrest'
import { FormGuide } from './CompetitionReference'
import { computeForm, findStandingPosition } from '../lib/form'

function TeamBlock({ name, logo, standings, results, competition, score, onChange }) {
  const position = findStandingPosition(name, standings, competition)
  return (
    <div className="the-eight__team">
      <div className="the-eight__team-identity">
        <TeamCrest src={logo} name={name} />
        <div className="the-eight__team-info">
          <span className="the-eight__team-name">{name}</span>
          <span className="the-eight__team-meta">
            {position ? <span className="the-eight__position">{ordinal(position)}</span> : null}
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
      <button type="button" className="score-stepper__btn" onClick={() => onChange(Math.max(0, value - 1))} aria-label="Decrease score">
        −
      </button>
      <span className="score-stepper__value">{value}</span>
      <button type="button" className="score-stepper__btn" onClick={() => onChange(value + 1)} aria-label="Increase score">
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function HowOthersArePicking({ fixtureId }) {
  const [split, setSplit] = useState(null)

  useEffect(() => {
    setSplit(null)
    if (!isSupabaseConfigured || !UUID_RE.test(fixtureId)) return

    supabase
      .from('fixture_result_stats')
      .select('*')
      .eq('fixture_id', fixtureId)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return
        const total = data.reduce((sum, row) => sum + row.pick_count, 0)
        if (total === 0) return
        const byResult = Object.fromEntries(data.map((row) => [row.predicted_result, row.pick_count]))
        setSplit({
          home: Math.round(((byResult.home ?? 0) / total) * 100),
          draw: Math.round(((byResult.draw ?? 0) / total) * 100),
          away: Math.round(((byResult.away ?? 0) / total) * 100),
          total,
        })
      })
  }, [fixtureId])

  if (!split) return null

  return (
    <div className="the-eight__crowd">
      <span className="the-eight__crowd-label">How others are picking ({split.total})</span>
      <div className="the-eight__crowd-bar">
        <span className="the-eight__crowd-seg the-eight__crowd-seg--home" style={{ flexGrow: split.home || 0.001 }} title={`Home ${split.home}%`} />
        <span className="the-eight__crowd-seg the-eight__crowd-seg--draw" style={{ flexGrow: split.draw || 0.001 }} title={`Draw ${split.draw}%`} />
        <span className="the-eight__crowd-seg the-eight__crowd-seg--away" style={{ flexGrow: split.away || 0.001 }} title={`Away ${split.away}%`} />
      </div>
      <span className="the-eight__crowd-legend">Home {split.home}% · Draw {split.draw}% · Away {split.away}%</span>
    </div>
  )
}

export default function TheEightWizard({ fixtures, picks, updatePick, standings, results, onComplete, initialStep = 0, initialCompletedCount = 0 }) {
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

  const hasPunditPick = fixture.pundit_name && fixture.pundit_home_pick != null && fixture.pundit_away_pick != null

  return (
    <div className="the-eight">
      <div className="the-eight__progress">
        {fixtures.map((f, i) => (
          <button
            key={f.id}
            type="button"
            className={`the-eight__dot${i === stepIndex ? ' the-eight__dot--active' : ''}${i <= completedCount ? ' the-eight__dot--done' : ''}`}
            onClick={() => goTo(i)}
            disabled={i > completedCount}
            aria-label={`Game ${i + 1} of ${total}`}
            aria-current={i === stepIndex}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="the-eight__card">
        <div className="the-eight__meta">
          <span className="the-eight__competition">{fixture.competition}</span>
          <span className="the-eight__kickoff">{formatKickoff(fixture.kickoff_at)}</span>
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

        <span className="the-eight__vs">v</span>

        <TeamBlock
          name={fixture.away_team}
          logo={fixture.away_logo}
          standings={standings}
          results={results}
          competition={fixture.competition}
          score={picks[fixture.id]?.away ?? 0}
          onChange={(v) => updatePick(fixture.id, 'away', v)}
        />

        {hasPunditPick && (
          <p className="the-eight__pundit">
            🎙 {fixture.pundit_name} picked {fixture.pundit_home_pick}-{fixture.pundit_away_pick} — beat them?
          </p>
        )}

        <HowOthersArePicking fixtureId={fixture.id} />

        <button type="button" className="button the-eight__next" onClick={next}>
          {stepIndex + 1 >= total ? 'Review picks' : 'Next game'}
        </button>
      </div>

      <p className="the-eight__step-count">Game {stepIndex + 1} of {total}</p>
    </div>
  )
}
