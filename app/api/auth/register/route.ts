import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, signAccessToken, issueRefreshToken, setAuthCookies, publicUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { email, password, firstName, lastName } = await req.json().catch(() => ({}))
  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 })
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères.' }, { status: 400 })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) return NextResponse.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 })

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      passwordHash: await hashPassword(String(password)),
    },
  })

  const pub = publicUser(user)
  const at = await signAccessToken(pub)
  const { raw, expiresAt } = await issueRefreshToken(user.id)
  const res = NextResponse.json({ user: pub })
  setAuthCookies(res, at, raw, expiresAt)
  return res
}
