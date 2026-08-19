import { NavLink, Outlet } from 'react-router-dom'
import SponsorShowcase from './SponsorShowcase'
import { useAuth } from '../context/AuthContext'
import { PREDICTIONS_COMING_SOON, SPONSORS_ENABLED } from '../lib/featureFlags'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/predictions', label: 'Predictions', soon: PREDICTIONS_COMING_SOON },
  { to: '/podcast', label: 'Podcast' },
  { to: '/news', label: 'News' },
]

export default function Layout() {
  const auth = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__top">
          <span className="app-title">
            <img className="app-logo" src="/favicon.png" alt="" />
            <span className="app-title__text">
              <span className="app-title__full">Champagne Football Lemonade Banter</span>
              <span className="app-title__short">CFLB</span>
            </span>
          </span>
          {auth?.user ? (
            <button className="link-button" onClick={auth.signOut}>Sign out</button>
          ) : !PREDICTIONS_COMING_SOON ? (
            <NavLink to="/predictions" className="link-button">Sign in</NavLink>
          ) : null}
        </div>
        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="app-nav__link">
              {item.label}
              {item.soon && <span className="app-nav__tag">Soon</span>}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      {SPONSORS_ENABLED && <SponsorShowcase />}
    </div>
  )
}
