// Signed unsubscribe links. The token is an HMAC of the user id, so a link
// only works for the person it was sent to and can't be guessed for anyone
// else. Secret: UNSUBSCRIBE_SECRET (Supabase function secrets).

const APP_URL = 'https://play.champagnefootball.com.au'

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function secret(): string {
  const s = Deno.env.get('UNSUBSCRIBE_SECRET')
  if (!s) throw new Error('UNSUBSCRIBE_SECRET is not set')
  return s
}

export async function unsubscribeToken(userId: string): Promise<string> {
  return (await hmacHex(secret(), `unsubscribe:${userId}`)).slice(0, 32)
}

export async function verifyUnsubscribeToken(userId: string, token: string): Promise<boolean> {
  const expected = await unsubscribeToken(userId)
  if (expected.length !== token.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i)
  return diff === 0
}

// Link in the email body: a page in the app (Supabase won't serve HTML
// from its function domain).
export async function unsubscribePageUrl(userId: string): Promise<string> {
  return `${APP_URL}/unsubscribe?u=${encodeURIComponent(userId)}&t=${await unsubscribeToken(userId)}`
}

// List-Unsubscribe header target: Gmail and Apple Mail POST here directly
// for their built-in one-click unsubscribe button.
export async function unsubscribeEndpointUrl(userId: string): Promise<string> {
  const base = Deno.env.get('SUPABASE_URL')
  return `${base}/functions/v1/unsubscribe?u=${encodeURIComponent(userId)}&t=${await unsubscribeToken(userId)}`
}
