import LiveScoreStrip from '../components/LiveScoreStrip'
import CompetitionReference from '../components/CompetitionReference'
import GamesComingUp from '../components/GamesComingUp'

export default function HomePage() {
  return (
    <section>
      <h1>Home</h1>
      <p className="section-subtitle">Live streams, results and highlights across NPL NSW, League One and League Two. Ladder and top scorers below.</p>

      <LiveScoreStrip />

      <CompetitionReference heading={null} />

      <GamesComingUp />
    </section>
  )
}
