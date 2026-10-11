import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { disablePush } from '../lib/push'
import { supabase } from '../lib/supabase'
import { clearCache } from '../query/client'
import { AuthContext, InvalidCredentialsError, type AuthState } from './AuthContext'

async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (!error) return
  if (error.code === 'invalid_credentials') throw new InvalidCredentialsError()
  throw new Error(error.message)
}

async function signOut(): Promise<void> {
  // While still signed in: this device must stop receiving this account's pushes.
  await disablePush().catch(() => undefined)
  // Local scope: the other phone stays signed in.
  await supabase.auth.signOut({ scope: 'local' })
  clearCache()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // Fires once with the stored session on startup, then on every change.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(() => ({ loading, session, signIn, signOut }), [loading, session])

  return <AuthContext value={value}>{children}</AuthContext>
}
