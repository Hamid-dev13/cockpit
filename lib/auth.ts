import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import { prisma } from './db'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev_secret_change_me')
const ACCESS_TTL = '15m'
const REFRESH_DAYS = 30
const isProd = process.env.NODE_ENV === 'production'

export const ACCESS_COOKIE = 'cockpit_at'
export const REFRESH_COOKIE = 'cockpit_rt'

export interface AuthUser {
  id: number
  email: string
  firstName: string
  lastName: string
}

export function publicUser(u: { id: number; email: string; firstName: string; lastName: string }): AuthUser {
  return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName }
}

// ── Mots de passe ────────────────────────────────────────────────────────────
export function hashPassword(p: string) {
  return bcrypt.hash(p, 10)
}
export function verifyPassword(p: string, h: string) {
  return bcrypt.compare(p, h)
}

// ── Access token (JWT, courte duree) ─────────────────────────────────────────
export async function signAccessToken(u: AuthUser) {
  return new SignJWT({ email: u.email, firstName: u.firstName, lastName: u.lastName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(u.id))
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secret)
}

export async function verifyAccessToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      id: Number(payload.sub),
      email: String(payload.email),
      firstName: String(payload.firstName),
      lastName: String(payload.lastName),
    }
  } catch {
    return null
  }
}

// ── Refresh token (aleatoire, hashe en BDD, rotatif) ─────────────────────────
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function issueRefreshToken(userId: number) {
  const raw = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400000)
  await prisma.refreshToken.create({ data: { tokenHash: sha256(raw), userId, expiresAt } })
  return { raw, expiresAt }
}

/** Verifie et fait tourner le refresh token (usage unique). Renvoie userId + nouveau token, ou null. */
export async function rotateRefreshToken(raw: string) {
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(raw) } })
  if (!existing) return null
  await prisma.refreshToken.delete({ where: { id: existing.id } }).catch(() => {})
  if (existing.expiresAt < new Date()) return null
  const next = await issueRefreshToken(existing.userId)
  return { userId: existing.userId, ...next }
}

export async function revokeRefreshToken(raw: string) {
  await prisma.refreshToken.delete({ where: { tokenHash: sha256(raw) } }).catch(() => {})
}

// ── Cookies ──────────────────────────────────────────────────────────────────
export function setAuthCookies(res: NextResponse, accessToken: string, refreshRaw: string, refreshExpires: Date) {
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 15,
  })
  res.cookies.set(REFRESH_COOKIE, refreshRaw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    expires: refreshExpires,
  })
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}

// ── Lecture de l'utilisateur courant (dans une route protegee) ───────────────
export async function getAuth(): Promise<AuthUser | null> {
  const token = cookies().get(ACCESS_COOKIE)?.value
  if (!token) return null
  return verifyAccessToken(token)
}
