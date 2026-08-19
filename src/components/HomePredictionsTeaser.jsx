import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { buildTheEightFixtures, computeLockTime } from '../lib/theEight'
import useCountdown from '../hooks/useCountdown'

// The Eight is the app's core daily-habit-loop mechanic, but it only ever
// showed up on the Predictions tab — someone landing on Home (the app's
// actual entry point) had no signal the game existed at all unless they
// already knew to go look for it. This surfaces the same countdown the
// Predictions page shows, right on Home, linking straight into the pick
// flow.
export default function HomePredictionsTeaser() {
  const [lockTime, setLockTime] = useState(null)
  const [hasFixtures, setHasFixtures] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('fixtures')
      .select('*')
      .eq('status', 'scheduled')
      .eq('featured', true)
      .order('kickoff_at', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return
        const theEight = buildTheEightFixtures(data)
        setHasFixtures(theEight.length > 0)
        setLockTime(computeLockTime(theEight))
      })
  }, [])

  const { locked, label } = useCountdown(lockTime)
  const within24h = lockTime && !locked && lockTime - new Date() <= 24 * 60 * 60 * 1000

  // Nothing to say yet (still loading) or genuinely no round open right
  // now — stay quiet rather than show a dead/empty card.
  if (!hasFixtures) return null

  let ctaLabel = 'Make your picks'
  if (locked) ctaLabel = 'See this round'
  else if (within24h) ctaLabel = `${label} left, pick now`

  return (
    <Link to="/predictions" className="home-teaser stat-card-theme">
      <span className="pd-label">The Eight</span>
      <span className="home-teaser__text">
        {locked ? "This round's picks are locked. Check how you did" : `Picks lock in ${label}`}
      </span>
      <span className="home-teaser__cta">{ctaLabel} →</span>
    </Link>
  )
}
