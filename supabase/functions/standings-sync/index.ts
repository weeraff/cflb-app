// Supabase Edge Function: pulls Championship standings from the official
// Football Australia / NPL source and upserts into `standings`. Deploy
// and schedule with `supabase functions deploy standings-sync` + cron.
//
// TODO: confirm the exact Football Australia/NPL endpoint or page to pull
// from, then implement the fetch + parse below. The shape is intentionally
// left generic since the real source (API vs. HTML scrape) isn't confirmed.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const STANDINGS_SOURCE_URL = '' // TODO: official source endpoint

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  if (!STANDINGS_SOURCE_URL) {
    return new Response(
      JSON.stringify({ error: 'STANDINGS_SOURCE_URL not configured' }),
      { status: 501, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const res = await fetch(STANDINGS_SOURCE_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const rows = await parseStandings(res)

    for (const row of rows) {
      await supabase.from('standings').upsert(row, { onConflict: 'team' })
    }

    return new Response(JSON.stringify({ updated: rows.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    await supabase.from('ingestion_errors').insert({
      job: 'standings',
      source: 'football-australia',
      message: err instanceof Error ? err.message : String(err),
    })
    // Table stays on last-known-good data — failure never blanks the page.
    return new Response(JSON.stringify({ updated: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// deno-lint-ignore no-explicit-any
async function parseStandings(_res: Response): Promise<any[]> {
  // TODO: implement once the source format (JSON API vs. HTML table) is confirmed.
  return []
}
