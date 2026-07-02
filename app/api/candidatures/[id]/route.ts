import { NextResponse } from 'next/server'
import { prisma, serialize } from '@/lib/db'
import { getAuth } from '@/lib/auth'
import { ORDER } from '@/lib/status'

export const runtime = 'nodejs'

const FIELDS = ['company', 'role', 'status', 'kind', 'channel', 'salary', 'location', 'contract', 'remote', 'seniority', 'companyInfo', 'url', 'description'] as const

/** Verifie que la candidature appartient bien a l'utilisateur courant. */
async function ownedBy(id: number, userId: number) {
  return prisma.candidature.findFirst({ where: { id, userId } })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Id invalide' }, { status: 400 })
  if (!(await ownedBy(id, auth.id))) return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })

  const b = await req.json()
  if (b.status && !ORDER.includes(b.status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
  }
  const data: any = {}
  for (const k of FIELDS) if (b[k] !== undefined) data[k] = b[k]
  if (b.stack !== undefined) data.stack = Array.isArray(b.stack) ? b.stack.join(',') : b.stack
  if (b.touch || b.addComment) data.last = new Date()
  if (b.addComment?.trim()) data.comments = { create: [{ txt: b.addComment.trim() }] }

  const card = await prisma.candidature.update({ where: { id }, data, include: { comments: true } })
  return NextResponse.json(serialize(card))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Id invalide' }, { status: 400 })
  if (!(await ownedBy(id, auth.id))) return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })

  await prisma.candidature.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
