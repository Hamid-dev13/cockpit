'use client'

import { Calendar, Flame, Sparkles } from 'lucide-react'
import type { Card } from '@/lib/types'
import { momentum } from '@/lib/momentum'

export function TodaySection({
  cards,
  onOpen,
  onCopilot,
}: {
  cards: Card[]
  onOpen: (id: number) => void
  onCopilot: () => void
}) {
  const interview = cards.find((c) => c.status === 'interview')
  const stale = cards.filter((c) => {
    const m = momentum(c)
    return m && (m.risk === 'cool' || m.risk === 'cold')
  })

  return (
    <section className="mb-7 animate-fadein">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
          Aujourd&apos;hui
        </span>
        <div
          className="h-px flex-1"
          style={{ background: 'linear-gradient(90deg,color-mix(in srgb,var(--accent) 40%,transparent),transparent)' }}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {interview && (
          <button
            onClick={() => onOpen(interview.id)}
            className="text-left p-4 rounded-xl border transition hover:bg-[var(--surface-2)]"
            style={{ borderColor: 'rgba(16,185,129,.4)', background: 'rgba(16,185,129,.06)' }}
          >
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Entretien à préparer
            </div>
            <div className="font-semibold">
              {interview.company} · {interview.role}
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">Génère des questions probables avec l&apos;IA →</div>
          </button>
        )}
        {stale[0] && (
          <button
            onClick={() => onOpen(stale[0].id)}
            className="text-left p-4 rounded-xl border transition hover:bg-[var(--surface-2)]"
            style={{ borderColor: 'rgba(251,146,60,.4)', background: 'rgba(251,146,60,.06)' }}
          >
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 text-xs font-semibold mb-1.5">
              <Flame className="w-3.5 h-3.5" />
              Relance recommandée
            </div>
            <div className="font-semibold">
              {stale[0].company} · {stale[0].role}
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">
              {momentum(stale[0])!.label} — relance avant que ça refroidisse.
            </div>
          </button>
        )}
        <button
          onClick={onCopilot}
          className="text-left p-4 rounded-xl border transition hover:bg-[var(--surface-2)]"
          style={{
            borderColor: 'color-mix(in srgb,var(--accent) 40%,transparent)',
            background: 'color-mix(in srgb,var(--accent) 7%,transparent)',
          }}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: 'var(--accent)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Copilote
          </div>
          <div className="font-semibold">Demande-moi n&apos;importe quoi</div>
          <div className="text-xs text-[var(--muted)] mt-1">« Qui je relance ? », « résume mon pipeline »…</div>
        </button>
      </div>
    </section>
  )
}
