// Supabase Edge Function: pulls league tables, recent results, top goal
// scorers, and upcoming fixtures, then locks kicked-off fixtures, marks
// finished ones complete, and scores predictions against them. Deploy and
// schedule with `supabase functions deploy standings-sync` + cron
// (already scheduled every 6 hours, see supabase/migrations, worth
// tightening once predictions are live so locking/scoring isn't hours
// behind kickoff).
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
//
// Top scorers come from Dribl's "moments" endpoint (the same system that
// powers the "Golden Boot" style leaderboards on the public site), which
// requires a tenant id, resolved once via /api/tenants?mc_link=<domain>.
// Only Goals, Red Cards, and Yellow Cards are tracked there, no assists
// exist for any of the three competitions (checked 2026-08-11), so this
// only pulls goals.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendPushToAll, sendPushToUsers } from '../_shared/sendPush.ts'

const DRIBL_SEASON = 'wOmelzGd02' // 2026, confirmed current 2026-08-10
const DRIBL_TENANT = '1RwNlWemjr' // Football NSW, resolved via /api/tenants?mc_link=competitions.footballnsw.com.au

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
  let topScorersUpdated = 0
  let fixturesUpdated = 0

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

    try {
      topScorersUpdated += await syncDriblTopScorers(supabase, comp)
    } catch (err) {
      await logError(supabase, `dribl-top-scorers-${comp.name}`, err)
    }

    try {
      fixturesUpdated += await syncDriblFixtures(supabase, comp)
    } catch (err) {
      await logError(supabase, `dribl-fixtures-${comp.name}`, err)
    }
  }

  try {
    standingsUpdated += await syncFfaLadder(supabase)
  } catch (err) {
    await logError(supabase, 'ffa-ladder', err)
  }

  let locked = 0
  let completed = 0
  let scored = 0
  try {
    locked = await lockKickedOffFixtures(supabase)
  } catch (err) {
    await logError(supabase, 'lock-fixtures', err)
  }
  try {
    completed = await completeFixturesFromResults(supabase)
  } catch (err) {
    await logError(supabase, 'complete-fixtures', err)
  }
  try {
    scored = await scorePredictions(supabase)
  } catch (err) {
    await logError(supabase, 'score-predictions', err)
  }

  let nextRoundFeatured = 0
  try {
    nextRoundFeatured = await autoFeatureNextRound(supabase)
  } catch (err) {
    await logError(supabase, 'auto-feature-next-round', err)
  }

  let matchEventsSynced = 0
  try {
    matchEventsSynced = await syncMatchEvents(supabase)
  } catch (err) {
    await logError(supabase, 'sync-match-events', err)
  }

  let resultsNotified = 0
  try {
    resultsNotified = await notifyCompletedFeaturedFixtures(supabase)
  } catch (err) {
    await logError(supabase, 'notify-results', err)
  }

  // Ranks (and Beat the Host) can only move when points changed, so skip
  // the leaderboard-dependent recomputes entirely on runs where nothing
  // was scored.
  let rankChangesNotified = 0
  let beatHostUpdated = 0
  if (scored > 0) {
    try {
      rankChangesNotified = await notifyRankChanges(supabase)
    } catch (err) {
      await logError(supabase, 'notify-rank-change', err)
    }
    try {
      beatHostUpdated = await updateBeatHostSeason(supabase)
    } catch (err) {
      await logError(supabase, 'update-beat-host-season', err)
    }
  }

  let picksReminderNotified = 0
  try {
    picksReminderNotified = await notifyDailyPicksReminder(supabase)
  } catch (err) {
    await logError(supabase, 'notify-picks-reminder', err)
  }

  let roundSummaryNotified = 0
  try {
    roundSummaryNotified = await notifyRoundResultsSummary(supabase)
  } catch (err) {
    await logError(supabase, 'notify-round-summary', err)
  }

  return new Response(
    JSON.stringify({
      standingsUpdated,
      resultsUpdated,
      topScorersUpdated,
      fixturesUpdated,
      locked,
      completed,
      scored,
      nextRoundFeatured,
      matchEventsSynced,
      resultsNotified,
      picksReminderNotified,
      rankChangesNotified,
      beatHostUpdated,
      roundSummaryNotified,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
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
        logo_url: a.club_logo,
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
        // match_hash_id (not the result resource's own hash_id) is the
        // stable id shared with fixtures, needed to join a completed
        // result back to its scheduled fixture for locking/scoring.
        dribl_id: a.match_hash_id,
        round: a.full_round,
        home_team: cleanTeamName(a.home_team_name),
        away_team: cleanTeamName(a.away_team_name),
        home_logo: a.home_logo,
        away_logo: a.away_logo,
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

async function syncDriblTopScorers(supabase: SupabaseClientAny, comp: DriblCompetition) {
  const url = `https://mc-api.dribl.com/api/moments?tenant=${DRIBL_TENANT}&season=${DRIBL_SEASON}&competition=${comp.competition}&league=${comp.league}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()

  const scorersMoment = (json.data ?? []).find((m: { attributes: { name: string } }) =>
    m.attributes.name.includes('Top Goal Scorers'),
  )
  if (!scorersMoment) throw new Error('no Top Goal Scorers moment found')

  let count = 0
  for (const player of scorersMoment.attributes.content.slice(0, 10)) {
    const { error } = await supabase.from('top_scorers').upsert(
      {
        competition: comp.name,
        dribl_id: player.user_id,
        player_name: player.name,
        club_name: player.club_names?.[0] ?? '',
        goals: player.goals,
        image_url: player.image,
      },
      { onConflict: 'competition,dribl_id' },
    )
    if (!error) count += 1
  }
  return count
}

async function syncDriblFixtures(supabase: SupabaseClientAny, comp: DriblCompetition) {
  const url = `https://mc-api.dribl.com/api/fixtures?season=${DRIBL_SEASON}&competition=${comp.competition}&league=${comp.league}&date_range=default&timezone=Australia%2FSydney`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()

  let count = 0
  for (const row of json.data ?? []) {
    const a = row.attributes
    if (a.status !== 'pending' || a.bye_flag) continue

    const { error } = await supabase.from('fixtures').upsert(
      {
        competition: comp.name,
        dribl_id: a.match_hash_id,
        round: a.full_round,
        home_team: cleanTeamName(a.home_team_name),
        away_team: cleanTeamName(a.away_team_name),
        home_logo: a.home_logo,
        away_logo: a.away_logo,
        ground: a.ground_name,
        kickoff_at: new Date(a.date).toISOString(),
        status: 'scheduled',
      },
      { onConflict: 'dribl_id', ignoreDuplicates: false },
    )
    if (!error) count += 1
  }
  return count
}

// Predictions close once kickoff passes, regardless of whether a result
// has come through yet, closing the picking window is time-based.
async function lockKickedOffFixtures(supabase: SupabaseClientAny) {
  const { data, error } = await supabase
    .from('fixtures')
    .update({ status: 'locked' })
    .eq('status', 'scheduled')
    .lte('kickoff_at', new Date().toISOString())
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

// Once a result lands (matched by the shared match_hash_id), copy the
// score onto the fixture and mark it completed so scorePredictions can run.
async function completeFixturesFromResults(supabase: SupabaseClientAny) {
  const { data: pending, error: pendingError } = await supabase
    .from('fixtures')
    .select('id, dribl_id')
    .in('status', ['scheduled', 'locked'])
    .not('dribl_id', 'is', null)
  if (pendingError) throw pendingError
  if (!pending?.length) return 0

  const { data: results, error: resultsError } = await supabase
    .from('results')
    .select('dribl_id, home_score, away_score')
    .in('dribl_id', pending.map((f: { dribl_id: string }) => f.dribl_id))
  if (resultsError) throw resultsError

  const resultsByDriblId: Record<string, { home_score: number; away_score: number }> = {}
  for (const r of results) resultsByDriblId[r.dribl_id] = r

  let count = 0
  for (const fixture of pending) {
    const result = resultsByDriblId[fixture.dribl_id]
    if (!result) continue

    const { error } = await supabase
      .from('fixtures')
      .update({ home_score: result.home_score, away_score: result.away_score, status: 'completed' })
      .eq('id', fixture.id)
    if (!error) count += 1
  }
  return count
}

// The Eight's fixture selection ("featured") was a manual, hand-curated
// step — a real person picking the most interesting 4 NPL NSW / 3 League
// One / 1 League Two games each week via the Supabase table editor. That
// worked until nobody did it in time and the round just sat empty. This
// auto-opens the next round the moment the current one fully finishes, by
// chronologically-soonest fixture per tier (mirrors the same cascading
// quota logic buildTheEightFixtures uses client-side in src/lib/theEight.js,
// just server-side since there's no shared package between the Vite app and
// this Deno function). Trade-off: it can no longer prioritise derbies/
// marquee matchups the way a human curator did — this guarantees a round
// is never blank, it doesn't replace picking more interesting fixtures by
// hand afterward if that still matters for a given week.
const NEXT_ROUND_TIERS = [
  { competition: 'NPL NSW', quota: 4 },
  { competition: 'League One', quota: 3 },
  { competition: 'League Two', quota: 1 },
]

async function autoFeatureNextRound(supabase: SupabaseClientAny) {
  const { data: openFeatured, error: openError } = await supabase
    .from('fixtures')
    .select('id')
    .eq('featured', true)
    .neq('status', 'completed')
  if (openError) throw openError
  // Current round still has an unfinished featured fixture — not done yet.
  if (openFeatured && openFeatured.length > 0) return 0

  // Read candidates for the next round before touching anything — if
  // there's nothing to replace this round with yet, leave the finished
  // round's featured flag exactly as it is rather than retiring it into
  // an empty gap.
  const { data: candidates, error: candidatesError } = await supabase
    .from('fixtures')
    .select('id, competition, kickoff_at')
    .eq('status', 'scheduled')
    .eq('featured', false)
    .in('competition', NEXT_ROUND_TIERS.map((t) => t.competition))
    .order('kickoff_at', { ascending: true })
  if (candidatesError) throw candidatesError
  if (!candidates?.length) return 0

  const selected: { id: string }[] = []
  let carry = 0
  for (const tier of NEXT_ROUND_TIERS) {
    const quota = tier.quota + carry
    const inTier = candidates.filter((f: { competition: string }) => f.competition === tier.competition).slice(0, quota)
    selected.push(...inTier)
    carry = Math.max(0, quota - inTier.length)
  }
  if (selected.length === 0) return 0

  // Retire the just-finished round's featured flag BEFORE featuring the
  // next one's, not after — this used to run last, so a failure here
  // (thrown, caught by the outer per-step try/catch, logged and skipped)
  // left the next round's fixtures already marked featured while the
  // previous round's completed ones stayed featured too, mixing two
  // different rounds together in `featured = true` (confirmed live:
  // Round 29's 4 completed fixtures still featured alongside Round 30's
  // 4 freshly-featured ones). Retiring first, now that a real
  // replacement is confirmed to exist, means a failure here throws
  // before any new fixture is ever touched — worst case next run retries
  // both steps against the same candidates, never a mixed state.
  const { error: retireError } = await supabase
    .from('fixtures')
    .update({ featured: false })
    .eq('featured', true)
    .eq('status', 'completed')
  if (retireError) throw retireError

  const { error: updateError } = await supabase
    .from('fixtures')
    .update({ featured: true })
    .in('id', selected.map((f) => f.id))
  if (updateError) throw updateError

  return selected.length
}

// Match events (scorers with minute, cards, subs) — found by capturing
// the real network traffic of Football NSW's own match-centre page in a
// browser, not documented anywhere: mc-api.dribl.com/api/matchcentre/
// {match_hash_id}?tenant={tenant}, no auth needed. Every fixtures/results/
// moments endpoint tried earlier only ever had scoreline or season-
// aggregate data — this is the one that actually has it.
//
// Only within a week of kickoff, same reasoning as highlights: Dribl's
// matchsheet can get corrected for a day or two after full time, so this
// re-syncs (replacing only its own 'dribl'-sourced rows, never touching
// flash-reporter ones for the same fixture) within that window, then
// stops rather than re-checking a settled match forever.
const MATCH_EVENTS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

async function syncMatchEvents(supabase: SupabaseClientAny) {
  const windowStart = new Date(Date.now() - MATCH_EVENTS_WINDOW_MS).toISOString()

  // 'locked' fixtures are the ones actually in progress right now (past
  // kickoff, not yet completed) — this was 'completed'-only, which meant
  // a live match's scorers/cards never synced until full time, so
  // LiveScoreStrip (which derives its score from these event rows, not
  // fixtures.home_score/away_score — that column stays null until the
  // official result lands) sat at 0-0 for the entire match.
  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select('id, dribl_id, status')
    .in('status', ['locked', 'completed'])
    .not('dribl_id', 'is', null)
    .gte('kickoff_at', windowStart)
  if (error) throw error
  if (!fixtures?.length) return 0

  let synced = 0
  for (const fixture of fixtures as { id: string; dribl_id: string; status: string }[]) {
    try {
      const res = await fetch(
        `https://mc-api.dribl.com/api/matchcentre/${fixture.dribl_id}?tenant=${DRIBL_TENANT}`,
        { headers: { Accept: 'application/json' } },
      )
      if (!res.ok) continue
      const json = await res.json()
      const a = json.data?.attributes
      if (!a?.match_events) continue

      const homeHashId = a.home_team_hash_id
      const rows = mapDriblMatchEvents(fixture.id, homeHashId, a.match_events)

      // Replace this fixture's own Dribl-sourced rows only — a
      // flash-reporter's rows for the same fixture (source: 'reporter')
      // are never touched.
      await supabase.from('match_events').delete().eq('fixture_id', fixture.id).eq('source', 'dribl')
      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('match_events').insert(rows)
        if (!insertError) synced += 1
      } else {
        synced += 1
      }

      // Full time on the live match-centre feed reliably lands within a
      // couple of hours of kickoff (confirmed against real data); the
      // separate results-table pipeline that completeFixturesFromResults
      // depends on can lag well behind that. Completing from this data
      // directly, the moment it says 'ft', is what actually gets the
      // "Full time" push and Recent Results out promptly instead of
      // waiting on that slower path — this runs earlier in the handler
      // than notifyCompletedFeaturedFixtures, so it's picked up the same
      // cron tick.
      if (fixture.status === 'locked' && a.game_progress === 'ft' && a.home_score != null && a.away_score != null) {
        await supabase
          .from('fixtures')
          .update({ status: 'completed', home_score: a.home_score, away_score: a.away_score })
          .eq('id', fixture.id)
      }
    } catch (err) {
      await logError(supabase, `match-events-${fixture.dribl_id}`, err)
    }
  }
  return synced
}

type DriblMatchEvent = {
  type: string
  team_id: string
  minute: number
  name?: string
  final_card_type?: string
  penalty_kick?: boolean
  penalty_scored?: boolean
}

function mapDriblMatchEvents(fixtureId: string, homeTeamHashId: string, events: DriblMatchEvent[]) {
  const rows = []
  for (const ev of events) {
    const team = ev.team_id === homeTeamHashId ? 'home' : 'away'

    if (ev.type === 'goal' && ev.name) {
      // A penalty scored is still a goal; a taken-but-missed penalty
      // isn't in this array at all in every match seen so far — if Dribl
      // ever does put one here, penalty_scored: false is the signal.
      if (ev.penalty_kick && ev.penalty_scored === false) continue
      rows.push({
        fixture_id: fixtureId,
        type: 'goal',
        minute: ev.minute,
        team,
        player_name: titleCase(ev.name),
        source: 'dribl',
      })
    } else if (ev.type === 'card' && ev.name && ev.final_card_type) {
      rows.push({
        fixture_id: fixtureId,
        type: 'card',
        minute: ev.minute,
        team,
        player_name: titleCase(ev.name),
        card_type: ev.final_card_type.toLowerCase().includes('red') ? 'red' : 'yellow',
        source: 'dribl',
      })
    }
    // 'sub' events exist in Dribl's data but match_events has no type for
    // them yet — skipped, not dropped by mistake.
  }
  return rows
}

function titleCase(name: string) {
  return name.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

// Only notifies for featured fixtures, the ones people could actually
// have picked, notifying on every one of the ~90 weekly results across
// all three competitions would be way too much noise.
async function notifyCompletedFeaturedFixtures(supabase: SupabaseClientAny) {
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, home_team, away_team, home_score, away_score')
    .eq('status', 'completed')
    .eq('featured', true)
    .eq('notified_result', false)
  if (error) throw error
  if (!data?.length) return 0

  const body =
    data.length === 1
      ? `${data[0].home_team} ${data[0].home_score}-${data[0].away_score} ${data[0].away_team}`
      : `${data.length} results are in, check your picks`

  const sent = await sendPushToAll(supabase, { title: 'Full time', body, url: '/predictions' })

  await supabase
    .from('fixtures')
    .update({ notified_result: true })
    .in('id', data.map((f: { id: string }) => f.id))

  return sent
}

// Fixed weekly schedule instead of a kickoff-relative one: Monday through
// Saturday at 12pm Sydney time, to whoever hasn't completed every fixture
// in the current featured round yet — stops reaching a user the moment
// they submit, simply by no longer matching the "incomplete" filter.
// Runs off the existing 15-min cron, so it's gated in-function on the
// current Sydney weekday/hour rather than needing its own cron entry, and
// claims a `daily_notifications` row first so re-checking every 15 minutes
// through the 12 o'clock hour only ever sends once.
async function notifyDailyPicksReminder(supabase: SupabaseClientAny) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Sydney',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date())
  const weekday = parts.find((p) => p.type === 'weekday')?.value
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)

  if (weekday === 'Sun' || hour !== 12) return 0

  const sydneyDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date())
  const { error: claimError } = await supabase
    .from('daily_notifications')
    .insert({ type: 'picks_reminder', sent_on: sydneyDate })
  if (claimError) return 0 // already sent today, or a real error either way there's nothing more to do here

  const { data: allFeatured, error: featuredError } = await supabase
    .from('fixtures')
    .select('id')
    .eq('featured', true)
    .eq('status', 'scheduled')
  if (featuredError) throw featuredError
  const roundFixtureIds: string[] = (allFeatured ?? []).map((f: { id: string }) => f.id)
  if (roundFixtureIds.length === 0) return 0

  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id')
  if (profilesError) throw profilesError

  const { data: predictions, error: predictionsError } = await supabase
    .from('predictions')
    .select('user_id, fixture_id')
    .in('fixture_id', roundFixtureIds)
  if (predictionsError) throw predictionsError

  const pickedFixturesByUser: Record<string, Set<string>> = {}
  for (const p of predictions ?? []) {
    pickedFixturesByUser[p.user_id] ??= new Set()
    pickedFixturesByUser[p.user_id].add(p.fixture_id)
  }

  const incompleteUserIds = (profiles ?? [])
    .map((p: { id: string }) => p.id)
    .filter((userId: string) => (pickedFixturesByUser[userId]?.size ?? 0) < roundFixtureIds.length)

  return await sendPushToUsers(supabase, incompleteUserIds, {
    title: 'Pick your predictions',
    body: "This week's fixtures are up, get your picks in before kickoff.",
    url: '/predictions',
  })
}

// 3 points for an exact scoreline, 1 for picking the right outcome
// (win/draw/loss) with the wrong score, 0 otherwise. Doubled if the user
// marked that fixture their Joker for the round.
async function scorePredictions(supabase: SupabaseClientAny) {
  const { data: completedFixtures, error: fixturesError } = await supabase
    .from('fixtures')
    .select('id, home_score, away_score, kickoff_at')
    .eq('status', 'completed')
  if (fixturesError) throw fixturesError
  if (!completedFixtures?.length) return 0

  const { data: unscored, error: predictionsError } = await supabase
    .from('predictions')
    .select('id, user_id, fixture_id, home_score_pick, away_score_pick, is_joker')
    .in('fixture_id', completedFixtures.map((f: { id: string }) => f.id))
    .is('points_awarded', null)
  if (predictionsError) throw predictionsError
  if (!unscored?.length) return 0

  const fixturesById: Record<string, { home_score: number; away_score: number; kickoff_at: string }> = {}
  for (const f of completedFixtures) fixturesById[f.id] = f

  // Streaks are sequential per user, so picks must be scored in kickoff
  // order even when a run completes several fixtures across different
  // rounds at once.
  const sorted = [...unscored].sort((a, b) => {
    const ka = fixturesById[a.fixture_id]?.kickoff_at ?? ''
    const kb = fixturesById[b.fixture_id]?.kickoff_at ?? ''
    return ka.localeCompare(kb)
  })

  let count = 0
  for (const pick of sorted) {
    const fixture = fixturesById[pick.fixture_id]
    if (!fixture) continue

    const basePoints = scoreOnePrediction(fixture, pick)
    const points = pick.is_joker ? basePoints * 2 : basePoints
    const { error } = await supabase.from('predictions').update({ points_awarded: points }).eq('id', pick.id)
    if (!error) {
      count += 1
      await updateStreak(supabase, pick.user_id, points > 0)
    }
  }
  return count
}

// "Correct" for streak purposes means any points at all (right result,
// exact score or not) — the more generous, natural reading of a streak.
async function updateStreak(supabase: SupabaseClientAny, userId: string, correct: boolean) {
  const { data: existing } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak')
    .eq('user_id', userId)
    .maybeSingle()

  const current = correct ? (existing?.current_streak ?? 0) + 1 : 0
  const longest = Math.max(existing?.longest_streak ?? 0, current)

  await supabase.from('streaks').upsert(
    { user_id: userId, current_streak: current, longest_streak: longest, last_updated: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
}

// Full recompute rather than an incremental add, so it can never drift
// out of sync with `leaderboard` — mirrors how notifyRankChanges already
// treats the leaderboard as the source of truth on every scoring run.
async function updateBeatHostSeason(supabase: SupabaseClientAny) {
  const { data: hosts, error: hostsError } = await supabase.from('profiles').select('id').eq('is_host', true)
  if (hostsError) throw hostsError
  if (!hosts?.length) return 0

  const { data: leaderboard, error: leaderboardError } = await supabase.from('leaderboard').select('user_id, points')
  if (leaderboardError) throw leaderboardError
  if (!leaderboard?.length) return 0

  const seasonId = new Date().getFullYear().toString()
  const pointsByUserId: Record<string, number> = {}
  for (const entry of leaderboard) pointsByUserId[entry.user_id] = entry.points

  const rows = []
  for (const entry of leaderboard) {
    for (const host of hosts) {
      rows.push({
        user_id: entry.user_id,
        host_id: host.id,
        season_id: seasonId,
        user_points: entry.points,
        host_points: pointsByUserId[host.id] ?? 0,
        updated_at: new Date().toISOString(),
      })
    }
  }
  if (rows.length === 0) return 0

  const { error } = await supabase.from('beat_host_season').upsert(rows, { onConflict: 'user_id,host_id,season_id' })
  if (error) throw error
  return rows.length
}

// Fires once per round (not once per fixture) once every currently
// featured fixture has a final result. Round key mirrors the frontend's
// computeRoundKey: the earliest kickoff date among featured fixtures.
async function notifyRoundResultsSummary(supabase: SupabaseClientAny) {
  const { data: featured, error } = await supabase
    .from('fixtures')
    .select('id, status, kickoff_at')
    .eq('featured', true)
  if (error) throw error
  if (!featured?.length) return 0
  if (featured.some((f: { status: string }) => f.status !== 'completed')) return 0

  const earliest = featured.reduce((min: { kickoff_at: string }, f: { kickoff_at: string }) =>
    f.kickoff_at < min.kickoff_at ? f : min,
  )
  const roundKey = earliest.kickoff_at.slice(0, 10)

  const { data: existing } = await supabase
    .from('round_notifications')
    .select('results_notified')
    .eq('round_key', roundKey)
    .maybeSingle()
  if (existing?.results_notified) return 0

  // Personalize with each user's actual points this round rather than a
  // generic "results are in" nudge — "you scored 9 points" is a much
  // stronger reason to open the app than a blanket announcement.
  const fixtureIds = featured.map((f: { id: string }) => f.id)
  const { data: predictions, error: predictionsError } = await supabase
    .from('predictions')
    .select('user_id, points_awarded')
    .in('fixture_id', fixtureIds)
  if (predictionsError) throw predictionsError

  const pointsByUser: Record<string, number> = {}
  for (const p of predictions ?? []) {
    pointsByUser[p.user_id] = (pointsByUser[p.user_id] ?? 0) + (p.points_awarded ?? 0)
  }

  let sent = 0
  for (const [userId, points] of Object.entries(pointsByUser)) {
    try {
      sent += await sendPushToUsers(supabase, [userId], {
        title: 'Round results are in',
        body: `You scored ${points} point${points === 1 ? '' : 's'} this round — all games finished.`,
        url: '/predictions',
      })
    } catch (err) {
      await logError(supabase, 'notify-round-summary-send', err)
    }
  }

  await supabase
    .from('round_notifications')
    .upsert({ round_key: roundKey, results_notified: true }, { onConflict: 'round_key' })

  return sent
}

// Compares each user's current leaderboard position against their
// last-known one (stored on profiles.last_rank) and notifies whoever
// moved, in either direction — losing a spot is at least as motivating
// to check the app as gaining one.
async function notifyRankChanges(supabase: SupabaseClientAny) {
  const { data: leaderboard, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('points', { ascending: false })
  if (error) throw error
  if (!leaderboard?.length) return 0

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, last_rank')
  if (profilesError) throw profilesError

  const lastRankByUserId: Record<string, number | null> = {}
  for (const p of profiles ?? []) lastRankByUserId[p.id] = p.last_rank

  const topPoints = leaderboard[0].points
  let notified = 0

  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i]
    const rank = i + 1
    const previousRank = lastRankByUserId[entry.user_id]

    if (previousRank !== rank) {
      await supabase.from('profiles').update({ last_rank: rank }).eq('id', entry.user_id)
    }

    // No prior rank means this is the user's first-ever scored week —
    // nothing to compare against, and everyone would "move" at once.
    if (previousRank == null || previousRank === rank) continue

    const movedUp = rank < previousRank
    const gap = topPoints - entry.points
    const gapNote = rank === 1 ? " — you're #1!" : gap > 0 ? ` — ${gap} pt${gap === 1 ? '' : 's'} off 1st` : ''

    try {
      const sent = await sendPushToUsers(supabase, [entry.user_id], {
        title: movedUp ? 'You moved up the leaderboard' : 'You dropped on the leaderboard',
        body: `Now ${ordinal(rank)} with ${entry.points} pts${gapNote}`,
        url: '/predictions',
      })
      notified += sent
    } catch (err) {
      await logError(supabase, 'notify-rank-change-send', err)
    }
  }

  return notified
}

function ordinal(n: number) {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  const rem10 = n % 10
  if (rem10 === 1) return `${n}st`
  if (rem10 === 2) return `${n}nd`
  if (rem10 === 3) return `${n}rd`
  return `${n}th`
}

function scoreOnePrediction(
  fixture: { home_score: number; away_score: number },
  pick: { home_score_pick: number; away_score_pick: number },
) {
  if (pick.home_score_pick === fixture.home_score && pick.away_score_pick === fixture.away_score) return 3

  const actualOutcome = Math.sign(fixture.home_score - fixture.away_score)
  const pickedOutcome = Math.sign(pick.home_score_pick - pick.away_score_pick)
  return actualOutcome === pickedOutcome ? 1 : 0
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
