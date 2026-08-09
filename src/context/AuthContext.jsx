import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) return
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  async function signInWithEmail(email) {
    if (!isSupabaseConfigured) return
    await supabase.auth.signInWithOtp({ email })
  }

  async function signOut() {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
