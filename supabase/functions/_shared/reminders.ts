// Pick-reminder timing and email copy. No imports so it runs under both
// Deno (the email-reminders function) and Vitest.

export type ReminderKind = 'day-before' | 'lock-day'

const HOUR = 60 * 60 * 1000
// Hours before lock each reminder may go out. The hourly job sends once,
// at the first run inside the window.
const WINDOWS: Record<ReminderKind, [number, number]> = {
  'day-before': [20, 26],
  'lock-day': [5, 11],
}
// Nobody gets a reminder before 8am or after 9pm Sydney time.
const QUIET_BEFORE = 8
const QUIET_FROM = 21

export function sydneyHour(date: Date): number {
  const hour = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', hour: 'numeric', hour12: false }).format(date)
  return Number(hour) % 24
}

export function reminderKind(lock: Date, now: Date): ReminderKind | null {
  const hoursLeft = (lock.getTime() - now.getTime()) / HOUR
  const hour = sydneyHour(now)
  if (hour < QUIET_BEFORE || hour >= QUIET_FROM) return null
  for (const kind of Object.keys(WINDOWS) as ReminderKind[]) {
    const [from, to] = WINDOWS[kind]
    if (hoursLeft >= from && hoursLeft <= to) return kind
  }
  return null
}

function lockTimeLabel(lock: Date): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', hour: 'numeric', minute: '2-digit', hour12: true })
    .format(lock)
    .replace(/\s/g, '')
    .toLowerCase()
}

function suffix(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return 'th'
  return { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10 as 1 | 2 | 3] ?? 'th'
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export type ReminderInput = {
  kind: ReminderKind
  displayName: string
  roundName: string
  lock: Date
  rank: number | null
  points: number
  picksUrl: string
  unsubscribeUrl: string
}

export function buildReminderEmail(input: ReminderInput): { subject: string; text: string; html: string } {
  const time = lockTimeLabel(input.lock)
  const evening = sydneyHour(input.lock) >= 17
  const when = input.kind === 'day-before' ? 'tomorrow' : evening ? 'tonight' : 'today'
  const subject = `${input.roundName} locks ${when} at ${time}`

  const standing =
    input.rank && input.points > 0
      ? `You're sitting ${input.rank}${suffix(input.rank)} on ${input.points} points.`
      : "You're on 0 points so far, plenty of time to climb."
  const opener =
    input.kind === 'day-before'
      ? `${input.roundName} locks ${when} at ${time} and your picks aren't in yet.`
      : `Last call. ${input.roundName} locks ${when} at ${time} and you haven't put your picks in.`

  const lines = [
    `Hey ${input.displayName},`,
    '',
    opener,
    '',
    standing,
    '',
    "8 games, couple of minutes. Don't forget your Joker, it doubles your points on one game.",
    '',
    `Make your picks: ${input.picksUrl}`,
    '',
    'Cheers,',
    'Gaz',
    'Champagne Football',
    '',
    `You're getting this because you said yes to round reminders. Unsubscribe: ${input.unsubscribeUrl}`,
  ]

  const name = escapeHtml(input.displayName)
  const html = `<!doctype html>
<html><head><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@500;800&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#eef2ef;font-family:'Barlow',Helvetica,Arial,sans-serif;color:#10241b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ef;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#1d5a43;padding:20px 24px;color:#ffffff;">
<div style="font-size:22px;font-weight:800;line-height:1.2;">${escapeHtml(subject)}</div>
</td></tr>
<tr><td style="padding:24px;font-size:16px;line-height:1.5;">
<p style="margin:0 0 14px;">Hey ${name},</p>
<p style="margin:0 0 14px;">${escapeHtml(opener)}</p>
<p style="margin:0 0 14px;"><strong>${escapeHtml(standing)}</strong></p>
<p style="margin:0 0 22px;">8 games, couple of minutes. Don't forget your Joker, it doubles your points on one game.</p>
<p style="margin:0 0 24px;"><a href="${escapeHtml(input.picksUrl)}" style="display:inline-block;background:#1d5a43;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:999px;">Make my picks</a></p>
<p style="margin:0;">Cheers,<br>Gaz<br>Champagne Football</p>
</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#5f7068;border-top:1px solid #dbe3df;">
You're getting this because you said yes to round reminders. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#5f7068;">Unsubscribe</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`

  return { subject, text: lines.join('\n'), html }
}
