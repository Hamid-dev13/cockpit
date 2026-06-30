import { NextResponse } from 'next/server'
import { mistral, mistralJson, mistralWithTools, type ToolSpec } from '@/lib/mistral'
import { ExtractSchema } from '@/lib/ai-schemas'
import { ORDER, STATUS } from '@/lib/status'
import { momentum } from '@/lib/momentum'
import { rateLimit } from '@/lib/rate-limit'
import type { Status } from '@/lib/types'
import { getAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const KINDS = ['offer', 'spontaneous', 'network']

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

/**
 * Heuristique : distingue une page d'offre d'un site d'entreprise.
 * Un chemin contenant des mots cles d'offre ou profond -> offre ; une racine
 * de domaine (peu/pas de chemin) -> site d'entreprise.
 */
function classifyUrl(raw: string): 'offer' | 'company' {
  try {
    const u = new URL(raw)
    const offerRe = /(jobs?|offre|emploi|career|carriere|vacanc|recrut|hiring|position|stelle|apply|candidat|job[-_])/i
    if (offerRe.test(u.pathname) || offerRe.test(u.search)) return 'offer'
    const segments = u.pathname.split('/').filter(Boolean)
    return segments.length === 0 ? 'company' : 'offer'
  } catch {
    return 'offer'
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

  // Rate-limiting par utilisateur (protege contre les abus / couts IA).
  const limit = Number(process.env.AI_RATELIMIT_PER_MIN) || 30
  const rl = rateLimit(`ai:${auth.id}`, limit, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Trop de requêtes. Réessaie dans ${rl.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  try {
    // ── Annulation d'une action du copilote (undo) ──
    if (action === 'undo') {
      const { undo } = body
      if (!undo || typeof undo !== 'object') {
        return NextResponse.json({ error: 'Payload undo invalide' }, { status: 400 })
      }
      if (undo.kind === 'patch') {
        const c = await prisma.candidature.findFirst({ where: { id: Number(undo.id), userId: auth.id } })
        if (!c) return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })
        const data: any = {}
        if (undo.data?.status !== undefined) data.status = undo.data.status
        if (undo.data?.lastMs !== undefined) data.last = new Date(Number(undo.data.lastMs))
        await prisma.candidature.update({ where: { id: c.id }, data })
        return NextResponse.json({ ok: true })
      }
      if (undo.kind === 'delCandidature') {
        const c = await prisma.candidature.findFirst({ where: { id: Number(undo.id), userId: auth.id } })
        if (c) await prisma.candidature.delete({ where: { id: c.id } })
        return NextResponse.json({ ok: true })
      }
      if (undo.kind === 'delComment') {
        const com = await prisma.comment.findFirst({
          where: { id: Number(undo.commentId), candidature: { userId: auth.id } },
        })
        if (com) await prisma.comment.delete({ where: { id: com.id } })
        if (undo.id !== undefined && undo.lastMs !== undefined) {
          const c = await prisma.candidature.findFirst({ where: { id: Number(undo.id), userId: auth.id } })
          if (c) await prisma.candidature.update({ where: { id: c.id }, data: { last: new Date(Number(undo.lastMs)) } })
        }
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ error: 'Annulation inconnue' }, { status: 400 })
    }

    // ── Copilote agentique : répond et peut appeler des outils sur le pipeline ──
    if (action === 'copilot') {
      const { q, cards, messages } = body
      // Historique de conversation (multi-tours). Borne pour limiter cout/latence.
      const history: { role: 'user' | 'assistant'; content: string }[] = (
        Array.isArray(messages) && messages.length
          ? messages
          : [{ role: 'user', content: String(q ?? '') }]
      )
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m: any) => ({ role: m.role, content: m.content }))
        .slice(-16)
      const list: any[] = Array.isArray(cards) ? cards : []
      const fullPipeline = list.map((c) => {
        const m = momentum({ ...c, last: Number(c.last) })
        return {
          id: c.id,
          company: c.company,
          role: c.role,
          status: c.status,
          joursInactif: Math.floor((Date.now() - Number(c.last)) / 86400000),
          // Meme radar de ghosting que l'UI : ok | warm | cool | cold (null si offer/rejected).
          momentum: m?.risk ?? null,
          momentumLabel: m?.label ?? null,
        }
      })
      // Troncature : au-dela du plafond, on garde les plus pertinentes (statuts
      // actifs d'abord, puis les plus inactives) pour borner cout et latence.
      const MAX_PIPELINE = Number(process.env.AI_MAX_PIPELINE) || 100
      const truncated = fullPipeline.length > MAX_PIPELINE
      const ACTIVE = new Set(['applied', 'interview'])
      const pipeline = truncated
        ? [...fullPipeline]
            .sort((a, b) => {
              const aw = ACTIVE.has(a.status) ? 1 : 0
              const bw = ACTIVE.has(b.status) ? 1 : 0
              return bw - aw || b.joursInactif - a.joursInactif
            })
            .slice(0, MAX_PIPELINE)
        : fullPipeline

      // Ids confirmes via la base (toujours affiches) et suggeres par le modele (filtres).
      const confirmed = new Set<number>()
      const suggested = new Set<number>()
      // Actions modifiantes effectuees, avec de quoi les annuler cote client.
      const actions: { label: string; undo: any }[] = []

      const tools: ToolSpec[] = [
        {
          name: 'details_candidature',
          description: "Lit la description complete et les notes d'une candidature, par son id.",
          parameters: {
            type: 'object',
            properties: { id: { type: 'number', description: 'id de la candidature' } },
            required: ['id'],
          },
          handler: async ({ id }) => {
            const c = await prisma.candidature.findFirst({
              where: { id: Number(id), userId: auth.id },
              include: { comments: true },
            })
            if (!c) return 'Candidature introuvable.'
            confirmed.add(c.id)
            return JSON.stringify({
              id: c.id,
              company: c.company,
              role: c.role,
              status: c.status,
              salary: c.salary,
              stack: c.stack,
              location: c.location,
              description: (c.description || '').slice(0, 2000),
              notes: c.comments.map((x) => x.txt),
            })
          },
        },
        {
          name: 'mettre_en_avant_candidatures',
          description:
            "Signale a l'utilisateur les candidatures pertinentes : elles s'affichent sous ta reponse. Appelle cet outil pour toute candidature que tu cites.",
          parameters: {
            type: 'object',
            properties: { ids: { type: 'array', items: { type: 'number' } } },
            required: ['ids'],
          },
          handler: async ({ ids }) => {
            ;(Array.isArray(ids) ? ids : []).forEach((i: any) => suggested.add(Number(i)))
            return 'ok'
          },
        },
        {
          name: 'changer_statut',
          description: 'Change le statut d\'une candidature.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              statut: { type: 'string', enum: ORDER, description: 'wishlist, applied, interview, offer ou rejected' },
            },
            required: ['id', 'statut'],
          },
          handler: async ({ id, statut }) => {
            if (!ORDER.includes(statut)) return `Statut invalide: ${statut}.`
            const c = await prisma.candidature.findFirst({ where: { id: Number(id), userId: auth.id } })
            if (!c) return 'Candidature introuvable.'
            const prev = { status: c.status, lastMs: c.last.getTime() }
            await prisma.candidature.update({ where: { id: c.id }, data: { status: statut, last: new Date() } })
            confirmed.add(c.id)
            actions.push({
              label: `${c.company} → ${STATUS[statut as Status].label}`,
              undo: { kind: 'patch', id: c.id, data: prev },
            })
            return `Statut de ${c.company} change en ${statut}.`
          },
        },
        {
          name: 'marquer_relance',
          description: "Marque une candidature comme relancee aujourd'hui (remet son radar de momentum au vert).",
          parameters: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
          handler: async ({ id }) => {
            const c = await prisma.candidature.findFirst({ where: { id: Number(id), userId: auth.id } })
            if (!c) return 'Candidature introuvable.'
            const prevLastMs = c.last.getTime()
            await prisma.candidature.update({ where: { id: c.id }, data: { last: new Date() } })
            confirmed.add(c.id)
            actions.push({ label: `Relance marquee : ${c.company}`, undo: { kind: 'patch', id: c.id, data: { lastMs: prevLastMs } } })
            return `Relance enregistree pour ${c.company}.`
          },
        },
        {
          name: 'ajouter_note',
          description: "Ajoute une note datee au journal d'une candidature.",
          parameters: {
            type: 'object',
            properties: { id: { type: 'number' }, texte: { type: 'string' } },
            required: ['id', 'texte'],
          },
          handler: async ({ id, texte }) => {
            const t = String(texte || '').trim()
            if (!t) return 'Note vide.'
            const c = await prisma.candidature.findFirst({ where: { id: Number(id), userId: auth.id } })
            if (!c) return 'Candidature introuvable.'
            const prevLastMs = c.last.getTime()
            const note = await prisma.comment.create({ data: { candidatureId: c.id, txt: t } })
            await prisma.candidature.update({ where: { id: c.id }, data: { last: new Date() } })
            confirmed.add(c.id)
            actions.push({
              label: `Note ajoutee a ${c.company}`,
              undo: { kind: 'delComment', commentId: note.id, id: c.id, lastMs: prevLastMs },
            })
            return `Note ajoutee a ${c.company}.`
          },
        },
        {
          name: 'creer_candidature',
          description: "Cree une nouvelle candidature (ex: une candidature spontanee).",
          parameters: {
            type: 'object',
            properties: {
              company: { type: 'string' },
              role: { type: 'string' },
              kind: { type: 'string', enum: KINDS, description: 'offer, spontaneous ou network' },
              statut: { type: 'string', enum: ORDER },
            },
            required: ['company'],
          },
          handler: async ({ company, role, kind, statut }) => {
            const name = String(company || '').trim()
            if (!name) return "Nom d'entreprise requis."
            const k = KINDS.includes(kind) ? kind : 'offer'
            const c = await prisma.candidature.create({
              data: {
                userId: auth.id,
                company: name,
                role: (role && String(role).trim()) || (k === 'spontaneous' ? 'Candidature spontanée' : 'Poste'),
                status: ORDER.includes(statut) ? statut : 'wishlist',
                kind: k,
                last: new Date(),
              },
            })
            confirmed.add(c.id)
            actions.push({ label: `Candidature creee : ${c.company}`, undo: { kind: 'delCandidature', id: c.id } })
            return `Candidature creee pour ${c.company} (id ${c.id}).`
          },
        },
      ]

      const sys =
        `Tu es le copilote d'une application personnelle de suivi de candidatures. ${NO_EMOJI} ` +
        `Tu disposes d'un apercu compact du pipeline (id, company, role, status, joursInactif, momentum). ` +
        `Le champ "momentum" est le radar de ghosting affiche a l'utilisateur : ok (frais), warm (tiede), cool (refroidit), cold (ghosting), ou null (offer/rejected). ` +
        `Statuts: wishlist, applied (postule), interview (entretien), offer (offre), rejected (refuse). ` +
        `Outils de LECTURE: details_candidature (description/notes), mettre_en_avant_candidatures (pour citer des candidatures). ` +
        `Outils d'ACTION (s'executent immediatement): changer_statut, marquer_relance, ajouter_note, creer_candidature. ` +
        `N'utilise les outils d'action que si l'utilisateur demande explicitement de faire le changement ; sinon contente-toi de repondre ou de suggerer. ` +
        `Apres une action, confirme brievement ce que tu as fait. ` +
        `Appelle mettre_en_avant_candidatures avec les id des candidatures que tu cites. ` +
        `Reponds en francais, de facon concise et actionnable. ` +
        `Tu peux recevoir plusieurs tours de conversation : tiens compte des messages precedents pour les questions de suivi. ` +
        `Pour les RELANCES, appuie-toi sur le momentum : priorise cold puis cool, en statut applied ou interview ; ignore offer et rejected. A momentum egal, departage par joursInactif.`

      const { answer } = await mistralWithTools(
        [
          {
            role: 'system',
            content:
              `${sys}\n\nDate actuelle (ms): ${Date.now()}\n` +
              (truncated
                ? `Apercu PARTIEL du pipeline (${pipeline.length} sur ${fullPipeline.length} candidatures, priorise actives + inactives) :\n`
                : `Apercu du pipeline (a jour) :\n`) +
              JSON.stringify(pipeline),
          },
          ...history,
        ],
        tools,
      )

      const known = new Set<number>(pipeline.map((p) => Number(p.id)))
      const ids = new Set<number>(confirmed)
      suggested.forEach((id) => {
        if (known.has(id)) ids.add(id)
      })
      return NextResponse.json({ answer, cardIds: Array.from(ids), actions })
    }

    // ── Auto-fill : extrait les infos clés d'une offre collée ──
    if (action === 'extract') {
      const { raw } = body
      let source = String(raw || '').trim()
      const isUrl = /^https?:\/\//i.test(source)
      const urlType = isUrl ? classifyUrl(source) : null
      let fetchedOk = false
      if (isUrl) {
        const page = await fetchPageText(source)
        if (page) {
          source = page
          fetchedOk = true
        }
      }
      const context =
        urlType === 'company'
          ? `Le contenu provient du SITE d'une entreprise (page corporate, pas une offre precise). ` +
            `Concentre-toi sur companyInfo (secteur, taille, activite, stack technique si mentionnee). ` +
            `role/salary/contract sont probablement absents : mets "—".`
          : `Le contenu est une offre d'emploi.`
      const parsed = await mistralJson(
        [
          {
            role: 'system',
            content:
              `Tu extrais les informations clés d'une offre d'emploi ou d'une page d'entreprise. ${NO_EMOJI} ${context} ` +
              `Renvoie STRICTEMENT un JSON {"company": string, "role": string, "salary": string, "stack": string[], "location": string, "contract": string, "remote": string, "seniority": string, "companyInfo": string}. ` +
              `Si une info est absente, mets "—" (ou [] pour stack, "" pour companyInfo). ` +
              `salary au format court ex "65–80k€". location ex "Paris", "Lyon". ` +
              `contract: type de contrat (CDI, CDD, Freelance, Stage, Alternance…). ` +
              `remote: "Remote", "Hybride" ou "Sur site". ` +
              `seniority: niveau attendu (Junior, Confirmé, Senior, Lead…). ` +
              `companyInfo: une phrase sur l'entreprise (secteur, taille, activité).`,
          },
          { role: 'user', content: source.slice(0, 8000) },
        ],
        ExtractSchema,
      )
      const description = fetchedOk || !isUrl ? source.slice(0, 5000) : ''
      return NextResponse.json({ ...parsed, _fetched: fetchedOk, _urlType: urlType, description })
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
