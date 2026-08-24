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
// Channel's uploads playlist (UC -> UU swap, same convention podcast-sync
// uses) — playlistItems.list is a ~1-unit call vs. search.list's 100, so
// highlights matching goes through this instead of another search.
const FOOTBALL_NSW_UPLOADS_PLAYLIST_ID = 'UUToFlwuKwvsT0g2jTS2VcOA'
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? ''

// How far either side of "now" a fixture counts as being in its matchday
// window. Matches run ~100 minutes; 150 minutes past kickoff gives room
// for a slow finish before we stop looking for/at its stream.
const WINDOW_BEFORE_MS = 2 * 60 * 60 * 1000
const WINDOW_AFTER_MS = 150 * 60 * 1000

// Originally 48h on the assumption highlights land within a day or two
// of full time — in practice Football NSW's channel also carries First
// Grade highlights buried among a much higher-volume mix (U20s, League
// One/Two, other content) uploaded in between, so the 25-most-recent
// lookup was missing real, already-uploaded highlights simply because
// they'd scrolled past that window before this ever checked. A week
// gives real uploads much more room to be found without checking a
// match forever.
const HIGHLIGHTS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

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
type ResultFixture = {
  id: string
  home_team: string
  away_team: string
  kickoff_at: string
  highlights_video_id: string | null
  highlights_video_id_override: string | null
  highlights_checked_at?: string | null
}

// Below this age, only the cheap recent-uploads scan runs for a
// candidate. Above it, a targeted per-fixture search.list call (100
// units, ~100x a playlist page) also runs — confirmed necessary: a real,
// already-uploaded highlights video was still missing the recent-uploads
// scan (even at 250 items) simply because the channel's total upload
// volume across all its content buried it. Search is content-matched,
// not recency-limited, so it doesn't have that failure mode. Throttled to
// once an hour per fixture rather than every 10-minute tick so an
// unmatched fixture doesn't quietly burn quota while genuinely waiting on
// Football NSW to publish.
const SEARCH_FALLBACK_AFTER_MS = 60 * 60 * 1000

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const result: Record<string, unknown> = {}

  try {
    result.streams = await syncStreams(supabase)
  } catch (err) {
    await logError(supabase, 'stream-sync', err)
    result.streamsError = String(err)
  }

  try {
    result.highlights = await syncHighlights(supabase)
  } catch (err) {
    await logError(supabase, 'highlights-sync', err)
    result.highlightsError = String(err)
  }

  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
})

