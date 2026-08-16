// Supabase Edge Function: matches men's NPL NSW fixtures to Football
// NSW's live/upcoming YouTube broadcasts, so the frontend can embed the
// stream inline instead of linking out to YouTube.
//
// Football NSW streams every NPL NSW match (men's and women's) live and
// free on one mixed channel — Football NSW, UCToFlwuKwvsT0g2jTS2VcOA,
// confirmed via the channel page's own metadata on 2026-08-17. There's no
// per-fixture video id anywhere upstream, so this parses broadcast titles
// and fuzzy-matches them against our own fixture list.
//
// Deliberately conservative: women's content is hard-excluded before any
// team matching happens (never just deprioritised), and an ambiguous or
// partial match is left alone rather than guessed at — a wrong embed is
// worse than no embed. `fixtures.youtube_video_id_override`, set by hand
// in the table editor, always wins over auto-matching for that fixture.
//
// Deploy and schedule with `supabase functions deploy stream-sync` (cron
// already wired in supabase/migrations, every 10 minutes). The function
// itself no-ops before making any YouTube API call unless a fixture is
// actually inside its matchday window — quota is a finite, shared budget
// with podcast-sync, this must not burn it on the days nothing's on.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const FOOTBALL_NSW_CHANNEL_ID = 'UCToFlwuKwvsT0g2jTS2VcOA'
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? ''

// How far either side of "now" a fixture counts as being in its matchday
// window. Matches run ~100 minutes; 150 minutes past kickoff gives room
// for a slow finish before we stop looking for/at its stream.
const WINDOW_BEFORE_MS = 2 * 60 * 60 * 1000
const WINDOW_AFTER_MS = 150 * 60 * 1000

