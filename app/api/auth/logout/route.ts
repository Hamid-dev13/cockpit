import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { REFRESH_COOKIE, revokeRefreshToken, clearAuthCookies } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  const rt = cookies().get(REFRESH_COOKIE)?.value
  if (rt) await revokeRefreshToken(rt)
  const res = NextResponse.json({ ok: true })
  clearAuthCookies(res)
  return res
}
