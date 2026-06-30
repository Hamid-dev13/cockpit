'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Check, Undo2, Plus, CornerDownLeft } from 'lucide-react'
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
interface Turn {
  role: 'user' | 'assistant'
  content: string
  cardIds?: number[]
  actions?: Action[]
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
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)
  const [undone, setUndone] = useState<Record<string, boolean>>({})
  const [err, setErr] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  // Auto-scroll vers le bas a chaque nouveau message.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, loading])

  async function run(text: string) {
    const q = text.trim()
    if (!q || loading) return
    setInput('')
    setErr('')
    const next: Turn[] = [...turns, { role: 'user', content: q }]
    setTurns(next)
    setLoading(true)
    try {
      const messages = next.slice(-16).map((t) => ({ role: t.role, content: t.content }))
      const r = await ai('copilot', { messages, cards })
      const actions: Action[] = Array.isArray(r.actions) ? r.actions : []
      setTurns((ts) => [
        ...ts,
        { role: 'assistant', content: r.answer || '', cardIds: Array.isArray(r.cardIds) ? r.cardIds : [], actions },
      ])
      if (actions.length) onMutated?.() // le copilote a modifie des donnees : on recharge
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function undo(key: string, action: Action) {
    try {
      await ai('undo', { undo: action.undo })
      setUndone((u) => ({ ...u, [key]: true }))
      onMutated?.()
      onToast?.('Action annulée')
    } catch (e: any) {
      onToast?.(e.message || "Échec de l'annulation")
    }
  }

  function reset() {
    setTurns([])
    setUndone({})
    setErr('')
    setInput('')
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run(input)
            }}
            placeholder="Demande au copilote…"
            className="flex-1 bg-transparent text-[15px] focus:outline-none"
          />
          {turns.length > 0 && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--fg)] px-2 py-1 rounded-md border"
              title="Nouvelle conversation"
            >
              <Plus className="w-3 h-3" />
              Nouvelle
            </button>
          )}
          <kbd className="text-[10px] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border">esc</kbd>
        </div>

        <div ref={threadRef} className="max-h-96 overflow-y-auto p-2">
          {turns.length === 0 && !loading && !err && (
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

          {turns.map((t, ti) =>
            t.role === 'user' ? (
              <div key={ti} className="flex justify-end px-2 py-1.5">
                <div
                  className="max-w-[85%] text-sm px-3 py-2 rounded-2xl rounded-br-sm"
                  style={{ background: 'color-mix(in srgb,var(--accent) 14%,transparent)' }}
                >
                  {t.content}
                </div>
              </div>
            ) : (
              <div key={ti} className="px-2 py-1">
                <div className="px-3 py-2 text-sm leading-relaxed">
                  <RichText text={t.content} />
                </div>
                {t.actions?.map((a, ai2) => {
                  const key = `${ti}:${ai2}`
                  return (
                    <div
                      key={key}
                      className="mx-1 my-1 px-3 py-2 rounded-lg border flex items-center gap-2 text-sm"
                      style={{ borderColor: 'rgba(16,185,129,.35)', background: 'rgba(16,185,129,.07)' }}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className={undone[key] ? 'line-through text-[var(--muted)]' : ''}>{a.label}</span>
                      <button
                        onClick={() => undo(key, a)}
                        disabled={undone[key]}
                        className="ml-auto inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-50"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        {undone[key] ? 'Annulé' : 'Annuler'}
                      </button>
                    </div>
                  )
                })}
                {t.cardIds?.map((id) => {
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
            ),
          )}

          {loading && (
            <div className="p-4 text-sm text-[var(--muted)] inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Le copilote réfléchit…
            </div>
          )}
          {err && <div className="p-4 text-sm text-red-500">Erreur : {err}</div>}
        </div>

        {turns.length > 0 && (
          <div className="px-4 py-2 border-t text-[11px] text-[var(--muted)] flex items-center gap-1.5">
            <CornerDownLeft className="w-3 h-3" />
            Entrée pour envoyer · le copilote se souvient de la conversation
          </div>
        )}
      </div>
    </div>
  )
}
