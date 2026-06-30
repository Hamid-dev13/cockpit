'use client'

import { useState } from 'react'
import { ArrowLeft, Loader2, Check, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function SettingsView({ onBack }: { onBack: () => void }) {
  const { user, updateUser, logout } = useAuth()
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  const changed =
    firstName !== user?.firstName || lastName !== user?.lastName || email !== user?.email

  async function save() {
    if (!changed || saving) return
    setSaving(true)
    setErr('')
    setSaved(false)
    try {
      await updateUser({ firstName, lastName, email })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center gap-3 px-4 sm:px-6 h-16 border-b shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--fg)] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="font-bold tracking-tight">Paramètres</div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Compte</h2>
            <div className="space-y-4 glass border rounded-xl p-5">
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">
                  Prénom
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-[var(--surface)] border rounded-lg px-3 h-10 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">
                  Nom
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[var(--surface)] border rounded-lg px-3 h-10 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--surface)] border rounded-lg px-3 h-10 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              {err && <div className="text-sm text-red-500">{err}</div>}

              <button
                onClick={save}
                disabled={!changed || saving}
                className="w-full h-10 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : saved ? (
                  <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> Enregistré</span>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <div className="shrink-0 px-4 sm:px-6 py-4 border-t flex justify-end">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition px-3 py-2 rounded-lg hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
