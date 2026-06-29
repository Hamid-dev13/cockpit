import { NextResponse } from 'next/server'
import { prisma, serialize } from '@/lib/db'
import { getAuth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const cards = await prisma.candidature.findMany({
    where: { userId: auth.id },
    include: { comments: true },
    orderBy: { id: 'asc' },
  })
  return NextResponse.json(cards.map(serialize))
}

export async function POST(req: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const b = await req.json()
  if (!b.company || !String(b.company).trim()) {
    return NextResponse.json({ error: "Le nom de l'entreprise est requis." }, { status: 400 })
  }
  const card = await prisma.candidature.create({
    data: {
      userId: auth.id,
      company: String(b.company).trim(),
      role: b.role?.trim() || (b.kind === 'spontaneous' ? 'Candidature spontanée' : 'Poste'),
      status: b.status || 'wishlist',
      kind: b.kind || 'offer',
      channel: b.channel || 'email',
      salary: b.salary || '—',
      stack: Array.isArray(b.stack) ? b.stack.join(',') : b.stack || '',
      location: b.location || '—',
      url: b.url || '',
      description: b.description || '',
      last: new Date(),
      comments: b.note?.trim() ? { create: [{ txt: b.note.trim() }] } : undefined,
    },
    include: { comments: true },
  })
  return NextResponse.json(serialize(card))
}
