import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// "Keep me signed in" is a preference, not the session itself: it decides
// which storage the *next* write goes to, checked fresh on every read/write
// rather than baked in at client creation. That's what lets unchecking it
// at sign-in time actually take effect for that sign-in, since the
// Supabase client is a module-level singleton created once at import.
const KEEP_SIGNED_IN_KEY = 'cflb-keep-signed-in'

export function setKeepSignedIn(value) {
  localStorage.setItem(KEEP_SIGNED_IN_KEY, String(value))
}

function activeSessionStorage() {
  return localStorage.getItem(KEEP_SIGNED_IN_KEY) === 'false' ? sessionStorage : localStorage
}

const dynamicStorage = {
  getItem: (key) => activeSessionStorage().getItem(key),
  setItem: (key, value) => activeSessionStorage().setItem(key, value),
  removeItem: (key) => activeSessionStorage().removeItem(key),
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { storage: dynamicStorage } })
  : null
