// Hourly pick reminders by email, sent from the Champagne Football Google
// Workspace account over Gmail SMTP. Triggered by pg_cron (see migration
// 20261029100000_email_reminders.sql); only the service role may call it.
//
// Query params (service role only):
//   ?dry=1             report who would be emailed, send nothing
//   ?test=<address>    send one sample email, only to the sending account
//   ?kind=day-before|lock-day   force a reminder type for dry/test runs
//
// Secrets: GMAIL_USER, GMAIL_APP_PASSWORD, UNSUBSCRIBE_SECRET, and
// REMINDERS_LIVE=true to actually email players (dry and test runs work
// without it, so a real email can be checked before anyone is sent one).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'
import { buildReminderEmail, reminderKind, type ReminderKind } from '../_shared/reminders.ts'
import { unsubscribeEndpointUrl, unsubscribePageUrl } from '../_shared/unsubscribe.ts'

const PICKS_URL = 'https://play.champagnefootball.com.au/'
// Stop well inside the function time limit; anyone left gets theirs on
// the next hourly run (the window is several hours wide).
const TIME_BUDGET_MS = 100_000

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json' } })
}

// verify_jwt = true means the gateway has already checked the token's
// signature, so reading its role claim is safe. Comparing against the
// SUPABASE_SERVICE_ROLE_KEY env var doesn't work: the runtime's copy isn't
// byte-identical to the key pg_cron sends.
function isServiceRole(req: Request): boolean {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const payload = token.split('.')[1]
  if (!payload) return false
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return json.role === 'service_role'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!isServiceRole(req)) return reply({ error: 'forbidden' }, 403)

  const url = new URL(req.url)
  const dry = url.searchParams.get('dry') === '1'
  const testTo = url.searchParams.get('test')
  const forced = url.searchParams.get('kind') as ReminderKind | null
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  const { data: featured, error: fixturesError } = await supabase
    .from('fixtures')
    .select('round, kickoff_at')
    .eq('featured', true)
    .eq('competition', 'Australian Championship')
    .order('kickoff_at', { ascending: true })
  if (fixturesError) return reply({ error: fixturesError.message }, 500)
  if (!featured?.length) return reply({ skipped: 'no round featured' })

  const lock = new Date(featured[0].kickoff_at)
  const round = featured[0].round as string
  const hoursLeft = Math.round(((lock.getTime() - Date.now()) / 3_600_000) * 10) / 10
  const kind = (dry || testTo) && forced ? forced : reminderKind(lock, new Date())
  if (!kind) return reply({ skipped: 'outside send windows', round, hoursLeft })

  const gmailUser = Deno.env.get('GMAIL_USER')
  const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')

  if (testTo) {
    if (!gmailUser || !gmailPass) return reply({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD not set' }, 500)
    if (testTo.toLowerCase() !== gmailUser.toLowerCase()) return reply({ error: 'test emails only go to the sending account' }, 400)
  }

  const { data: recipients, error: recipientsError } = await supabase.rpc('reminder_recipients', { p_round: round, p_kind: kind })
  if (recipientsError) return reply({ error: recipientsError.message }, 500)

  if (dry) {
    return reply({ dry: true, round, kind, hoursLeft, count: recipients.length, names: recipients.map((r: { display_name: string }) => r.display_name) })
  }
  if (!gmailUser || !gmailPass) return reply({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD not set' }, 500)
  if (!testTo && Deno.env.get('REMINDERS_LIVE') !== 'true') {
    return reply({ skipped: 'REMINDERS_LIVE is not true yet', round, kind, wouldEmail: recipients.length })
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  })
  const from = `"Gaz at Champagne Football" <${gmailUser}>`

  async function send(to: string, userId: string, displayName: string, rank: number | null, points: number) {
    const email = buildReminderEmail({
      kind: kind!,
      displayName,
      roundName: round,
      lock,
      rank,
      points,
      picksUrl: PICKS_URL,
      unsubscribeUrl: await unsubscribePageUrl(userId),
    })
    await transporter.sendMail({
      from,
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: {
        'List-Unsubscribe': `<${await unsubscribeEndpointUrl(userId)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
  }

  if (testTo) {
    try {
      await send(testTo, '00000000-0000-0000-0000-000000000000', 'Gaz', 5, 14)
      return reply({ test: true, sentTo: testTo, round, kind })
    } catch (err) {
      return reply({ error: `send failed: ${err instanceof Error ? err.message : String(err)}` }, 500)
    }
  }

  const started = Date.now()
  let sent = 0
  const failed: string[] = []
  for (const r of recipients as { user_id: string; email: string; display_name: string; points: number; rank: number | null }[]) {
    if (Date.now() - started > TIME_BUDGET_MS) break
    try {
      await send(r.email, r.user_id, r.display_name, r.rank, r.points)
      await supabase.from('email_reminders_sent').insert({ round, kind, user_id: r.user_id })
      sent += 1
    } catch (err) {
      failed.push(err instanceof Error ? err.message : String(err))
    }
  }

  if (failed.length) {
    await supabase.from('ingestion_errors').insert({ job: 'email-reminders', source: `${round} ${kind}`, message: `${failed.length} failed: ${failed[0]}` })
  }
  return reply({ round, kind, sent, failed: failed.length, remaining: recipients.length - sent - failed.length })
})
