# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
#  Base — Debian slim + OpenSSL (requis par Prisma)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# ─────────────────────────────────────────────────────────────────────────────
#  Dépendances — node_modules + client Prisma généré (via postinstall)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ─────────────────────────────────────────────────────────────────────────────
#  Dev — le code source est bind-mounté au runtime (hot-reload)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─────────────────────────────────────────────────────────────────────────────
#  Builder — build de production Next.js
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
#  Runner — image de production
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
# Synchronise le schéma SQLite puis démarre le serveur
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
