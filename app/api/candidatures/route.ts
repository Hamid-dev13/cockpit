import { NextResponse } from 'next/server'
import { prisma, serialize } from '@/lib/db'
import { SEED } from '@/lib/seed'

export const runtime = 'nodejs'
const DAY = 86400000

export async function GET() {
  // Seed automatique au premier lancement (BDD vide).
  const count = await prisma.candidature.count()
  if (count === 0) {
    for (const s of SEED) {
      await prisma.candidature.create({
        data: {
          company: s.company,
          role: s.role,
          status: s.status,
          kind: s.kind,
          channel: s.channel,
          salary: s.salary,
          stack: s.stack.join(','),
          location: s.location,
          url: s.url,
          description: s.description,
          last: new Date(Date.now() - s.lastDaysAgo * DAY),
          comments: {
            create: s.comments.map((c) => ({ txt: c.txt, createdAt: new Date(Date.now() - c.daysAgo * DAY) })),
          },
        },
      })
    }
  }

  const cards = await prisma.candidature.findMany({ include: { comments: true }, orderBy: { id: 'asc' } })
  return NextResponse.json(cards.map(serialize))
}

export async function POST(req: Request) {
  const b = await req.json()
  if (!b.company || !String(b.company).trim()) {
    return NextResponse.json({ error: "Le nom de l'entreprise est requis." }, { status: 400 })
  }
  const card = await prisma.candidature.create({
    data: {
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
