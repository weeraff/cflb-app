import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

// Reusable content-driven sponsor placement (logo, headline, body, CTA) —
// new sponsors slot in by adding a row to `sponsors` with the right
// `slot`, no rebuild needed. When more than one sponsor is active in a
// slot, rotation picks one deterministically per `rotateKey` (e.g. the
// round key) so everyone sees the same sponsor for a given round.
export default function SponsorModule({ slot, rotateKey = '' }) {
  const [sponsor, setSponsor] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('sponsors')
      .select('*')
      .eq('slot', slot)
      .eq('active', true)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return
        const index = hashString(rotateKey) % data.length
        setSponsor(data[index])
      })
  }, [slot, rotateKey])

  if (!sponsor) return null

  return (
    <a className="sponsor-module" href={sponsor.link_url} target="_blank" rel="noopener noreferrer">
      {sponsor.logo_url && <img className="sponsor-module__logo" src={sponsor.logo_url} alt="" loading="lazy" />}
      <div className="sponsor-module__body">
        {sponsor.headline && <span className="sponsor-module__headline">{sponsor.headline}</span>}
        {sponsor.body && <span className="sponsor-module__text">{sponsor.body}</span>}
        <span className="sponsor-module__cta">{sponsor.cta_text} →</span>
      </div>
      <span className="sponsor-module__attribution">Presented by {sponsor.name}</span>
    </a>
  )
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}
