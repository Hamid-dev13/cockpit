'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card, Status } from '@/lib/types'
import { STATUS } from '@/lib/status'
import { listCards, createCard, patchCard, deleteCard } from '@/lib/api'

/** État + logique métier des candidatures (chargement, CRUD optimiste, toasts). */
export function useCandidatures() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  const cardsRef = useRef<Card[]>([])
  useEffect(() => {
    cardsRef.current = cards
  }, [cards])

  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }, [])

  const load = useCallback(async () => {
    try {
      setCards(await listCards())
    } catch {
      flash('Impossible de charger les candidatures')
    } finally {
      setLoading(false)
    }
  }, [flash])

  useEffect(() => {
    load()
  }, [load])

  const patch = useCallback(
    async (id: number, body: Record<string, unknown>, optimistic?: Partial<Card>): Promise<Card | void> => {
      if (optimistic) setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...optimistic } : c)))
      try {
        const updated = await patchCard(id, body)
        setCards((cs) => cs.map((c) => (c.id === id ? updated : c)))
        return updated
      } catch {
        flash('Erreur de sauvegarde')
        load()
      }
    },
    [flash, load],
  )

  const setStatus = useCallback(
    (id: number, status: Status) => {
      const c = cardsRef.current.find((x) => x.id === id)
      patch(id, { status, touch: true }, { status, last: Date.now() })
      if (c) flash(`${c.company} → ${STATUS[status].label}`)
    },
    [patch, flash],
  )

  const addNote = useCallback(
    (id: number, txt: string) => {
      const v = txt.trim()
      if (!v) return
      return patch(id, { addComment: v }, { last: Date.now() })
    },
    [patch],
  )

  const createFromExtract = useCallback(
    async (g: any, raw: string): Promise<Card> => {
      const created = await createCard({
        kind: 'offer',
        channel: 'form',
        company: g.company,
        role: g.role,
        salary: g.salary,
        stack: Array.isArray(g.stack) ? g.stack : [],
        location: g.location,
        contract: g.contract,
        remote: g.remote,
        seniority: g.seniority,
        companyInfo: g.companyInfo,
        url: raw.startsWith('http') ? raw.split(/\s/)[0] : '',
        description: g.description || '',
      })
      setCards((cs) => [...cs, created])
      const wasUrl = raw.trim().startsWith('http')
      flash(
        wasUrl && g._fetched === false
          ? `${created.company} ajouté — page non lisible, vérifie/complète les infos`
          : `${created.company} ajouté depuis l'offre`,
      )
      return created
    },
    [flash],
  )

  const createManual = useCallback(
    async (body: Record<string, unknown>): Promise<Card> => {
      const created = await createCard(body)
      setCards((cs) => [...cs, created])
      flash(`${created.company} ajouté`)
      return created
    },
    [flash],
  )

  const remove = useCallback(
    async (id: number) => {
      const c = cardsRef.current.find((x) => x.id === id)
      setCards((cs) => cs.filter((x) => x.id !== id))
      try {
        await deleteCard(id)
        if (c) flash(`${c.company} supprimé`)
      } catch {
        flash('Échec de la suppression')
        load()
      }
    },
    [flash, load],
  )

  return { cards, loading, toast, flash, reload: load, setStatus, addNote, patch, createFromExtract, createManual, remove }
}
