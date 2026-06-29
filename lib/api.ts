import type { Card } from './types'

/** Lit une réponse en JSON en évitant le crash « Unexpected token '<' » si le serveur renvoie du HTML. */
async function readJson(r: Response) {
  const text = await r.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Réponse inattendue du serveur (${r.status}). Réessaie dans un instant.`)
  }
}

// ── IA (extract / copilot / draft) ───────────────────────────────────────────
export async function ai(action: string, payload: Record<string, unknown>) {
  const r = await fetch('/api/ai', {
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
  const r = await fetch('/api/candidatures')
  return readJson(r)
}

export async function createCard(body: Record<string, unknown>): Promise<Card> {
  const r = await fetch('/api/candidatures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await readJson(r)
  if (!r.ok) throw new Error(data.error || 'Échec de la création')
  return data
}

export async function patchCard(id: number, body: Record<string, unknown>): Promise<Card> {
  const r = await fetch(`/api/candidatures/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await readJson(r)
  if (!r.ok) throw new Error(data.error || 'Échec de la mise à jour')
  return data
}

export async function deleteCard(id: number): Promise<void> {
  const r = await fetch(`/api/candidatures/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Échec de la suppression')
}
