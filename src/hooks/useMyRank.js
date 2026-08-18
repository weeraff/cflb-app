import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

// Shared by every "your rank" widget (MyTeamDashboard on Home,
// PredictionsSnapshot on News). PredictionsPage/PredictionsDashboard
// deliberately don't use this — that page already fetches the full
// leaderboard to render publicly, so computing its own rank from that
// existing state is free; calling this hook there would just be a
// second, redundant fetch of the same table.
export default function useMyRank(userId) {
  const [rank, setRank] = useState(null)
  const [points, setPoints] = useState(0)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setRank(null)
      setPoints(0)
      setDisplayName('')
      return
    }

    supabase
      .from('leaderboard')
      .select('*')
      .order('points', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return
        const index = data.findIndex((entry) => entry.user_id === userId)
        if (index >= 0) {
          setRank(index + 1)
          setPoints(data[index].points)
          setDisplayName(data[index].display_name)
        } else {
          setRank(null)
          setPoints(0)
          setDisplayName('')
        }
      })
  }, [userId])

  return { rank, points, displayName }
}
