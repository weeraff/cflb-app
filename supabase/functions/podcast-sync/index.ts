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

async function syncYoutube(
  supabase: SupabaseClientAny,
  playlistId: string,
  apiKey: string,
) {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${playlistId}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  const { data: existing } = await supabase.from('episodes').select('external_id').eq('source', 'youtube')
  const existingIds = new Set((existing ?? []).map((e: { external_id: string }) => e.external_id))

  let count = 0
  const newTitles: string[] = []
  for (const item of data.items ?? []) {
    const videoId = item.snippet.resourceId.videoId
    const title = item.snippet.title
    const { error } = await supabase.from('episodes').upsert(
      {
        title,
        description: item.snippet.description,
        type: 'clip',
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
