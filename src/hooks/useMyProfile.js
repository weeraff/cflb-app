import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

// Shared "fetch my own profile row" pattern — MyTeamDashboard, PredictionsPage,
// ReporterPage, and PredictionsDashboard's previousRank each did their own
// select('id', ...).eq('id', userId).maybeSingle(), some narrowed to a single
// column. Profiles is a small table, so selecting '*' once and reading the
// field each caller actually needs costs nothing extra worth avoiding.
export default function useMyProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setProfile(null)
      setChecked(true)
      return
    }

    setChecked(false)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data)
        setChecked(true)
      })
  }, [userId])

  return { profile, setProfile, checked }
}
