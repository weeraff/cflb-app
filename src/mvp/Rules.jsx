import { Link } from 'react-router-dom'
import { TERMS } from './lib/terms'
// Competition rules and prize, in Gaz's wording. Kept in one place so the
// Picks and Leaderboard screens can't drift apart.

export function PrizeLine() {
  return (
    <p className="m-prize">
      <span className="m-prize__badges">
        <span className="m-prize__amount">🏆 1st place wins $1,000</span>
        <span className="m-prize__free">Free to play</span>
      </span>
      <span className="m-prize__when">
        Runs until the Australian Championship Final.{' '}
        <Link to="/terms" className="m-prize__terms">
          Terms
        </Link>
      </span>
    </p>
  )
}

export function RulesCard() {
  return (
    <section className="m-rules" aria-labelledby="m-rules-title">
      <h2 id="m-rules-title" className="m-rules__title">How it works</h2>
      <ul className="m-rules__list">
        <li>
          <span>Correct score</span>
          <strong>3 points</strong>
        </li>
        <li>
          <span>Correct outcome</span>
          <strong>1 point</strong>
        </li>
        <li>
          <span>🃏 1 Joker card each week</span>
          <strong>Double points</strong>
        </li>
      </ul>
      <p className="m-rules__foot">Free to enter, nothing to buy. Each game locks when it kicks off, so get your picks in early. Most points after the Final wins $1,000.{' '}
        <Link to="/terms">Full terms</Link>
      </p>
    </section>
  )
}

// The comp's first round can look like you've "missed" Round 1. Shown only
// while the start round is open, so it disappears once it's no longer true.
export function StartNotice({ roundName, locked }) {
  if (roundName !== TERMS.startRound || locked) return null
  return (
    <div className="m-start" role="note">
      <strong>The competition starts this round</strong>
      {TERMS.startRound} is week one of the CFLB comp. Everyone starts on 0 points, so you're not behind. Each game locks
      when it kicks off.
    </div>
  )
}
