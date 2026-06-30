'use client'

import { useState } from 'react'
import { Bot, Loader2 } from 'lucide-react'
import type { Card } from '@/lib/types'
import { STATUS } from '@/lib/status'
import { momentum } from '@/lib/momentum'
import { ai } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { RichText } from './RichText'

export function Copilot({
  cards,
  onClose,
  onOpen,
}: {
  cards: Card[]
  onClose: () => void
  onOpen: (id: number) => void
}) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<{ answer: string; cardIds: number[] } | null>(null)
  const [err, setErr] = useState('')

  async function run(text: string) {
    if (!text.trim()) return
    setQuery(text)
    setLoading(true)
    setErr('')
    setRes(null)
    try {
      const r = await ai('copilot', { q: text, cards })
      setRes({ answer: r.answer || '', cardIds: Array.isArray(r.cardIds) ? r.cardIds : [] })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
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
