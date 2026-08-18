import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { sponsors as placeholderSponsors } from '../lib/placeholderData'

// Every page's footer strip — shows every active 'footer'-slot sponsor
// at once (unlike SponsorModule, which rotates a single sponsor for one
// contextual placement). Falls back to the placeholder list until
// Supabase is configured or before the live fetch resolves, same
// pattern as every other page in the app.
export default function SponsorShowcase() {
  const [sponsors, setSponsors] = useState(placeholderSponsors)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase
      .from('sponsors')
      .select('*')
      .eq('slot', 'footer')
      .eq('active', true)
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setSponsors(
            data.map((s) => ({
              id: s.id,
              name: s.name,
              headline: s.headline,
              cta: s.cta_text,
              image: s.logo_url,
              link_url: s.link_url,
            })),
          )
        }
      })
  }, [])

  if (sponsors.length === 0) return null

  return (
    <section className="sponsor-showcase">
      <span className="sponsor-showcase__label">Our Sponsors</span>
      <div className="sponsor-showcase__grid">
        {sponsors.map((sponsor) => (
          <a
            key={sponsor.id}
            className="sponsor-card"
            href={sponsor.link_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img className="sponsor-card__image" src={sponsor.image} alt="" loading="lazy" />
            <div className="sponsor-card__body">
              <span className="sponsor-card__name">{sponsor.name}</span>
              <span className="sponsor-card__headline">{sponsor.headline}</span>
              <span className="sponsor-card__cta">{sponsor.cta}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
