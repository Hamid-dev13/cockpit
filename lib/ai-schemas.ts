import { z } from 'zod'

/**
 * Schemas de validation des sorties IA structurees (JSON). Tolerants sur les
 * champs individuels (defaut si absent/vide/mauvais type) mais stricts sur la
 * forme globale : une sortie qui n'est pas l'objet attendu declenche un retry.
 */

/** Chaine optionnelle : null/undefined/"" -> defaut, sinon coercion en string. */
const optStr = (fallback = '—') =>
  z.preprocess((v) => (v === undefined || v === null || v === '' ? fallback : v), z.coerce.string()).catch(fallback)

export const ExtractSchema = z.object({
  company: optStr(),
  role: optStr(),
  salary: optStr(),
  stack: z.array(z.coerce.string()).catch([]),
  location: optStr(),
  contract: optStr(),
  remote: optStr(),
  seniority: optStr(),
  companyInfo: optStr(''),
})
export type ExtractResult = z.infer<typeof ExtractSchema>

export const CopilotSchema = z.object({
  // answer est requis : une reponse absente ou vide doit declencher un retry.
  answer: z.string().min(1),
  cardIds: z.array(z.coerce.number()).catch([]),
})
export type CopilotResult = z.infer<typeof CopilotSchema>
