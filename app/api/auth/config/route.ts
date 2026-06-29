import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Indique au client si l'inscription est ouverte (sans rien exposer de sensible). */
export async function GET() {
  return NextResponse.json({ allowRegistration: process.env.ALLOW_REGISTRATION === 'true' })
}
