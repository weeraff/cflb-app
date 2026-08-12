import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { COMPETITIONS, placeholderStandings, placeholderResults, placeholderTopScorers } from '../lib/placeholderData'

// Shared by TablePage and the Predictions reference panel — both need the
// same standings/results/scorers data, fetched once per mount rather than
// duplicated per page.
export default function useCompetitionData() {
  const [standings, setStandings] = useState(placeholderStandings)
  const [results, setResults] = useState(placeholderResults)
  const [topScorers, setTopScorers] = useState(placeholderTopScorers)
  const [usingPlaceholder, setUsingPlaceholder] = useState(true)

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
      .limit(30)
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
