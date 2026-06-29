import type { Card } from './types'

const DAY = 86400000

export type Risk = 'ok' | 'warm' | 'cool' | 'cold'

export interface Momentum {
  pct: number
  c1: string
  c2: string
  label: string
  risk: Risk
}

/** Chaleur d'une candidature, basée sur les jours d'inactivité (radar de ghosting). */
export function momentum(c: Card): Momentum | null {
  if (c.status === 'rejected' || c.status === 'offer') return null
  const d = Math.floor((Date.now() - c.last) / DAY)
  if (d <= 2) return { pct: 100, c1: '#10b981', c2: '#22d3ee', label: `Frais · J+${d}`, risk: 'ok' }
  if (d <= 5) return { pct: 70, c1: '#f59e0b', c2: '#10b981', label: `Tiède · J+${d}`, risk: 'warm' }
  if (d <= 9) return { pct: 40, c1: '#fb923c', c2: '#f59e0b', label: `Refroidit · J+${d}`, risk: 'cool' }
  return { pct: 15, c1: '#ef4444', c2: '#fb923c', label: `Ghosting · J+${d}`, risk: 'cold' }
}
