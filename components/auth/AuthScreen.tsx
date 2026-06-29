'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'login' | 'register'

export function AuthScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [allowRegistration, setAllowRegistration] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((d) => setAllowRegistration(!!d.allowRegistration))
      .catch(() => {})
  }, [])

  // Si l'inscription est fermee, on force le mode connexion.
  useEffect(() => {
    if (!allowRegistration) setMode('login')
  }, [allowRegistration])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({ firstName, lastName, email, password })
      }
    } catch (e: any) {
      setErr(e.message || 'Une erreur est survenue.')
      setLoading(false)
    }
  }

  const field =
    'w-full bg-[var(--surface)] border rounded-lg px-3 h-10 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div
            className="w-9 h-9 rounded-lg grid place-items-center text-base font-bold text-white"
            style={{ background: 'linear-gradient(135deg,var(--accent),#5b4bd6)' }}
          >
            C
          </div>
          <span className="text-lg font-bold tracking-tight">Cockpit</span>
        </div>

        <div className="glass border rounded-2xl ring-glow p-6">
          {allowRegistration ? (
            <div className="flex gap-1 p-1 mb-5 rounded-lg bg-[var(--surface-2)] border">
              <button
                onClick={() => {
                  setMode('login')
                  setErr('')
                }}
                className={`flex-1 text-sm rounded-md h-8 transition ${mode === 'login' ? 'bg-[var(--surface)] font-medium' : 'text-[var(--muted)]'}`}
              >
                Connexion
              </button>
              <button
                onClick={() => {
                  setMode('register')
                  setErr('')
                }}
                className={`flex-1 text-sm rounded-md h-8 transition ${mode === 'register' ? 'bg-[var(--surface)] font-medium' : 'text-[var(--muted)]'}`}
              >
                Inscription
              </button>
            </div>
          ) : (
            <div className="text-sm font-medium mb-5">Connexion</div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-[var(--muted)]">
                  Prénom
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field + ' mt-1'} required />
                </label>
                <label className="text-xs text-[var(--muted)]">
                  Nom
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={field + ' mt-1'} required />
                </label>
              </div>
            )}
            <label className="text-xs text-[var(--muted)] block">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
                className={field + ' mt-1'}
                required
              />
            </label>
            <label className="text-xs text-[var(--muted)] block">
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '8 caractères minimum' : ''}
                className={field + ' mt-1'}
                required
                minLength={8}
              />
            </label>

            {err && <div className="text-sm text-red-500">{err}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-sm font-medium text-white rounded-lg h-10 inline-flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[var(--muted)] mt-4">
          Tes candidatures sont privées et liées à ton compte.
        </p>
      </div>
    </div>
  )
}
