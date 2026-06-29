import { NextResponse } from 'next/server'
import { prisma, serialize } from '@/lib/db'

export const runtime = 'nodejs'

const FIELDS = ['company', 'role', 'status', 'kind', 'channel', 'salary', 'location', 'url', 'description'] as const

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Id invalide' }, { status: 400 })
  const b = await req.json()

  const data: any = {}
  for (const k of FIELDS) if (b[k] !== undefined) data[k] = b[k]
  if (b.stack !== undefined) data.stack = Array.isArray(b.stack) ? b.stack.join(',') : b.stack
  if (b.touch || b.addComment) data.last = new Date()
  if (b.addComment?.trim()) data.comments = { create: [{ txt: b.addComment.trim() }] }

  try {
    const card = await prisma.candidature.update({ where: { id }, data, include: { comments: true } })
    return NextResponse.json(serialize(card))
  } catch {
    return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Id invalide' }, { status: 400 })
  try {
    await prisma.candidature.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })
  }
}
