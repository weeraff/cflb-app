// Turns off a player's email opt-in from a signed link. Called by the
// app's /unsubscribe page (JSON body) and by mail apps' one-click
// unsubscribe (POST with the id and token in the query string). Public:
// the signed token is the authorisation.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyUnsubscribeToken } from '../_shared/unsubscribe.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'method not allowed' }, 405)

  const url = new URL(req.url)
  let u = url.searchParams.get('u')
  let t = url.searchParams.get('t')
  if (!u || !t) {
    const body = await req.json().catch(() => ({}))
    u = body.u ?? null
    t = body.t ?? null
  }
  if (!u || !t || !(await verifyUnsubscribeToken(u, t))) return reply({ error: 'invalid link' }, 400)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { error } = await supabase
    .from('profiles')
    .update({ marketing_opt_in: false, consent_at: new Date().toISOString(), consent_version: 'unsubscribed-via-email' })
    .eq('id', u)
  if (error) return reply({ error: 'could not update' }, 500)
  return reply({ ok: true })
})
