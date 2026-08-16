import LiveScoreStrip from '../components/LiveScoreStrip'
import CompetitionReference from '../components/CompetitionReference'
import MyTeamDashboard from '../components/MyTeamDashboard'

export default function HomePage() {
  return (
    <section>
      <h1>Home</h1>
      <p className="section-subtitle">Live streams, results, highlights, ladders and top scorers — everything happening across NPL NSW, League One and League Two.</p>

      <MyTeamDashboard />

      <LiveScoreStrip />

      <CompetitionReference heading={null} />
    </section>
  )
}
