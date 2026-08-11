// Shared by any edge function that needs to notify subscribers. Uses the
// standard web-push npm package via Deno's npm: specifier support, no
// need to hand-roll the Web Push protocol (VAPID signing, payload
// encryption) ourselves.
import webpush from 'npm:web-push@3'

// deno-lint-ignore no-explicit-any
type SupabaseClientAny = any

export async function sendPushToAll(
  supabase: SupabaseClientAny,
  payload: { title: string; body: string; url?: string },
) {
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const { data: subs, error } = await supabase.from('push_subscriptions').select('*')
  if (error) throw error

  let sent = 0
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload),
      )
      sent += 1
    } catch (err) {
      // A dead subscription (browser uninstalled, permission revoked)
      // reports 404/410, clean those up rather than retrying forever.
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
  return sent
}
