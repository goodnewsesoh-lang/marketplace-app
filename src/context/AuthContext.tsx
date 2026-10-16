import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'
import { friendlyAuthError } from '../lib/errors'
import type { SellerProfile } from '../types'

export type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  is_admin: boolean
  is_suspended: boolean
}

type Result = { error: string | null }

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  seller: SellerProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<Result>
  signUp: (input: {
    email: string
    password: string
    username: string
    displayName: string
  }) => Promise<Result & { needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<Result>
  isUsernameAvailable: (username: string) => Promise<boolean>
  refreshProfile: () => Promise<void>
  refreshSeller: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_admin, is_suspended')
      .eq('id', userId)
      .maybeSingle()
    setProfile((data as Profile | null) ?? null)
  }, [])

  const loadSeller = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setSeller(null)
      return
    }
    const { data } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setSeller((data as SellerProfile | null) ?? null)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return
        setSession(data.session)
        await Promise.all([
          loadProfile(data.session?.user.id),
          loadSeller(data.session?.user.id),
        ])
      })
      .catch(() => {
        // Offline or misconfigured: continue as a signed-out visitor.
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      // Defer the queries so they never run inside the auth callback.
      setTimeout(() => {
        void loadProfile(newSession?.user.id)
        void loadSeller(newSession?.user.id)
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile, loadSeller])

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    return { error: error ? friendlyAuthError(error) : null }
  }, [])

  const signUp = useCallback<AuthContextValue['signUp']>(
    async ({ email, password, username, displayName }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            username: username.trim().toLowerCase(),
            display_name: displayName.trim(),
          },
        },
      })
      if (error) {
        return { error: friendlyAuthError(error), needsEmailConfirmation: false }
      }
      // With "Confirm email" on, there is a user but no session yet.
      return { error: null, needsEmailConfirmation: !data.session }
    },
    [],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSeller(null)
  }, [])

  const resetPassword = useCallback<AuthContextValue['resetPassword']>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
    return { error: error ? friendlyAuthError(error) : null }
  }, [])

  const isUsernameAvailable = useCallback(async (username: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle()
    // If the check itself fails, let the sign-up attempt decide.
    if (error) return true
    return !data
  }, [])

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id)
  }, [loadProfile, session?.user.id])

  const refreshSeller = useCallback(async () => {
    await loadSeller(session?.user.id)
  }, [loadSeller, session?.user.id])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      seller,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      isUsernameAvailable,
      refreshProfile,
      refreshSeller,
    }),
    [
      session,
      profile,
      seller,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      isUsernameAvailable,
      refreshProfile,
      refreshSeller,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
