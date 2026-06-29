'use client'

import { ChevronRight, MessageSquare } from 'lucide-react'
import type { Card } from '@/lib/types'
import { STATUS, KIND, CHANNEL } from '@/lib/status'
import { momentum } from '@/lib/momentum'
import { channelIcon } from './icons'

export function CandidatureRow({ c, onOpen, onCycle }: { c: Card; onOpen: () => void; onCycle: () => void }) {
  const st = STATUS[c.status]
  const m = momentum(c)
  const ChIcon = channelIcon(c.channel)

  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-[var(--surface-2)] transition"
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onCycle()
        }}
        title="Changer le statut"
        className="flex items-center gap-2 shrink-0 w-32 text-sm font-medium rounded-md px-2 py-1"
        style={{ background: st.tint, color: st.dot }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: st.dot }} />
        {st.label}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{c.company}</span>
          <span className="text-[var(--muted)] truncate">· {c.role}</span>
          {c.kind !== 'offer' && (
            <span
              className="text-[10px] px-1.5 py-px rounded border shrink-0"
              style={{
                color: 'var(--accent)',
                borderColor: 'color-mix(in srgb,var(--accent) 35%,transparent)',
                background: 'color-mix(in srgb,var(--accent) 8%,transparent)',
              }}
            >
              {KIND[c.kind].label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[var(--muted)]">
          <span className="inline-flex items-center gap-1 text-[10px]" title={CHANNEL[c.channel].label}>
            <ChIcon className="w-3 h-3" />
            {CHANNEL[c.channel].label}
          </span>
          {c.stack.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] bg-[var(--surface-2)] border rounded px-1.5 py-px">
              {t}
            </span>
          ))}
          {c.location && c.location !== '—' && <span className="text-[10px]">· {c.location}</span>}
          {c.comments.length > 0 && (
            <span className="text-[10px] inline-flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {c.comments.length}
            </span>
          )}
        </div>
      </div>

      <div className="w-40 shrink-0 hidden sm:block">
        {m ? (
          <>
            <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${m.pct}%`, background: `linear-gradient(90deg,${m.c1},${m.c2})` }}
              />
            </div>
            <div
              className={`text-[10px] mt-1 ${
                m.risk === 'cold' ? 'text-red-500' : m.risk === 'cool' ? 'text-orange-500' : 'text-[var(--muted)]'
              }`}
            >
              {m.label}
            </div>
          </>
        ) : (
          <div className="text-[10px] text-[var(--muted)] text-right">—</div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:translate-x-0.5 transition shrink-0" />
    </div>
  )
}
