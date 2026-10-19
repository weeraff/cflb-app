import { useState } from 'react'
import { Drawer } from 'vaul'
import { supabase } from '../lib/supabaseClient'
import { CONSENT_TEXT, consentFields } from './lib/consent'

// Shown once to existing players who were never properly asked (their old
// "yes" came from a pre-ticked box). Either answer is saved, so it never
// shows again.
export default function ConsentPrompt({ userId, onSaved }) {
  const [optIn, setOptIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function save() {
    setBusy(true)
    setError(null)
    const { data, error: saveError } = await supabase.from('profiles').update(consentFields(optIn)).eq('id', userId).select().single()
    setBusy(false)
    if (saveError) {
      setError('Could not save that. Try again.')
      return
    }
    onSaved(data)
  }

  return (
    <Drawer.Root open dismissible={false} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="m-sheet-overlay" />
        <Drawer.Content className="m-sheet" aria-describedby="m-consent-desc">
          <div className="m-sheet__body">
            <Drawer.Title className="m-sheet__title">Quick one before you pick</Drawer.Title>
            <Drawer.Description id="m-consent-desc" className="m-sheet__desc">
              We're doing the Australian Championship properly this year. Want us to keep you posted?
            </Drawer.Description>
            <div className="m-form">
              <label className="m-check">
                <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
                {CONSENT_TEXT}
              </label>
              {error && <p className="m-form-msg m-form-msg--error" role="alert">{error}</p>}
              <button type="button" className="m-btn m-btn--block m-press" onClick={save} disabled={busy}>
                {busy ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
