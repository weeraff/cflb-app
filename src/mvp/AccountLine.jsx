import { useMvp } from './MvpLayout'

// "Playing as Gaz · Sign out" so signed-in players know why they weren't
// asked to sign up, and can switch accounts.
export default function AccountLine() {
  const { user, profile, signOut } = useMvp()
  if (!user) return null
  const name = profile?.display_name || user.email
  return (
    <p className="m-account">
      Playing as <strong>{name}</strong>
      <span aria-hidden="true"> · </span>
      <button type="button" className="m-account__out" onClick={signOut}>
        Sign out
      </button>
    </p>
  )
}
