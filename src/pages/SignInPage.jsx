import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import EmailPasswordAuth from '../components/EmailPasswordAuth'

export default function SignInPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (auth?.user) navigate('/', { replace: true })
  }, [auth?.user, navigate])

  return (
    <section className="sign-in-page">
      <h1>Sign In</h1>
      <p className="section-subtitle">Save your predictions, appear on the leaderboard, and get an app built around your team.</p>

      <div className="sign-in-page__body">
        <button className="button" onClick={auth?.signInWithGoogle}>Continue with Google</button>

        <EmailPasswordAuth />

        {!isSupabaseConfigured && <p className="auth-note">Supabase isn't connected yet, this is a preview of the sign-in flow.</p>}
      </div>
    </section>
  )
}
