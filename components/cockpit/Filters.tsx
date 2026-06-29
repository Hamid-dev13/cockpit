'use client'

import { Search } from 'lucide-react'
import type { Card } from '@/lib/types'
import { ORDER, STATUS } from '@/lib/status'

function Chip({
  active,
  onClick,
  label,
  n,
  dot,
}: {
  active: boolean
  onClick: () => void
  label: string
  n: number
  dot?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-sm rounded-lg px-2.5 h-8 border transition ${
        active ? 'bg-[var(--surface-2)] text-[var(--fg)]' : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)]'
      }`}
    >
      {dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}
      {label}
      <span className="text-[11px] text-[var(--muted)]">{n}</span>
    </button>
  )
}

export function Filters({
  cards,
  fStatus,
  onStatus,
  q,
  onQ,
}: {
  cards: Card[]
  fStatus: string
  onStatus: (s: string) => void
  q: string
  onQ: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <Chip active={fStatus === 'all'} onClick={() => onStatus('all')} label="Toutes" n={cards.length} />
      {ORDER.map((s) => (
        <Chip
          key={s}
          active={fStatus === s}
          onClick={() => onStatus(s)}
          label={STATUS[s].label}
          n={cards.filter((c) => c.status === s).length}
          dot={STATUS[s].dot}
        />
      ))}
      <div className="flex-1" />
      <div className="relative">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Filtrer…"
          className="bg-[var(--surface)] border rounded-lg pl-8 pr-3 h-8 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>
    </div>
  )
}
