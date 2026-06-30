import { NextResponse } from 'next/server'
import { mistral, mistralJson } from '@/lib/mistral'
import { ExtractSchema, CopilotSchema } from '@/lib/ai-schemas'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

const NO_EMOJI = "N'utilise jamais d'emoji."

/** Delai ecoule depuis une date, en francais naturel (pour les relances). */
function humanAgo(date: Date): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days <= 1) return 'il y a quelques jours'
  if (days < 7) return `il y a ${days} jours`
  if (days < 14) return 'il y a une semaine'
  if (days < 35) return `il y a ${Math.round(days / 7)} semaines`
  if (days < 60) return 'il y a environ un mois'
  return `il y a ${Math.round(days / 30)} mois`
}

const FETCH_TIMEOUT = 12000
const MIN_TEXT = 200
const MAX_TEXT = 8000

/** Nettoie du HTML brut en texte lisible. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|li|br|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Lit une page via un "reader" externe qui rend le JS et renvoie du texte propre
 * (defaut: Jina AI Reader). Gere les sites rendus cote client et une partie des
 * protections anti-bot, la ou un simple fetch echoue.
 * Configurable par env: READER_URL (prefixe, "" pour desactiver), JINA_API_KEY (optionnel).
 */
async function fetchViaReader(url: string): Promise<string | null> {
  const prefix = process.env.READER_URL ?? 'https://r.jina.ai/'
  if (!prefix) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
  try {
    const headers: Record<string, string> = { Accept: 'text/plain' }
    if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`
    const res = await fetch(prefix + url, { headers, redirect: 'follow', signal: ctrl.signal })
    if (!res.ok) return null
    const text = (await res.text()).trim()
    return text.length > MIN_TEXT ? text.slice(0, MAX_TEXT) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch direct + nettoyage HTML par regex. Fallback quand le reader echoue. */
async function fetchRaw(url: string): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const text = stripHtml(await res.text())
    return text.length > MIN_TEXT ? text.slice(0, MAX_TEXT) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Recupere le texte d'une page (pour les offres collees sous forme d'URL).
 * Essaie d'abord le reader externe (JS + anti-bot), puis retombe sur un fetch brut.
 */
async function fetchPageText(url: string): Promise<string | null> {
  return (await fetchViaReader(url)) ?? (await fetchRaw(url))
}

export async function POST(req: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const { action } = body

  try {
    // ── Copilote : répond à une question en langage naturel sur le pipeline ──
    if (action === 'copilot') {
      const { q, cards } = body
      const result = await mistralJson(
        [
          {
            role: 'system',
            content:
              `Tu es le copilote d'une application personnelle de suivi de candidatures. ${NO_EMOJI} ` +
              `Tu reçois la liste des candidatures au format JSON (champs: id, company, role, status, last = timestamp ms de dernière activité, comments). ` +
              `Statuts possibles: wishlist, applied (postulé), interview (entretien), offer (offre), rejected (refusé). ` +
              `Réponds en français, de façon concise et actionnable. ` +
              `Pour les RELANCES, priorise les candidatures les plus INACTIVES (grand écart entre la date actuelle et "last") ` +
              `au statut applied ou interview ; ignore les statuts offer et rejected. ` +
              `Renvoie STRICTEMENT un objet JSON {"answer": string, "cardIds": number[]} ` +
              `où cardIds contient les id des candidatures pertinentes (tableau vide si aucune).`,
          },
          {
            role: 'user',
            content: `Date actuelle (ms): ${Date.now()}\nCandidatures:\n${JSON.stringify(cards)}\n\nQuestion: ${q}`,
          },
        ],
        CopilotSchema,
      )
      // Ne garde que les cardIds qui existent reellement (evite les ids hallucines).
      const known = new Set<number>(Array.isArray(cards) ? cards.map((c: any) => Number(c.id)) : [])
      const cardIds = result.cardIds.filter((id) => known.has(id))
      return NextResponse.json({ answer: result.answer, cardIds })
    }

    // ── Auto-fill : extrait les infos clés d'une offre collée ──
    if (action === 'extract') {
      const { raw } = body
      let source = String(raw || '').trim()
      const isUrl = /^https?:\/\//i.test(source)
      let fetchedOk = false
      if (isUrl) {
        const page = await fetchPageText(source)
        if (page) {
          source = page
          fetchedOk = true
        }
      }
      const parsed = await mistralJson(
        [
          {
            role: 'system',
            content:
              `Tu extrais les informations clés d'une offre d'emploi. ${NO_EMOJI} ` +
              `Renvoie STRICTEMENT un JSON {"company": string, "role": string, "salary": string, "stack": string[], "location": string}. ` +
              `Si une info est absente, mets "—" (ou [] pour stack). ` +
              `salary au format court ex "65–80k€". location ex "Remote", "Paris".`,
          },
          { role: 'user', content: source.slice(0, 8000) },
        ],
        ExtractSchema,
      )
      const description = fetchedOk || !isUrl ? source.slice(0, 5000) : ''
      return NextResponse.json({ ...parsed, _fetched: fetchedOk, description })
    }

    // ── Rédaction : relance / prépa entretien / résumé d'offre ──
    if (action === 'draft') {
      const { kind, card } = body

      if (kind === 'relance') {
        // Delai reel depuis le depot de la candidature (date de creation en base).
        let timing = 'recemment'
        if (card?.id) {
          const dbCard = await prisma.candidature.findFirst({ where: { id: Number(card.id), userId: auth.id } })
          if (dbCard) timing = humanAgo(dbCard.createdAt)
        }
        const sys =
          `Tu aides un chercheur d'emploi a rediger un email de relance court, professionnel et chaleureux. ${NO_EMOJI} ` +
          `Donne un objet et un corps. ` +
          `Signe avec le vrai nom du candidat : ${auth.firstName} ${auth.lastName}, et son email : ${auth.email}. ` +
          `N'utilise AUCUN crochet ni texte a remplir nulle part (ni pour le candidat, ni pour le destinataire) et n'invente pas de numero de telephone. ` +
          `Pour la salutation, le nom du recruteur est inconnu : ecris simplement "Bonjour," (sans crochet, sans nom invente). ` +
          `La candidature a ete deposee ${timing} : formule la temporalite ainsi (ex: "${timing}").`
        const text = await mistral([
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(card) },
        ])
        return NextResponse.json({ text })
      }

      const prompts: Record<string, string> = {
        prep:
          `Liste 4 à 6 questions d'entretien probables pour ce poste, chacune avec un conseil de préparation (méthode STAR si pertinent). ${NO_EMOJI}`,
        resume:
          `Résume cette candidature en quelques lignes: poste, stack, rémunération, localisation, et un mot sur le fit. ${NO_EMOJI}`,
      }
      const text = await mistral([
        { role: 'system', content: `Tu assistes un chercheur d'emploi. Réponds en français. ${prompts[kind] || prompts.resume}` },
        { role: 'user', content: JSON.stringify(card) },
      ])
      return NextResponse.json({ text })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur IA' }, { status: 500 })
  }
}
