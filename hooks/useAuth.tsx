'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { setUnauthorizedHandler } from '@/lib/api'

export interface AuthUser {
  id: number
  email: string
  firstName: string
  lastName: string
}

export interface RegisterInput {
  firstName: string
  lastName: string
  email: string
  password: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function post(url: string, body?: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || 'Une erreur est survenue.')
  return data
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Quand un appel API perd definitivement la session, on repasse en deconnecte.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  const bootstrap = useCallback(async () => {
    try {
      let r = await fetch('/api/auth/me')
      if (r.status === 401) {
        const refreshed = await fetch('/api/auth/refresh', { method: 'POST' })
        if (refreshed.ok) r = await fetch('/api/auth/me')
      }
      if (r.ok) {
        const data = await r.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await post('/api/auth/login', { email, password })
    setUser(user)
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const { user } = await post('/api/auth/register', input)
    setUser(user)
  }, [])

  const logout = useCallback(async () => {
    await post('/api/auth/logout').catch(() => {})
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit etre utilise dans <AuthProvider>')
  return ctx
}
