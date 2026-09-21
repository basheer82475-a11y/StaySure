import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile, Role } from '@/types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (params: {
    fullName: string
    email: string
    phone: string
    password: string
    role: Role
  }) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!error && data) setProfile(data as Profile)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: friendlyAuthError(error.message) }
    return { error: null }
  }

  async function signUp({
    fullName,
    email,
    phone,
    password,
    role,
  }: {
    fullName: string
    email: string
    phone: string
    password: string
    role: Role
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, role } },
    })
    if (error) return { error: friendlyAuthError(error.message) }
    if (!data.user) return { error: 'Could not create account. Please try again.' }

    // Profile row is created by a DB trigger (see supabase/schema.sql) using the
    // metadata above, so we don't insert it here — that keeps signup atomic and
    // avoids RLS issues on a not-yet-authenticated insert.

    if (role === 'partner') {
      // Ensure a pg_partners row exists too (trigger also handles this, but
      // we double-check here in case the trigger hasn't run yet on this client).
      await supabase.from('pg_partners').upsert(
        { profile_id: data.user.id, business_name: fullName },
        { onConflict: 'profile_id', ignoreDuplicates: true }
      )
    }

    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (m.includes('user already registered')) return 'An account with this email already exists.'
  if (m.includes('password should be at least')) return 'Password must be at least 6 characters.'
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.'
  return 'Something went wrong. Please try again.'
}