async function syncStreams(supabase: SupabaseClientAny) {
  const now = Date.now()
  const windowStart = new Date(now - WINDOW_BEFORE_MS).toISOString()
  const windowEnd = new Date(now + WINDOW_AFTER_MS).toISOString()

  // The "well past kickoff -> stream_status: 'ended'" cleanup below only
  // ever looks at scheduled/locked fixtures. If the official result lands
  // (status flips to 'completed' elsewhere) before that cleanup runs, the
  // fixture falls out of this function's query entirely and stream_status
  // sits at 'live' forever — clean those up unconditionally, regardless
  // of the matchday window.
  await supabase
    .from('fixtures')
    .update({ stream_status: 'ended' })
    .eq('status', 'completed')
    .in('stream_status', ['live', 'scheduled'])

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

function isHighlightsVideo(title: string) {
  return /highlights/i.test(title)
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

// Highlights uploads land within days of full time, so a video published
// well before kickoff or more than a week after can't be this match, no
// matter how well the team names line up — cuts down false positives from
// a rematch later in the season with an identical title shape.
const HIGHLIGHTS_MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

// Football NSW's own title text doesn't always use the club's full
// official name — confirmed against real titles: "Marconi Stallions FC"
// shows up as just "Marconi", "Western Sydney Wanderers FC" as "WSW",
// "APIA Leichhardt FC" as "APIA", "Central Coast Mariners FC" as "CCM".
// Each alias only goes in here once actually seen in a real title, not
// guessed — an alias that's wrong risks matching the wrong fixture's
// video, which this file's own matching rule below treats as worse than
// no match at all.
const TEAM_ALIASES: Record<string, string[]> = {
  'marconi stallions': ['marconi'],
  'western sydney wanderers': ['wsw'],
  'apia leichhardt': ['apia'],
  'central coast mariners': ['ccm'],
}

function nameVariants(normalizedName: string) {
  return [normalizedName, ...(TEAM_ALIASES[normalizedName] ?? [])]
}

// Requires both team names to appear in the title, and refuses to pick a
// side if more than one candidate fixture matches the same video — an
// ambiguous match is treated the same as no match. `referenceKickoffAt`
// additionally constrains by publish date, used for highlights matching
// only (live/upcoming broadcast search results carry no publish date).
function findMatch(
  fixture: { home_team: string; away_team: string },
  videos: { videoId: string; title: string; publishedAt?: string }[],
  referenceKickoffAt?: string,
) {
  const home = normalizeTeamName(fixture.home_team)
  const away = normalizeTeamName(fixture.away_team)
  if (!home || !away) return null

  const homeVariants = nameVariants(home)
  const awayVariants = nameVariants(away)

  const hits = videos.filter((v) => {
    const title = normalizeTeamName(v.title)
    if (!homeVariants.some((n) => title.includes(n)) || !awayVariants.some((n) => title.includes(n))) return false
    if (referenceKickoffAt && v.publishedAt) {
      const published = new Date(v.publishedAt).getTime()
      const kickoff = new Date(referenceKickoffAt).getTime()
      if (published < kickoff || published > kickoff + HIGHLIGHTS_MATCH_WINDOW_MS) return false
    }
    return true
  })

  if (hits.length === 1) return hits[0]

  // Confirmed against real data: Football NSW posts two videos per
  // fixture with near-identical, both-team-matching titles — one an
  // edited highlights reel ("Round 28 Highlights – Team A v Team B"),
  // the other a plain full match upload ("NPL Men's NSW - Team A v Team
  // B"), which without this made every fixture with both videos in reach
  // register as ambiguous even though only one is actually the highlights
  // video. This isn't guessing between different games — it's picking
  // the one video, among candidates that all already passed the team and
  // date checks, whose own title says what it is.
  if (hits.length > 1) {
    const labelled = hits.filter((v) => /highlights?/i.test(v.title))
    if (labelled.length === 1) return labelled[0]
  }

  return null
}

async function syncHighlights(supabase: SupabaseClientAny) {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')

  const windowStart = new Date(Date.now() - HIGHLIGHTS_WINDOW_MS).toISOString()

  const { data: overridden, error: overrideError } = await supabase
    .from('fixtures')
    .select('id, home_team, away_team, kickoff_at, highlights_video_id, highlights_video_id_override')
    .eq('competition', 'NPL NSW')
    .not('highlights_video_id_override', 'is', null)
  if (overrideError) throw overrideError

  // Only resolve overrides that are new or changed, not ones already
  // matching what's stored — no point re-spending quota confirming the
  // same manual pick every 10 minutes.
  const unresolvedOverrides = (overridden ?? []).filter(
    (f: ResultFixture) => f.highlights_video_id !== f.highlights_video_id_override,
  )

  const { data: candidates, error: candidatesError } = await supabase
    .from('fixtures')
    .select('id, home_team, away_team, kickoff_at, highlights_video_id, highlights_video_id_override, highlights_checked_at')
    .eq('competition', 'NPL NSW')
    .eq('status', 'completed')
    .is('highlights_video_id_override', null)
    .is('highlights_video_id', null)
    .gte('kickoff_at', windowStart)
  if (candidatesError) throw candidatesError

  if (unresolvedOverrides.length === 0 && !candidates?.length) {
    return { checked: 0, matched: 0, note: 'no completed fixtures awaiting highlights' }
  }

  let matched = 0
  const checkedAt = new Date().toISOString()
  // deno-lint-ignore no-explicit-any
  const diagnostics: any[] = []

  if (unresolvedOverrides.length > 0) {
    const ids = unresolvedOverrides.map((f: ResultFixture) => f.highlights_video_id_override).join(',')
    const url = `https://www.googleapis.com/youtube/v3/videos?part=id&id=${ids}&key=${YOUTUBE_API_KEY}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`videos.list HTTP ${res.status}`)
    const json = await res.json()
    const validIds = new Set((json.items ?? []).map((item: { id: string }) => item.id))

    for (const fixture of unresolvedOverrides) {
      const videoId = fixture.highlights_video_id_override!
      if (!validIds.has(videoId)) continue
      const { error } = await supabase
        .from('fixtures')
        .update({ highlights_video_id: videoId, highlights_checked_at: checkedAt })
        .eq('id', fixture.id)
      if (!error) matched += 1
    }
  }

  if (candidates?.length) {
    // Football NSW's channel carries full match replays and live-stream
    // VODs alongside the actual highlights reel, and team names alone
    // can't tell them apart — "NPL Men's NSW - Marconi v Sutherland"
    // (a full match) matches on team names exactly as well as "NPL Men's
    // NSW Round 28 Highlights - Marconi v Sutherland" (the real highlights
    // video) does. Confirmed real highlights titles consistently say
    // "Highlights"; requiring that word is what actually distinguishes
    // the short reel from the long replay, not team-name matching alone.
    const uploads = (await fetchRecentUploads()).filter((v) => isHighlightsVideo(v.title))

    for (const fixture of candidates as ResultFixture[]) {
      let hit = findMatch(fixture, uploads, fixture.kickoff_at)

      const lastChecked = fixture.highlights_checked_at ? new Date(fixture.highlights_checked_at).getTime() : 0
      const dueForSearchFallback = Date.now() - lastChecked > SEARCH_FALLBACK_AFTER_MS

      let searchResults: { videoId: string; title: string; publishedAt: string }[] = []
      if (!hit && dueForSearchFallback) {
        searchResults = (await searchChannelForHighlights(fixture.home_team, fixture.away_team)).filter((v) => isHighlightsVideo(v.title))
        hit = findMatch(fixture, searchResults, fixture.kickoff_at)
      }

      // Diagnostic for the next unmatched-title edge case: shows which
      // uploads/search results at least partially matched (one team name,
      // not necessarily both) so a genuine miss is distinguishable from a
      // still-unresolved ambiguity at a glance. Returned in the response
      // rather than written to ingestion_errors, which is service-role-
      // only by RLS design and unreadable via the anon key this function
      // gets manually invoked with.
      if (!hit && dueForSearchFallback) {
        const home = normalizeTeamName(fixture.home_team)
        const away = normalizeTeamName(fixture.away_team)
        const partialUploads = uploads.filter((v) => {
          const t = normalizeTeamName(v.title)
          return t.includes(home) || t.includes(away)
        })
        const partialSearch = searchResults.filter((v) => {
          const t = normalizeTeamName(v.title)
          return t.includes(home) || t.includes(away)
        })
        diagnostics.push({
          fixture: `${fixture.home_team} v ${fixture.away_team}`,
          kickoff_at: fixture.kickoff_at,
          uploadsFetched: uploads.length,
          uploadsPartialMatch: partialUploads.map((v) => ({ id: v.videoId, title: v.title, publishedAt: v.publishedAt })),
          searchResultsFetched: searchResults.length,
          searchPartialMatch: partialSearch.map((v) => ({ id: v.videoId, title: v.title, publishedAt: v.publishedAt })),
        })
      }

      if (hit) {
        const { error } = await supabase
          .from('fixtures')
          .update({ highlights_video_id: hit.videoId, highlights_checked_at: checkedAt })
          .eq('id', fixture.id)
        if (!error) matched += 1
      } else {
        await supabase.from('fixtures').update({ highlights_checked_at: checkedAt }).eq('id', fixture.id)
      }
    }
  }

  return { checked: unresolvedOverrides.length + (candidates?.length ?? 0), matched, diagnostics }
}

// The channel's upload volume (First Grade + U20s + League One/Two +
// other content, across a whole week) can easily push a real highlights
// video past the first 150 most recent uploads — confirmed directly: a
// real, hours-old highlights video was still missing at 3 pages (150
// items), and search.list's order=date fallback also missed it, because
// search relies on YouTube's separate search index which lags behind a
// brand-new upload by hours (a well-documented API behaviour, distinct
// from playlistItems.list, which is a direct un-indexed feed with no such
// lag). playlistItems.list is ~1 unit regardless of maxResults, so paging
// further to cover more of a week's uploads is still cheap insurance.
const UPLOADS_PAGES_TO_FETCH = 10

async function fetchRecentUploads() {
  const uploads: { videoId: string; title: string; publishedAt: string }[] = []
  let pageToken = ''

  for (let page = 0; page < UPLOADS_PAGES_TO_FETCH; page++) {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${FOOTBALL_NSW_UPLOADS_PLAYLIST_ID}` +
      `&maxResults=50&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`playlistItems.list HTTP ${res.status}`)
    const json = await res.json()

    for (const item of json.items ?? []) {
      uploads.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
      })
    }

    if (!json.nextPageToken) break
    pageToken = json.nextPageToken
  }

  return uploads.filter((v) => !isWomensContent(v.title))
}

// Content-matched rather than recency-limited, so a real highlights video
// can't be missed just because the channel posted a lot else that week.
// No publishedAfter/publishedBefore constraint here — findMatch's own
// publish-date proximity check (against kickoff_at) still applies once
// results come back.
async function searchChannelForHighlights(homeTeam: string, awayTeam: string) {
  const query = encodeURIComponent(`${homeTeam} ${awayTeam} highlights`)
  // order=date, not the default order=relevance — a highlights video
  // uploaded hours ago has no view/engagement signal yet, so relevance
  // ranking buries it behind older videos for the same two teams from
  // past rounds with the same title shape (confirmed: this was the exact
  // failure mode for a real, already-uploaded video). Newest-first is
  // also just the correct answer for "did this just get posted".
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${FOOTBALL_NSW_CHANNEL_ID}` +
    `&type=video&order=date&maxResults=15&q=${query}&key=${YOUTUBE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`search.list HTTP ${res.status}`)
  const json = await res.json()

  return (json.items ?? [])
    .map((item: { id: { videoId: string }; snippet: { title: string; publishedAt: string } }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
    }))
    .filter((v: { title: string }) => !isWomensContent(v.title))
}

async function logError(supabase: SupabaseClientAny, source: string, err: unknown) {
  await supabase.from('ingestion_errors').insert({
    job: 'stream-sync',
    source,
    message: err instanceof Error ? err.message : String(err),
  })
}
