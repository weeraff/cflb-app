// Supabase Edge Function: pulls Championship coverage from configured
// journalist/outlet sources and upserts new articles into news_items.
// Deploy and schedule with `supabase functions deploy news-sync` + a cron
// trigger (every 15-30 min).
//
// Two source types are supported (neither australianchampionship.com.au
// nor highpressau.com publish a maintained RSS feed — their /rss.xml and
// sitemap.xml only surface old/unrelated content, checked directly against
// the live sites before writing this):
//   - 'rss'         standard RSS/Atom feed (WordPress etc.)
//   - 'listing-og'  no usable feed; scrapes a listing page for article
//                   links, then reads each article's Open Graph tags
//                   (title, description, article:published_time). More
//                   expensive per run than RSS, so keep maxItems small.
import { createClient } from 'jsr:@supabase/supabase-js@2'

type RssSource = { name: string; type: 'rss'; feedUrl: string }
type ListingSource = {
  name: string
  type: 'listing-og'
  listingUrl: string
  linkPattern: RegExp // matched against href values found on the listing page
  maxItems: number
}

const SOURCES: (RssSource | ListingSource)[] = [
  {
    name: 'Australian Championship',
    type: 'listing-og',
    listingUrl: 'https://australianchampionship.com.au/news',
    linkPattern: /^\/news\/[a-z0-9-]+$/,
    maxItems: 15,
  },
  { name: 'NPL Men\'s NSW', type: 'rss', feedUrl: 'https://mens.nplnsw.com.au/feed/' },
  {
    name: 'HIGHPRESS',
    type: 'listing-og',
    listingUrl: 'https://www.highpressau.com/news',
    linkPattern: /^\/posts\/[a-z0-9-]+$/,
    maxItems: 15,
  },
  // Instagram (@auschampionship) has no public feed — needs the official
  // Instagram API with app review, not worth it for the beta. Revisit later.
]

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let inserted = 0

  for (const source of SOURCES) {
    try {
      const items =
        source.type === 'rss' ? await fetchRssItems(source) : await fetchListingOgItems(source)

      for (const item of items) {
        const { error } = await supabase.from('news_items').upsert(
          {
            source: source.name,
            title: item.title,
            url: item.link,
            snippet: item.description,
            image_url: item.imageUrl || null,
            published_at: item.pubDate,
          },
          { onConflict: 'url', ignoreDuplicates: true },
        )
        if (!error) inserted += 1
      }
    } catch (err) {
      await supabase.from('ingestion_errors').insert({
        job: 'news',
        source: source.name,
        message: err instanceof Error ? err.message : String(err),
      })
      // Deliberately continue to the next source — one bad source shouldn't
      // block the rest of the sync.
    }
  }

  return new Response(JSON.stringify({ inserted }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function fetchRssItems(source: RssSource) {
  const res = await fetch(source.feedUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const xml = await res.text()
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

  const items = itemBlocks.map((block) => ({
    title: stripHtml(extractTag(block, 'title')),
    link: extractTag(block, 'link'),
    description: stripWordPressBoilerplate(stripHtml(extractTag(block, 'description'))),
    pubDate: new Date(extractTag(block, 'pubDate')).toISOString(),
    imageUrl: '',
  }))

  // RSS doesn't carry a featured image, so fetch each article page's
  // og:image separately. Feeds here are small (~10-20 items), so this
  // stays cheap.
  for (const item of items) {
    item.imageUrl = await fetchOgImage(item.link)
  }

  return items
}

async function fetchListingOgItems(source: ListingSource) {
  const res = await fetch(source.listingUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()
  const base = new URL(source.listingUrl)

  const hrefs = [...html.matchAll(/href="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((href) => source.linkPattern.test(href))

  const uniqueUrls = [...new Set(hrefs)]
    .map((href) => new URL(href, base).toString())
    .slice(0, source.maxItems)

  const items = []
  for (const url of uniqueUrls) {
    try {
      const pageRes = await fetch(url)
      if (!pageRes.ok) continue
      const pageHtml = await pageRes.text()

      const title = extractMeta(pageHtml, 'og:title')
      if (!title) continue

      const publishedTime = extractMeta(pageHtml, 'article:published_time')

      items.push({
        title,
        link: extractMeta(pageHtml, 'og:url') || url,
        description: extractMeta(pageHtml, 'og:description') || '',
        imageUrl: extractMeta(pageHtml, 'og:image'),
        pubDate: publishedTime ? new Date(publishedTime).toISOString() : new Date().toISOString(),
      })
    } catch {
      // Skip a single unreadable article page, don't fail the whole source.
    }
  }
  return items
}

async function fetchOgImage(url: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) return ''
    return extractMeta(await res.text(), 'og:image')
  } catch {
    return ''
  }
}

function extractTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''
}

function extractMeta(html: string, property: string) {
  const match = html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`, 'i'))
  return match ? decodeHtmlEntities(match[1]) : ''
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, '')).trim()
}

// WordPress's default RSS excerpt appends "The post X appeared first on Y."
// — strip it so the aggregator shows a clean snippet, not WP boilerplate.
function stripWordPressBoilerplate(value: string) {
  return value.replace(/\s*The post .+ appeared first on .+\.\s*$/, '').trim()
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}
