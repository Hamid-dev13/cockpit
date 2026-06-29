'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { ai } from '@/lib/api'

export function PasteModal({ onClose, onCreate }: { onClose: () => void; onCreate: (g: any, raw: string) => Promise<void> }) {
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function go() {
    if (!raw.trim()) return
    setLoading(true)
    setErr('')
    try {
      const g = await ai('extract', { raw })
      await onCreate(g, raw)
    } catch (e: any) {
      setErr(e.message)
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 grid place-items-start justify-center pt-28 animate-fadein"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl mx-4 glass border rounded-2xl ring-glow p-5 animate-fadein">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="font-semibold">Coller une offre</span>
          <span className="text-xs text-[var(--muted)]">— l&apos;IA extrait les infos</span>
        </div>
        <textarea
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          placeholder="Colle l'URL ou tout le texte de l'offre ici…"
          className="w-full bg-[var(--surface)] border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
        />
        <div className="mt-2 text-[11px] text-[var(--muted)]">
          Astuce : l&apos;URL d&apos;une offre précise (pas une recherche). Indeed/LinkedIn bloquent souvent — colle alors le texte de l&apos;annonce.
        </div>
        {err && <div className="mt-2 text-sm text-red-500">Erreur : {err}</div>}
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--fg)] px-3 h-9">
            Annuler
          </button>
          <button
            onClick={go}
            disabled={loading}
            className="text-sm font-medium text-white rounded-lg px-4 h-9 inline-flex items-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extraction…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extraire &amp; créer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
