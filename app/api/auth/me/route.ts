import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuth, publicUser, signAccessToken, ACCESS_COOKIE } from '@/lib/auth'

export const runtime = 'nodejs'

const isProd = process.env.NODE_ENV === 'production'

export async function GET() {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: auth.id } })
  if (!user) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 401 })

  return NextResponse.json({ user: publicUser(user) })
}

export async function PATCH(req: Request) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const body = await req.json()
  const data: Record<string, string> = {}

  if (typeof body.firstName === 'string' && body.firstName.trim()) data.firstName = body.firstName.trim()
  if (typeof body.lastName === 'string' && body.lastName.trim()) data.lastName = body.lastName.trim()
  if (typeof body.email === 'string' && body.email.trim()) {
    const email = body.email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== auth.id) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 409 })
    }
    data.email = email
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Rien à modifier.' }, { status: 400 })
  }

  const user = await prisma.user.update({ where: { id: auth.id }, data })
  const pub = publicUser(user)

  // Re-sign access token with updated user info
  const accessToken = await signAccessToken(pub)
  const res = NextResponse.json({ user: pub })
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 15,
  })
  return res
}
