import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** Convertit une ligne Prisma vers le format attendu par le front (stack = tableau, dates = ms). */
export function serialize(c: any) {
  return {
    id: c.id,
    company: c.company,
    role: c.role,
    status: c.status,
    kind: c.kind,
    channel: c.channel,
    salary: c.salary,
    stack: c.stack
      ? String(c.stack)
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [],
    location: c.location,
    contract: c.contract ?? '—',
    remote: c.remote ?? '—',
    seniority: c.seniority ?? '—',
    companyInfo: c.companyInfo ?? '',
    url: c.url,
    description: c.description ?? '',
    last: new Date(c.last).getTime(),
    comments: (c.comments ?? []).map((cm: any) => ({ t: new Date(cm.createdAt).getTime(), txt: cm.txt })),
  }
}
