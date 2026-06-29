import type { Card } from './types'

// Permet a l'AuthProvider d'etre notifie quand la session est definitivement perdue.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

/** Lit une reponse en JSON sans crasher si le serveur renvoie du HTML. */
async function readJson(r: Response) {
  const text = await r.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Réponse inattendue du serveur (${r.status}). Réessaie dans un instant.`)
  }
}

/**
 * fetch avec gestion transparente du refresh : si la requete renvoie 401,
 * on tente un /api/auth/refresh une fois, puis on rejoue la requete.
 */
async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  let r = await fetch(input, init)
  if (r.status === 401) {
    const refreshed = await fetch('/api/auth/refresh', { method: 'POST' })
    if (refreshed.ok) {
      r = await fetch(input, init)
    } else {
      onUnauthorized?.()
      throw new Error('Session expirée. Reconnecte-toi.')
    }
  }
  return r
}

// ── IA (extract / copilot / draft) ───────────────────────────────────────────
export async function ai(action: string, payload: Record<string, unknown>) {
  const r = await authFetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await readJson(r)
  if (!r.ok) throw new Error(data.error || `Erreur IA (${r.status})`)
  return data
}

// ── Candidatures (CRUD) ──────────────────────────────────────────────────────
export async function listCards(): Promise<Card[]> {
  const r = await authFetch('/api/candidatures')
  return readJson(r)
}

export async function createCard(body: Record<string, unknown>): Promise<Card> {
  const r = await authFetch('/api/candidatures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await readJson(r)
  if (!r.ok) throw new Error(data.error || 'Échec de la création')
  return data
}

export async function patchCard(id: number, body: Record<string, unknown>): Promise<Card> {
  const r = await authFetch(`/api/candidatures/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await readJson(r)
  if (!r.ok) throw new Error(data.error || 'Échec de la mise à jour')
  return data
}

export async function deleteCard(id: number): Promise<void> {
  const r = await authFetch(`/api/candidatures/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Échec de la suppression')
}
