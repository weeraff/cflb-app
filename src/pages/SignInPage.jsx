import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export default function SignInPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  useEffect(() => {
    if (auth?.user) navigate('/', { replace: true })
  }, [auth?.user, navigate])

  async function handleEmailSignIn(e) {
    e.preventDefault()
    if (!email) return
    await auth?.signInWithEmail(email)
    setMagicLinkSent(true)
  }

  return (
    <section className="sign-in-page">
      <h1>Sign In</h1>
      <p className="section-subtitle">Save your predictions, appear on the leaderboard, and get an app built around your team.</p>

      <div className="sign-in-page__body">
        <button className="button" onClick={auth?.signInWithGoogle}>Continue with Google</button>

        <form onSubmit={handleEmailSignIn} className="auth-email-form">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="button button--secondary" type="submit">Email me a sign-in link</button>
        </form>

        {magicLinkSent && <p className="auth-note">Check your inbox for the sign-in link.</p>}
        {!isSupabaseConfigured && <p className="auth-note">Supabase isn't connected yet, this is a preview of the sign-in flow.</p>}
      </div>
    </section>
  )
}
