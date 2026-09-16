import LiveScoreStrip from '../components/LiveScoreStrip'
import CompetitionReference from '../components/CompetitionReference'
import GamesComingUp from '../components/GamesComingUp'

export default function HomePage() {
  return (
    <section>
      <h1>Home</h1>

      <LiveScoreStrip />

      <CompetitionReference heading={null} />

      <GamesComingUp />
    </section>
  )
}
