// Holds a signed-out player's picks (and sign-up choices, and any league
// invite) while they sign up. Google sign-in leaves the page and comes
// back, so this has to live in localStorage, not React state.
const KEY = 'cflb-pending-signup'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function defaultStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadPending(storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.savedAt || Date.now() - data.savedAt > MAX_AGE_MS) {
      storage.removeItem(KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function savePending(data, storage = defaultStorage()) {
  try {
    storage?.setItem(KEY, JSON.stringify({ ...loadPending(storage), ...data, savedAt: Date.now() }))
  } catch {
    // Private mode / blocked storage: sign-up still works, picks just
    // need re-entering after a Google redirect.
  }
}

export function clearPending(storage = defaultStorage()) {
  try {
    storage?.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}
