import { useState } from 'react'
import TeamCrest from './TeamCrest'
import SponsorModule from './SponsorModule'
import { buildShareImageBlob } from '../lib/shareImage'
import { formatKickoff } from '../lib/format'
import { SPONSORS_ENABLED } from '../lib/featureFlags'

function pickResult(home, away) {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

function TiebreakerRow({ value, onChange, locked }) {
  return (
    <div className="the-eight-summary__tiebreaker">
      <span className="the-eight-summary__tiebreaker-label">Tiebreaker: minute of the first goal across the round</span>
      {locked ? (
        <span className="the-eight-summary__tiebreaker-value">{value ?? '—'}′</span>
      ) : (
        <div className="score-stepper">
          <button type="button" className="score-stepper__btn" onClick={() => onChange(Math.max(0, (value ?? 0) - 1))} aria-label="Decrease minute">−</button>
          <span className="score-stepper__value">{value ?? 0}′</span>
          <button type="button" className="score-stepper__btn" onClick={() => onChange(Math.min(120, (value ?? 0) + 1))} aria-label="Increase minute">+</button>
        </div>
      )}
    </div>
  )
}

export default function TheEightSummary({ fixtures, picks, onEdit, onSubmit, submitting, locked, resultStats, tiebreaker, onTiebreakerChange, roundKey }) {
  const [sharing, setSharing] = useState(false)

  const punditFixtures = fixtures.filter((f) => f.pundit_name && f.pundit_home_pick != null && f.pundit_away_pick != null)
  const matchedPundit = punditFixtures.filter((f) => {
    const pick = picks[f.id]
    return pick && pickResult(pick.home ?? 0, pick.away ?? 0) === pickResult(f.pundit_home_pick, f.pundit_away_pick)
  })

  async function handleShare() {
    setSharing(true)
    try {
      const blob = await buildShareImageBlob(fixtures, picks)
      const file = new File([blob], 'the-eight-picks.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My The Eight picks', text: 'My Champagne Football predictions this round' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'the-eight-picks.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="the-eight-summary">
      <ul className="the-eight-summary__list">
        {fixtures.map((fixture) => {
          const pick = picks[fixture.id]
          const home = pick?.home ?? 0
          const away = pick?.away ?? 0
          const stat = locked ? resultStats?.[fixture.id] : null

          return (
            <li key={fixture.id} className="the-eight-summary__row">
              <div className="the-eight-summary__match">
                <span className="the-eight-summary__competition">{fixture.competition}</span>
                <div className="the-eight-summary__teams">
                  <span className="the-eight-summary__team">
                    <TeamCrest src={fixture.home_logo} name={fixture.home_team} />
                    <span>{fixture.home_team}</span>
                  </span>
                  <span className="the-eight-summary__score">{home} - {away}</span>
                  <span className="the-eight-summary__team">
                    <TeamCrest src={fixture.away_logo} name={fixture.away_team} />
                    <span>{fixture.away_team}</span>
                  </span>
                </div>
                {locked && <span className="the-eight-summary__kickoff">{formatKickoff(fixture.kickoff_at)}</span>}
                {fixture.pundit_name && fixture.pundit_home_pick != null && (
                  <span className="the-eight-summary__pundit">🎙 {fixture.pundit_name}: {fixture.pundit_home_pick}-{fixture.pundit_away_pick}</span>
                )}
              </div>

              {locked ? (
                stat != null && (
                  <span className="the-eight-summary__stat">{stat}% picked the same result</span>
                )
              ) : (
                <button type="button" className="the-eight-summary__edit" onClick={() => onEdit(fixture.id)}>
                  Edit
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <TiebreakerRow value={tiebreaker} onChange={onTiebreakerChange} locked={locked} />

      {punditFixtures.length > 0 && (
        <p className="the-eight-summary__beat-host">
          {locked
            ? `You'll go head-to-head with the hosts on ${punditFixtures.length} games. Full time will tell who beat who.`
            : `Beat the host: your picks line up with the hosts on ${matchedPundit.length}/${punditFixtures.length} games so far.`}
        </p>
      )}

      {!locked && (
        <button type="button" className="button the-eight-summary__submit" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit The Eight'}
        </button>
      )}

      {locked && (
        <>
          <button type="button" className="button the-eight-summary__share" onClick={handleShare} disabled={sharing}>
            {sharing ? 'Preparing image...' : 'Share Predictions'}
          </button>
          {SPONSORS_ENABLED && <SponsorModule slot="predictions_post_submit" rotateKey={roundKey} />}
        </>
      )}
    </div>
  )
}

export { pickResult }
