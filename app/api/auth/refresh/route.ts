import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { REFRESH_COOKIE, rotateRefreshToken, signAccessToken, setAuthCookies, clearAuthCookies, publicUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  const rt = cookies().get(REFRESH_COOKIE)?.value
  if (!rt) return NextResponse.json({ error: 'Pas de session.' }, { status: 401 })

  const rotated = await rotateRefreshToken(rt)
  if (!rotated) {
    const res = NextResponse.json({ error: 'Session expirée.' }, { status: 401 })
    clearAuthCookies(res)
    return res
  }

  const user = await prisma.user.findUnique({ where: { id: rotated.userId } })
  if (!user) {
    const res = NextResponse.json({ error: 'Compte introuvable.' }, { status: 401 })
    clearAuthCookies(res)
    return res
  }

  const pub = publicUser(user)
  const at = await signAccessToken(pub)
  const res = NextResponse.json({ user: pub })
  setAuthCookies(res, at, rotated.raw, rotated.expiresAt)
  return res
}