// deno-lint-ignore no-explicit-any
type SupabaseClientAny = any
type Fixture = {
  id: string
  home_team: string
  away_team: string
  kickoff_at: string
  status: string
  stream_status: string
  youtube_video_id_override: string | null
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const result = await syncStreams(supabase)
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    await logError(supabase, 'stream-sync', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

async function syncStreams(supabase: SupabaseClientAny) {
  const now = Date.now()
  const windowStart = new Date(now - WINDOW_BEFORE_MS).toISOString()
  const windowEnd = new Date(now + WINDOW_AFTER_MS).toISOString()

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select('id, home_team, away_team, kickoff_at, status, stream_status, youtube_video_id_override')
    .eq('competition', 'NPL NSW')
    .in('status', ['scheduled', 'locked'])
    .gte('kickoff_at', windowStart)
    .lte('kickoff_at', windowEnd)

  if (error) throw error
  if (!fixtures?.length) return { checked: 0, matched: 0, note: 'no fixtures in matchday window' }

  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')

  const overridden = fixtures.filter((f: Fixture) => f.youtube_video_id_override)
  const autoMatch = fixtures.filter((f: Fixture) => !f.youtube_video_id_override)

  let matched = 0
  const checkedAt = new Date().toISOString()

  if (overridden.length > 0) {
    matched += await resolveOverrides(supabase, overridden, checkedAt)
  }

  if (autoMatch.length > 0) {
    matched += await resolveAutoMatches(supabase, autoMatch, checkedAt)
  }

  return { checked: fixtures.length, matched }
}

// videos.list accepts a comma-separated id list, so every manual override
// resolves in one ~1-unit call regardless of how many there are.
async function resolveOverrides(supabase: SupabaseClientAny, fixtures: Fixture[], checkedAt: string) {
  const ids = fixtures.map((f) => f.youtube_video_id_override).join(',')
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${ids}&key=${YOUTUBE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`videos.list HTTP ${res.status}`)
  const json = await res.json()

  const byId: Record<string, { liveBroadcastContent: string; actualEndTime?: string }> = {}
  for (const item of json.items ?? []) {
    byId[item.id] = {
      liveBroadcastContent: item.snippet.liveBroadcastContent,
      actualEndTime: item.liveStreamingDetails?.actualEndTime,
    }
  }

  let matched = 0
  for (const fixture of fixtures) {
    const videoId = fixture.youtube_video_id_override!
    const info = byId[videoId]
    const status = info ? broadcastToStreamStatus(info) : 'none'

    const { error } = await supabase
      .from('fixtures')
      .update({ youtube_video_id: videoId, stream_status: status, stream_last_checked_at: checkedAt })
      .eq('id', fixture.id)
    if (!error) matched += 1
  }
  return matched
}

async function resolveAutoMatches(supabase: SupabaseClientAny, fixtures: Fixture[], checkedAt: string) {
  const liveVideos = await searchChannel('live')

  // Upcoming-broadcast lookup is a second full-price search call, so only
  // spend it when at least one fixture hasn't kicked off yet — nothing to
  // gain checking "upcoming" for a match already in progress.
  const needsUpcoming = fixtures.some((f) => f.status === 'scheduled')
  const upcomingVideos = needsUpcoming ? await searchChannel('upcoming') : []

  let matched = 0
  for (const fixture of fixtures) {
    const liveHit = findMatch(fixture, liveVideos)
    if (liveHit) {
      const { error } = await supabase
        .from('fixtures')
        .update({ youtube_video_id: liveHit.videoId, stream_status: 'live', stream_last_checked_at: checkedAt })
        .eq('id', fixture.id)
      if (!error) matched += 1
      continue
    }

    const upcomingHit = findMatch(fixture, upcomingVideos)
    if (upcomingHit) {
      const { error } = await supabase
        .from('fixtures')
        .update({ youtube_video_id: upcomingHit.videoId, stream_status: 'scheduled', stream_last_checked_at: checkedAt })
        .eq('id', fixture.id)
      if (!error) matched += 1
      continue
    }

    // No live or upcoming broadcast found this check. If we'd previously
    // matched a stream for this fixture and it's well past kickoff, the
    // broadcast has ended — YouTube stops returning it from eventType
    // searches once it's no longer live, so absence here is the signal.
    const wellPastKickoff = new Date(fixture.kickoff_at).getTime() + 100 * 60 * 1000 < Date.now()
    if (wellPastKickoff && (fixture.stream_status === 'live' || fixture.stream_status === 'scheduled')) {
      await supabase
        .from('fixtures')
        .update({ stream_status: 'ended', stream_last_checked_at: checkedAt })
        .eq('id', fixture.id)
    } else {
      await supabase.from('fixtures').update({ stream_last_checked_at: checkedAt }).eq('id', fixture.id)
    }
  }
  return matched
}

function broadcastToStreamStatus(info: { liveBroadcastContent: string; actualEndTime?: string }) {
  if (info.actualEndTime) return 'ended'
  if (info.liveBroadcastContent === 'live') return 'live'
  if (info.liveBroadcastContent === 'upcoming') return 'scheduled'
  return 'ended'
}

async function searchChannel(eventType: 'live' | 'upcoming') {
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${FOOTBALL_NSW_CHANNEL_ID}` +
    `&eventType=${eventType}&type=video&maxResults=25&key=${YOUTUBE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`search.list HTTP ${res.status}`)
  const json = await res.json()

  return (json.items ?? [])
    .map((item: { id: { videoId: string }; snippet: { title: string } }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title as string,
    }))
    .filter((v: { title: string }) => !isWomensContent(v.title))
}

const WOMENS_PATTERN = /women'?s|nplw|\bladies\b|\bw[- ]?league\b/i

function isWomensContent(title: string) {
  return WOMENS_PATTERN.test(title)
}

// Strips common club-name noise so "Sydney FC" matches "Sydney FC NPL
// Men's" and similar upstream variations, without being loose enough to
// cross-match different clubs.
function normalizeTeamName(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(fc|sc|afc|fa|cfc|npl|reserves?|men'?s|first grade|u\d+)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Requires both team names to appear in the title, and refuses to pick a
// side if more than one candidate fixture matches the same video — an
// ambiguous match is treated the same as no match.
function findMatch(fixture: Fixture, videos: { videoId: string; title: string }[]) {
  const home = normalizeTeamName(fixture.home_team)
  const away = normalizeTeamName(fixture.away_team)
  if (!home || !away) return null

  const hits = videos.filter((v) => {
    const title = normalizeTeamName(v.title)
    return title.includes(home) && title.includes(away)
  })

  return hits.length === 1 ? hits[0] : null
}

async function logError(supabase: SupabaseClientAny, source: string, err: unknown) {
  await supabase.from('ingestion_errors').insert({
    job: 'stream-sync',
    source,
    message: err instanceof Error ? err.message : String(err),
  })
}
