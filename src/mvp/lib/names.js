// Leaderboard names are unique (ignoring case and spacing), enforced by
// the profiles_display_name_unique index. These helpers keep every screen
// that sets a name saying the same thing.
export const NAME_TAKEN_MESSAGE = "That name's taken. Pick another."

export function cleanName(name) {
  return (name ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
}

export function isNameTakenError(error) {
  return error?.code === '23505' && /profiles_display_name_unique/.test(error.message ?? '')
}

// Placeholder for a Google sign-up whose first name is taken; they're
// asked to choose their own straight after.
export function nameWithSuffix(name) {
  const suffix = ` ${10 + Math.floor(Math.random() * 990)}`
  return cleanName(name).slice(0, 40 - suffix.length) + suffix
}
