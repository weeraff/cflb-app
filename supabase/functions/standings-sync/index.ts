// Supabase Edge Function: pulls league tables and recent results. Deploy
// and schedule with `supabase functions deploy standings-sync` + cron
// (already scheduled every 6 hours, see supabase/migrations).
//
// Two data sources:
//   - api.ffa.football (Football Australia) for the Australian Championship,
//     which doesn't start until 17 Oct 2026. Expected to keep returning
//     nothing useful until then.
//   - api.dribl.com (Football NSW's competition platform, the same backend
//     that powers competitions.footballnsw.com.au) for NPL NSW, League One
//     Men's, and League Two Men's, standing in as a beta test while the
//     Championship is still months away. Confirmed live and unauthenticated
//     via Deno's fetch on 2026-08-10 (Cloudflare blocks plain curl here,
//     works fine from an edge function since that also runs on Deno).
//
// Dribl quirk found during setup: competition ids aren't stable across
// seasons for NPL specifically (League One/Two keep the same id year to
// year, NPL doesn't). If NPL data suddenly stops updating, the id below
// probably needs refreshing. To find the current one:
//   1. https://mc-api.dribl.com/api/seasons -> find the entry with is_current: true
//   2. view-source the relevant page on footballnsw.com.au/competitions/
//      and pull the competition + league ids out of its dribl links
import { createClient } from 'jsr:@supabase/supabase-js@2'

const DRIBL_SEASON = 'wOmelzGd02' // 2026, confirmed current 2026-08-10

const DRIBL_COMPETITIONS = [
  { name: 'NPL NSW', competition: 'A4KLxx87Kq', league: 'bgdMjoBxmE' },
  { name: 'League One', competition: '1pN6ppAnd0', league: '3pmvlA15Kv' },
  { name: 'League Two', competition: 'k2KpRRVWmY', league: 'k2KpDkrOKY' },
]

const FFA_COMPETITION_ID = 'c1143' // Australian Championship

// deno-lint-ignore no-explicit-any
type SupabaseClientAny = any

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let standingsUpdated = 0
  let resultsUpdated = 0

  for (const comp of DRIBL_COMPETITIONS) {
    try {
      standingsUpdated += await syncDriblLadder(supabase, comp)
    } catch (err) {
      await logError(supabase, `dribl-ladder-${comp.name}`, err)
    }

    try {
      resultsUpdated += await syncDriblResults(supabase, comp)
    } catch (err) {
      await logError(supabase, `dribl-results-${comp.name}`, err)
    }
  }

  try {
    standingsUpdated += await syncFfaLadder(supabase)
  } catch (err) {
    await logError(supabase, 'ffa-ladder', err)
  }

  return new Response(JSON.stringify({ standingsUpdated, resultsUpdated }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function syncDriblLadder(supabase: SupabaseClientAny, comp: DriblCompetition) {
  const url = `https://mc-api.dribl.com/api/ladders?season=${DRIBL_SEASON}&ladder_type=regular&competition=${comp.competition}&league=${comp.league}&date_range=default&timezone=Australia%2FSydney`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()

  let count = 0
  for (const row of json.data ?? []) {
    const a = row.attributes
    const { error } = await supabase.from('standings').upsert(
      {
        competition: comp.name,
        group_name: null,
        team: cleanTeamName(a.team_name),
        position: a.position,
        played: a.played,
        won: a.won,
        drawn: a.drawn,
        lost: a.lost,
        gf: a.goals_for,
        ga: a.goals_against,
        gd: a.goal_difference,
        points: a.points,
      },
      { onConflict: 'competition,team' },
    )
    if (!error) count += 1
  }
  return count
}

async function syncDriblResults(supabase: SupabaseClientAny, comp: DriblCompetition) {
  const url = `https://mc-api.dribl.com/api/results?season=${DRIBL_SEASON}&competition=${comp.competition}&league=${comp.league}&date_range=default&timezone=Australia%2FSydney`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()

  let count = 0
  for (const row of json.data ?? []) {
    const a = row.attributes
    if (a.status !== 'complete') continue

    const { error } = await supabase.from('results').upsert(
      {
        competition: comp.name,
        dribl_id: row.hash_id,
        round: a.full_round,
        home_team: cleanTeamName(a.home_team_name),
        away_team: cleanTeamName(a.away_team_name),
        home_score: a.home_score,
        away_score: a.away_score,
        played_at: new Date(a.date).toISOString(),
        ground: a.ground_name,
      },
      { onConflict: 'dribl_id' },
    )
    if (!error) count += 1
  }
  return count
}

async function syncFfaLadder(supabase: SupabaseClientAny) {
  const ribbonRes = await fetch(`https://api.ffa.football/${FFA_COMPETITION_ID}/ribbon`)
  if (!ribbonRes.ok) throw new Error(`ribbon HTTP ${ribbonRes.status}`)
  const ribbon = await ribbonRes.json()
  const activeSeason = ribbon.competition?.active_season
  if (!activeSeason) throw new Error('no active_season in ribbon response')

  const ladderRes = await fetch(`https://api.ffa.football/${FFA_COMPETITION_ID}/s${activeSeason}/ladder`)
  if (!ladderRes.ok) throw new Error(`ladder HTTP ${ladderRes.status}`)
  const ladder = await ladderRes.json()

  let count = 0
  for (const group of ladder.standings ?? []) {
    for (const row of group.team_standings) {
      const s = row.summary
      const { error } = await supabase.from('standings').upsert(
        {
          competition: 'Australian Championship',
          group_name: group.group.name,
          team: row.team.name,
          position: s.position,
          played: Number(s.played),
          won: Number(s.won),
          drawn: Number(s.drawn),
          lost: Number(s.lost),
          gf: Number(s.goals_for),
          ga: Number(s.goals_against),
          gd: s.goals_difference,
          points: Number(s.points),
        },
        { onConflict: 'competition,team' },
      )
      if (!error) count += 1
    }
  }
  return count
}

async function logError(supabase: SupabaseClientAny, source: string, err: unknown) {
  await supabase.from('ingestion_errors').insert({
    job: 'standings',
    source,
    message: err instanceof Error ? err.message : String(err),
  })
}

type DriblCompetition = { name: string; competition: string; league: string }

// Dribl team names carry the grade/gender suffix, e.g. "Blacktown City FC
// First Grade Male", which is redundant once scoped to a single grade.
function cleanTeamName(name: string) {
  return name.replace(/ (First Grade|U\d+) (Male|Female)$/, '').trim()
}
