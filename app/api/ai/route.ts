import { NextResponse } from 'next/server'
import { mistral } from '@/lib/mistral'
import { getAuth } from '@/lib/auth'

export const runtime = 'nodejs'

const NO_EMOJI = "N'utilise jamais d'emoji."

/** Télécharge une page et en extrait le texte brut (pour les offres collées sous forme d'URL). */
async function fetchPageText(url: string): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
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
    const html = await res.text()
    const text = html
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
    return text.length > 200 ? text.slice(0, 8000) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
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
      const content = await mistral(
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
        { json: true },
      )
      return NextResponse.json(JSON.parse(content))
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
      const content = await mistral(
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
        { json: true },
      )
      const parsed = JSON.parse(content)
      const description = fetchedOk || !isUrl ? source.slice(0, 5000) : ''
      return NextResponse.json({ ...parsed, _fetched: fetchedOk, description })
    }

    // ── Rédaction : relance / prépa entretien / résumé d'offre ──
    if (action === 'draft') {
      const { kind, card } = body
      const prompts: Record<string, string> = {
        relance:
          `Rédige un email de relance court, professionnel et chaleureux pour la candidature ci-dessous. Donne un objet et un corps. ${NO_EMOJI}`,
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
