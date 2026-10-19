// "Thu 22 Oct, 7:30pm" in the viewer's own time zone by default, so a
// Perth player sees their local kickoff time.
export function formatKickoff(iso, timeZone) {
  const date = new Date(iso)
  const opts = { timeZone, weekday: 'short', day: 'numeric', month: 'short' }
  const day = new Intl.DateTimeFormat('en-AU', opts).formatToParts(date)
  const get = (type) => day.find((p) => p.type === type)?.value
  const time = new Intl.DateTimeFormat('en-AU', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(date)
    .replace(/\s/g, '')
    .toLowerCase()
  return `${get('weekday')} ${get('day')} ${get('month')}, ${time}`
}
