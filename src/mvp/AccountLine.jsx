import { useState } from 'react'
import { Drawer } from 'vaul'
import { supabase } from '../lib/supabaseClient'
import { useMvp } from './MvpLayout'

function NameSheet({ open, onOpenChange, userId, current, onSaved }) {
  const [name, setName] = useState(current ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function save(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Use at least 2 characters.')
      return
    }
    setBusy(true)
    setError(null)
    const { data, error: saveError } = await supabase
      .from('profiles')
      .update({ display_name: trimmed.slice(0, 40) })
      .eq('id', userId)
      .select()
      .single()
    setBusy(false)
    if (saveError) {
      setError("Couldn't save that. Try again.")
      return
    }
    onSaved(data)
    onOpenChange(false)
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="m-sheet-overlay" />
        <Drawer.Content className="m-sheet" aria-describedby="m-name-desc">
          <div className="m-sheet__handle" />
          <div className="m-sheet__body">
            <Drawer.Title className="m-sheet__title">Your leaderboard name</Drawer.Title>
            <Drawer.Description id="m-name-desc" className="m-sheet__desc">
              This is what everyone sees on the leaderboard and in your leagues.
            </Drawer.Description>
            <form className="m-form" onSubmit={save}>
              <input
                className="m-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="nickname"
                aria-label="Leaderboard name"
              />
              {error && <p className="m-form-msg m-form-msg--error" role="alert">{error}</p>}
              <button type="submit" className="m-btn m-btn--block m-press" disabled={busy}>
                {busy ? 'Saving...' : 'Save name'}
              </button>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

// "Playing as Gaz · Change name · Sign out". Lets players who never saw the
// sign-up sheet (old accounts, Google sign-ups) set their leaderboard name.
export default function AccountLine() {
  const { user, profile, setProfile, signOut } = useMvp()
  const [editing, setEditing] = useState(false)
  if (!user) return null
  const name = profile?.display_name || user.email

  return (
    <>
      <p className="m-account">
        Playing as <strong>{name}</strong>
        <span aria-hidden="true"> · </span>
        <button type="button" className="m-account__out" onClick={() => setEditing(true)}>
          Change name
        </button>
        <span aria-hidden="true"> · </span>
        <button type="button" className="m-account__out" onClick={signOut}>
          Sign out
        </button>
      </p>
      {profile && (
        <NameSheet
          key={editing ? 'open' : 'closed'}
          open={editing}
          onOpenChange={setEditing}
          userId={user.id}
          current={profile.display_name}
          onSaved={setProfile}
        />
      )}
    </>
  )
}
