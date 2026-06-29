import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuth, publicUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: auth.id } })
  if (!user) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 401 })

  return NextResponse.json({ user: publicUser(user) })
}
