// Supabase Edge Function: pulls the show's Spotify RSS feed and/or YouTube
// playlist and upserts new episodes/clips into `episodes`. Deploy and
// schedule with `supabase functions deploy podcast-sync` + a cron trigger.
//
// "The Champagne Football Show with Gaz & Chaz", hosted on Acast,
// distributed via Anchor's RSS. 113 episodes live on this feed as of
// 2026-08-07; confirmed real, not a placeholder.
//
// Also pushes a notification when a genuinely new episode/clip lands,
// "new episode drops" was the clearest first trigger worth wiring up.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendPushToAll } from '../_shared/sendPush.ts'

const SPOTIFY_SHOW_RSS = 'https://anchor.fm/s/10ab793e0/podcast/rss'
// Channel UCbfWQYNp7XBsreEFSukTWlQ's uploads playlist (UC -> UU swap).
const YOUTUBE_PLAYLIST_ID = 'UUbfWQYNp7XBsreEFSukTWlQ'
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? ''

// deno-lint-ignore no-explicit-any
type SupabaseClientAny = any

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let inserted = 0
  const newTitles: string[] = []

  if (SPOTIFY_SHOW_RSS) {
    try {
      const result = await syncSpotify(supabase, SPOTIFY_SHOW_RSS)
      inserted += result.count
      newTitles.push(...result.newTitles)
    } catch (err) {
      await logError(supabase, 'spotify', err)
    }
  }

  if (YOUTUBE_PLAYLIST_ID && YOUTUBE_API_KEY) {
    try {
      const result = await syncYoutube(supabase, YOUTUBE_PLAYLIST_ID, YOUTUBE_API_KEY)
      inserted += result.count
      newTitles.push(...result.newTitles)
    } catch (err) {
      await logError(supabase, 'youtube', err)
    }
  }

  let notified = 0
  if (newTitles.length > 0) {
    try {
      notified = await sendPushToAll(supabase, {
        title: 'New episode is up',
        body: newTitles.length === 1 ? newTitles[0] : `${newTitles.length} new episodes/clips just dropped`,
        url: '/podcast',
      })
    } catch (err) {
      await logError(supabase, 'notify-new-episode', err)
    }
  }

  return new Response(JSON.stringify({ inserted, newTitles, notified }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function syncSpotify(supabase: SupabaseClientAny, feedUrl: string) {
  const res = await fetch(feedUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

  const { data: existing } = await supabase.from('episodes').select('external_id').eq('source', 'spotify')
  const existingIds = new Set((existing ?? []).map((e: { external_id: string }) => e.external_id))

  let count = 0
  const newTitles: string[] = []
  for (const block of itemBlocks) {
    const guid = extractTag(block, 'guid')
    // The RSS guid is Anchor's internal id, not a public Spotify episode id,
    // so it can't build a working open.spotify.com/embed/episode/ url. The
    // enclosure is a real, directly playable audio file, use that instead.
    const audioUrl = extractAttr(block, 'enclosure', 'url')
    if (!audioUrl) continue

    const title = extractTag(block, 'title')
    const { error } = await supabase.from('episodes').upsert(
      {
        title,
        description: extractTag(block, 'description'),
        type: 'episode',
        source: 'spotify',
        external_id: guid,
        embed_url: audioUrl,
        published_at: new Date(extractTag(block, 'pubDate')).toISOString(),
      },
      { onConflict: 'source,external_id', ignoreDuplicates: true },
    )
    if (!error) {
      count += 1
      if (!existingIds.has(guid)) newTitles.push(title)
    }
  }
  return { count, newTitles }
}

// YouTube's uploads playlist mixes full episodes and Shorts with no field
// marking which is which. A second call to videos.list for contentDetails
// gets each video's real duration so we can classify it ourselves: Shorts
// are capped at 3 minutes, so anything at or under that is a 'short',
// everything else is a full 'episode'.
const SHORT_MAX_SECONDS = 180

async function syncYoutube(
  supabase: SupabaseClientAny,
  playlistId: string,
  apiKey: string,
) {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${playlistId}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  const items = data.items ?? []
  const videoIds = items.map((item: { snippet: { resourceId: { videoId: string } } }) => item.snippet.resourceId.videoId)
  const durations = await fetchDurations(videoIds, apiKey)

  const { data: existing } = await supabase.from('episodes').select('external_id').eq('source', 'youtube')
  const existingIds = new Set((existing ?? []).map((e: { external_id: string }) => e.external_id))

  let count = 0
  const newTitles: string[] = []
  for (const item of items) {
    const videoId = item.snippet.resourceId.videoId
    const title = item.snippet.title
    const seconds = durations.get(videoId) ?? null
    const type = seconds !== null && seconds <= SHORT_MAX_SECONDS ? 'short' : 'episode'
    const { error } = await supabase.from('episodes').upsert(
      {
        title,
        description: item.snippet.description,
        type,
        source: 'youtube',
        external_id: videoId,
        embed_url: `https://www.youtube.com/embed/${videoId}`,
        published_at: new Date(item.snippet.publishedAt).toISOString(),
      },
      { onConflict: 'source,external_id', ignoreDuplicates: true },
    )
    if (!error) {
      count += 1
      if (!existingIds.has(videoId)) newTitles.push(title)
    }
  }
  return { count, newTitles }
}

async function fetchDurations(videoIds: string[], apiKey: string) {
  const durations = new Map<string, number>()
  if (videoIds.length === 0) return durations

  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return durations

  const data = await res.json()
  for (const item of data.items ?? []) {
    durations.set(item.id, parseIso8601Duration(item.contentDetails.duration))
  }
  return durations
}

function parseIso8601Duration(duration: string) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const [, hours, minutes, seconds] = match
  return (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0)
}

async function logError(supabase: SupabaseClientAny, source: string, err: unknown) {
  await supabase.from('ingestion_errors').insert({
    job: 'podcast',
    source,
    message: err instanceof Error ? err.message : String(err),
  })
}

function extractTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  if (match) return match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
  const selfClosing = block.match(new RegExp(`<${tag}[^>]*\\bvalue="([^"]*)"`))
  return selfClosing ? selfClosing[1] : ''
}

function extractAttr(block: string, tag: string, attr: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`))
  return match ? match[1] : ''
}
