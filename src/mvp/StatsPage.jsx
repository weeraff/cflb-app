import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useMvp } from './MvpLayout'
import { toCsv } from './lib/csv'

function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Admin only, not in the nav. The database functions refuse anyone not in
// the admins table, so this page is safe to leave reachable by URL.
export default function StatsPage() {
  const { user } = useMvp()
  const [stats, setStats] = useState(undefined)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.rpc('admin_stats').then(({ data, error }) => setStats(error ? null : data))
  }, [user])

  async function exportOptIns() {
    setExporting(true)
    setMessage(null)
    const { data, error } = await supabase.rpc('admin_optin_export')
    setExporting(false)
    if (error) {
      setMessage("Couldn't export. Try again.")
      return
    }
    const day = new Date().toISOString().slice(0, 10)
    downloadCsv(`cflb-opted-in-${day}.csv`, toCsv(data ?? [], ['display_name', 'email', 'consent_at', 'consent_version']))
  }

  const maxDay = Math.max(1, ...(stats?.signups_by_day ?? []).map((d) => d.signups))
  const rate = stats?.total_signups ? Math.round((stats.opted_in / stats.total_signups) * 100) : 0

  return (
    <div className="m-app">
      <header className="m-head">
        <h1 className="m-head__title">Sponsor stats</h1>
        <p className="m-head__sub">Live numbers for the pitch.</p>
      </header>

      <main className="m-list">
        {!user && <div className="m-notice">Sign in with an admin account to see this.</div>}
        {user && stats === null && <div className="m-notice m-notice--error">This page is for CFLB admins only.</div>}

        {stats && (
          <>
            <div className="m-stat-grid">
              <div className="m-stat">
                <div className="m-stat__value">{stats.total_signups}</div>
                <div className="m-stat__label">Players signed up</div>
              </div>
              <div className="m-stat">
                <div className="m-stat__value">{stats.opted_in}</div>
                <div className="m-stat__label">Opted in ({rate}%)</div>
              </div>
              <div className="m-stat">
                <div className="m-stat__value">{stats.opted_out}</div>
                <div className="m-stat__label">Said no</div>
              </div>
              <div className="m-stat">
                <div className="m-stat__value">{stats.not_asked}</div>
                <div className="m-stat__label">Not asked yet</div>
              </div>
            </div>

            <div className="m-notice">
              <button type="button" className="m-btn m-btn--block m-press" onClick={exportOptIns} disabled={exporting}>
                {exporting ? 'Preparing...' : `Download opted-in emails (${stats.opted_in})`}
              </button>
              {message && <p className="m-form-msg m-form-msg--error">{message}</p>}
            </div>

            <div className="m-notice">
              <h2 className="m-section-title">Players per round</h2>
              {stats.players_by_round.length === 0 ? (
                <p className="m-form-msg m-form-msg--info">No Championship picks yet.</p>
              ) : (
                <div className="m-bars" style={{ marginTop: '0.5rem' }}>
                  {stats.players_by_round.map((r) => (
                    <div key={r.round} className="m-bar">
                      <span>{r.round}</span>
                      <div className="m-bar__track">
                        <div className="m-bar__fill" style={{ width: `${(r.players / Math.max(1, stats.total_signups)) * 100}%` }} />
                      </div>
                      <span>{r.players}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="m-notice">
              <h2 className="m-section-title">Signups, last 30 days</h2>
              {stats.signups_by_day.length === 0 ? (
                <p className="m-form-msg m-form-msg--info">No signups in the last 30 days.</p>
              ) : (
                <div className="m-bars" style={{ marginTop: '0.5rem' }}>
                  {stats.signups_by_day.map((d) => (
                    <div key={d.day} className="m-bar">
                      <span>{new Date(d.day + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                      <div className="m-bar__track">
                        <div className="m-bar__fill" style={{ width: `${(d.signups / maxDay) * 100}%` }} />
                      </div>
                      <span>{d.signups}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
