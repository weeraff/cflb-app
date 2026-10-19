import { Link } from 'react-router-dom'
import { TERMS } from './lib/terms'
import AccountLine from './AccountLine'


export default function TermsPage() {
  const t = TERMS
  return (
    <div className="m-app">
      <header className="m-head">
        <div className="m-head__top">
          <img className="m-head__logo" src="/logo-header.png" alt="Champagne Football Lemonade Banter" />
        </div>
        <h1 className="m-head__title">Competition terms</h1>
        <p className="m-head__sub">Last updated {t.updated}</p>
        <AccountLine />
      </header>

      <main className="m-list">
        <article className="m-notice m-terms">
          <h2>1. The competition</h2>
          <p>
            The CFLB Australian Championship Predictor is run by {t.promoter} ("we", "us"). It's free to enter and you
            don't need to buy anything. It's a game of skill: you win by predicting results, not by chance.
          </p>

          <h2>2. Who can enter</h2>
          <p>
            Australian residents aged {t.minimumAge} or over. One account per person. Anyone found using more than one
            account, or entering for someone else, is disqualified and loses any points. People directly involved in
            running the competition can play but can't win the prize.
          </p>

          <h2>3. When it runs</h2>
          <p>
            From {t.startRound} of the Australian Championship (first kickoff {t.startDate}) until the Australian
            Championship Final. If the tournament schedule changes, the competition follows the official schedule.
          </p>

          <h2>4. Making picks</h2>
          <p>
            Each round, pick the score of every featured game. All picks for a round lock at the first kickoff of that
            round, and you can change them until then. Picks not saved before the lock score nothing for that round.
          </p>

          <h2>5. Scoring</h2>
          <ul>
            <li>Correct score: 3 points</li>
            <li>Correct outcome (right winner, or a draw) but wrong score: 1 point</li>
            <li>One Joker card each round doubles the points for the game you play it on</li>
          </ul>
          <p>
            Results are the score at the end of normal time (90 minutes plus stoppage time) as published by Football
            Australia. Extra time and penalty shootouts don't count. If a game is abandoned or isn't played within its
            round, picks on it score nothing for everyone.
          </p>

          <h2>6. Winning</h2>
          <p>
            The player in 1st place on the overall leaderboard after the Final wins {t.prize}. Ties are split by most
            correct scores, then most correct outcomes. If players are still level, the prize is shared equally between
            them. Private leagues are just for fun and don't carry a prize.
          </p>

          <h2>7. Claiming the prize</h2>
          <p>
            We'll email the winner at their account email within 7 days of the Final. The winner has 14 days to reply
            and confirm their identity, age and residency. The prize is paid by bank transfer within 30 days of that
            confirmation. If the winner doesn't reply in time or isn't eligible, the prize goes to the next eligible
            player on the leaderboard.
          </p>

          <h2>8. Fair play</h2>
          <p>
            We can disqualify anyone who tries to cheat, tamper with the app or break these terms. If something outside
            our control (a technical fault, a data error from the results feed) affects scoring, we'll correct it using
            the official results and our decision is final.
          </p>

          <h2>9. Your details</h2>
          <p>
            We use your email to run your account and contact you if you win. We only send you news and partner offers
            if you ticked the box to say yes, and you can unsubscribe any time. Ticking the box isn't needed to enter or
            win.
          </p>

          <h2>10. Other</h2>
          <p>
            This competition isn't run, sponsored or endorsed by Football Australia or any club. We may update these
            terms if we need to, and the latest version is always on this page. Questions: {t.contactEmail}.
          </p>
        </article>

        <Link to="/" className="m-btn m-btn--light m-btn--block m-press">
          Back to picks
        </Link>
      </main>
    </div>
  )
}
