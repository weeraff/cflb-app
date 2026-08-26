import { sortLeaderboard } from '../lib/leaderboard'

export default function LeaderboardTable({ entries }) {
  const sorted = sortLeaderboard(entries)

  return (
    <div className="leaderboard-scroll">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th title="Played">P</th>
            <th title="Scores">S</th>
            <th title="Outcomes">O</th>
            <th title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, i) => (
            <tr key={entry.user_id ?? entry.display_name} className={i < 3 ? `leaderboard-table__row--${i + 1}` : ''}>
              <td className="leaderboard-table__rank">{i + 1}</td>
              <td className="leaderboard-table__name">{entry.display_name}</td>
              <td>{entry.rounds_picked ?? '—'}</td>
              <td>{entry.scores ?? '—'}</td>
              <td>{entry.outcomes ?? '—'}</td>
              <td className="leaderboard-table__pts">{entry.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
