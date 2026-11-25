import { useEffect, useState, useCallback } from 'react'
import type { User } from 'firebase/auth'
import {
  subscribeToAuth,
  signInWithGoogle,
  signOutUser,
} from '@/services/firebaseService'

export function usePartyAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeToAuth((nextUser) => {
      setUser(nextUser)
      setIsAuthLoading(false)
    })
    return () => unsub()
  }, [])

  const signIn = useCallback(async (): Promise<User | null> => {
    try {
      setAuthError(null)
      return await signInWithGoogle()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed'
      setAuthError(msg)
      return null
    }
  }, [])

  const logOut = useCallback(async () => {
    try {
      setAuthError(null)
      await signOutUser()
    } catch {
      // ignore
    }
  }, [])

  return {
    user,
    isAuthLoading,
    authError,
    signIn,
    logOut,
  }
}

