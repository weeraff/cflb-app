import { sponsors } from '../lib/placeholderData'

export default function SponsorShowcase() {
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
