'use client'

import { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useAuth()
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
    <>
      <div className="fixed inset-0 z-50 bg-black/50 animate-fadein" onClick={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center pointer-events-none">
        <div className="w-full max-w-md mx-4 glass border rounded-2xl overflow-hidden animate-fadein pointer-events-auto">
          <div className="flex items-center justify-between px-5 h-14 border-b">
            <div className="font-semibold">Paramètres du compte</div>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)] p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
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
    </>
  )
}
