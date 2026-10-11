import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthState = {
  // True until the stored session has been read on startup.
  loading: boolean
  session: Session | null
  // Throws InvalidCredentialsError on wrong email or password.
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('invalid credentials')
    this.name = 'InvalidCredentialsError'
  }
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
