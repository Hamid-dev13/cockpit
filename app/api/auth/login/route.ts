import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, signAccessToken, issueRefreshToken, setAuthCookies, publicUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
  if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 })
  }

  const pub = publicUser(user)
  const at = await signAccessToken(pub)
  const { raw, expiresAt } = await issueRefreshToken(user.id)
  const res = NextResponse.json({ user: pub })
  setAuthCookies(res, at, raw, expiresAt)
  return res
}
