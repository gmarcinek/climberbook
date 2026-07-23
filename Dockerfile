FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ARG NEXT_PUBLIC_EXPERIMENTAL_POSTGRES_UI=false
ARG NEXT_PUBLIC_EXPERIMENTAL_POSTGRES_USER_ID=
ENV NEXT_PUBLIC_EXPERIMENTAL_POSTGRES_UI=$NEXT_PUBLIC_EXPERIMENTAL_POSTGRES_UI
ENV NEXT_PUBLIC_EXPERIMENTAL_POSTGRES_USER_ID=$NEXT_PUBLIC_EXPERIMENTAL_POSTGRES_USER_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]