import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { COMPETITIONS } from '../lib/placeholderData'

// Shared by HomePage and the Predictions reference panel — both need the
// same standings/results/scorers data, fetched once per mount rather than
// duplicated per page.
export default function useCompetitionData() {
  // Don't substitute the retired NPL beta snapshot when live Championship
  // data is unavailable. An honest empty state is safer than stale results.
  const [standings, setStandings] = useState([])
  const [results, setResults] = useState([])
  const [topScorers, setTopScorers] = useState([])
  const [usingPlaceholder, setUsingPlaceholder] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('standings')
      .select('*')
      .in('competition', COMPETITIONS)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setStandings(data)
          setUsingPlaceholder(false)
        }
      })

    supabase
      .from('results')
      .select('*')
      .in('competition', COMPETITIONS)
      .order('played_at', { ascending: false })
      .limit(90)
      .then(({ data, error }) => {
        if (!error && data?.length) setResults(data)
      })

    supabase
      .from('top_scorers')
      .select('*')
      .in('competition', COMPETITIONS)
      .order('goals', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data?.length) setTopScorers(data)
      })
  }, [])

  return { standings, results, topScorers, usingPlaceholder }
}
