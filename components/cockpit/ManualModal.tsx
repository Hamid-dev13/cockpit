'use client'

import { useState } from 'react'
import { PenLine, Plus, Loader2 } from 'lucide-react'
import type { Channel } from '@/lib/types'
import { CHANNEL } from '@/lib/status'

export function ManualModal({ onClose, onCreate }: { onClose: () => void; onCreate: (body: Record<string, unknown>) => Promise<void> }) {
  const [kind, setKind] = useState('spontaneous')
  const [channel, setChannel] = useState<Channel>('email')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [salary, setSalary] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (!company.trim()) {
      setErr("Le nom de l'entreprise est requis.")
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onCreate({
        kind,
        channel,
        company: company.trim(),
        role: role.trim(),
        location: location.trim() || '—',
        salary: salary.trim() || '—',
        url: url.trim(),
        note: note.trim(),
        description: description.trim(),
      })
    } catch (e: any) {
      setErr(e.message || 'Erreur')
      setSaving(false)
    }
  }

  const field =
    'w-full bg-[var(--surface)] border rounded-lg px-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 grid place-items-start justify-center pt-20 animate-fadein overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg mx-4 mb-10 glass border rounded-2xl ring-glow p-5 animate-fadein">
        <div className="flex items-center gap-2 mb-4">
          <PenLine className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="font-semibold">Nouvelle candidature</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-[var(--muted)]">
            Nature
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={field + ' mt-1'}>
              <option value="offer">Offre</option>
              <option value="spontaneous">Spontanée</option>
              <option value="network">Réseau / Référence</option>
            </select>
          </label>
          <label className="text-xs text-[var(--muted)]">
            Canal
            <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className={field + ' mt-1'}>
              {(Object.keys(CHANNEL) as Channel[]).map((ch) => (
                <option key={ch} value={ch}>
                  {CHANNEL[ch].label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--muted)] col-span-2">
            Entreprise *
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex: Alan" className={field + ' mt-1'} autoFocus />
          </label>
          <label className="text-xs text-[var(--muted)] col-span-2">
            Poste / intitulé
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex: Développeur Fullstack" className={field + ' mt-1'} />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Localisation
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Paris / Remote" className={field + ' mt-1'} />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Rémunération
            <input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="65–80k€" className={field + ' mt-1'} />
          </label>
          <label className="text-xs text-[var(--muted)] col-span-2">
            Lien (optionnel)
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={field + ' mt-1'} />
          </label>
          <label className="text-xs text-[var(--muted)] col-span-2">
            Note de départ
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: Mail envoyé au CTO via LinkedIn" className={field + ' mt-1'} />
          </label>
          <label className="text-xs text-[var(--muted)] col-span-2">
            Description du poste
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Colle le descriptif de l'offre…"
              className="w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y mt-1"
            />
          </label>
        </div>

        {err && <div className="mt-3 text-sm text-red-500">{err}</div>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--fg)] px-3 h-9">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="text-sm font-medium text-white rounded-lg px-4 h-9 inline-flex items-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Créer
          </button>
        </div>
      </div>
    </div>
  )
}
