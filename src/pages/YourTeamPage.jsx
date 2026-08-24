import MyTeamDashboard from '../components/MyTeamDashboard'

export default function YourTeamPage() {
  return (
    <section>
      <h1>Your Team</h1>
      <p className="section-subtitle">Your rank, your team's next fixture, and the latest episode — all in one place.</p>

      <MyTeamDashboard />
    </section>
  )
}
