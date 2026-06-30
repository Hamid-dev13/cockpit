/**
 * Rate-limiting simple en memoire (fenetre fixe), par cle (ex: userId).
 * Suffisant pour un deploiement mono-instance (cas de l'app). En multi-instance,
 * remplacer par un store partage (Redis).
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/** Purge opportuniste des fenetres expirees pour borner la taille de la map. */
function purge(now: number) {
  if (buckets.size < 1000) return
  buckets.forEach((b, k) => {
    if (now >= b.resetAt) buckets.delete(k)
  })
}

export interface RateLimitResult {
  ok: boolean
  /** Secondes avant reinitialisation (si bloque). */
  retryAfter: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  purge(now)
  const b = buckets.get(key)
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count++
  return { ok: true, retryAfter: 0 }
}
