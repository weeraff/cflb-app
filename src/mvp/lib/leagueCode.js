// No 0/O or 1/I, so codes read out over the phone survive.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateLeagueCode() {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

export function joinUrl(code, origin = window.location.origin) {
  return `${origin}/join/${code}`
}
