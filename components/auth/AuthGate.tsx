'use client'

import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Cockpit } from '@/components/cockpit'
import { AuthScreen } from './AuthScreen'

export function AuthGate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-[var(--muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return user ? <Cockpit /> : <AuthScreen />
}
