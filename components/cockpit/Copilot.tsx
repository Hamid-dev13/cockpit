'use client'

import { useState } from 'react'
import { Bot, Loader2, Check, Undo2 } from 'lucide-react'
import type { Card } from '@/lib/types'
import { STATUS } from '@/lib/status'
import { momentum } from '@/lib/momentum'
import { ai } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { RichText } from './RichText'

interface Action {
  label: string
  undo: any
}

export function Copilot({
  cards,
  onClose,
  onOpen,
  onMutated,
  onToast,
}: {
  cards: Card[]
  onClose: () => void
  onOpen: (id: number) => void
  onMutated?: () => void
  onToast?: (m: string) => void
}) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<{ answer: string; cardIds: number[]; actions: Action[] } | null>(null)
  const [undone, setUndone] = useState<Record<number, boolean>>({})
  const [err, setErr] = useState('')

  async function run(text: string) {
    if (!text.trim()) return
    setQuery(text)
    setLoading(true)
    setErr('')
    setRes(null)
    setUndone({})
    try {
      const r = await ai('copilot', { q: text, cards })
      const actions: Action[] = Array.isArray(r.actions) ? r.actions : []
      setRes({ answer: r.answer || '', cardIds: Array.isArray(r.cardIds) ? r.cardIds : [], actions })
      if (actions.length) onMutated?.() // le copilote a modifie des donnees : on recharge
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function undo(i: number, action: Action) {
    try {
      await ai('undo', { undo: action.undo })
      setUndone((u) => ({ ...u, [i]: true }))
      onMutated?.()
      onToast?.('Action annulée')
    } catch (e: any) {
      onToast?.(e.message || "Échec de l'annulation")
    }
  }

  const suggestions = ['Qui je dois relancer ?', 'Résume mon pipeline', 'Mes entretiens à venir', 'Candidatures bloquées']

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 grid place-items-start justify-center pt-28 animate-fadein"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl mx-4 glass border rounded-2xl ring-glow overflow-hidden animate-fadein">
        <div className="flex items-center gap-3 px-4 h-14 border-b">
          <Bot className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run(query)
            }}
            placeholder="Demande au copilote…"
            className="flex-1 bg-transparent text-[15px] focus:outline-none"
          />
          <kbd className="text-[10px] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border">esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <div className="p-4 text-sm text-[var(--muted)] inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Le copilote analyse tes {cards.length} candidatures…
            </div>
          )}
          {err && <div className="p-4 text-sm text-red-500">Erreur : {err}</div>}
          {!loading && !res && !err && (
            <>
              <div className="px-3 pt-2 pb-1 text-sm">
                Salut <span className="font-semibold">{user?.firstName}</span> ! Comment je peux t&apos;aider
                aujourd&apos;hui&nbsp;?
              </div>
              <div className="text-[11px] text-[var(--muted)] px-2 py-1.5">Suggestions</div>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => run(s)}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] flex items-center gap-2"
                >
                  <span className="text-[var(--muted)]">›</span>
                  {s}
                </button>
              ))}
            </>
          )}
          {res && (
            <div className="p-2">
              <div className="px-3 py-2 text-sm leading-relaxed">
                <RichText text={res.answer} />
              </div>
              {res.actions.map((a, i) => (
                <div
                  key={i}
                  className="mx-1 my-1 px-3 py-2 rounded-lg border flex items-center gap-2 text-sm"
                  style={{ borderColor: 'rgba(16,185,129,.35)', background: 'rgba(16,185,129,.07)' }}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className={undone[i] ? 'line-through text-[var(--muted)]' : ''}>{a.label}</span>
                  <button
                    onClick={() => undo(i, a)}
                    disabled={undone[i]}
                    className="ml-auto inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-50"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    {undone[i] ? 'Annulé' : 'Annuler'}
                  </button>
                </div>
              ))}
              {res.cardIds.map((id) => {
                const c = cards.find((x) => x.id === id)
                if (!c) return null
                const m = momentum(c)
                return (
                  <button
                    key={id}
                    onClick={() => onOpen(id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)] flex items-center gap-3"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: STATUS[c.status].dot }} />
                    <span className="font-medium">{c.company}</span>
                    <span className="text-[var(--muted)] text-sm">{c.role}</span>
                    {m && <span className="ml-auto text-[11px] text-[var(--muted)]">{m.label}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
