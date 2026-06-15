# syntax=docker/dockerfile:1

# 1. Install dependencies (respecting bun.lock)
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 2. Build the Next.js app (standalone output)
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholders so module construction (Better Auth) succeeds at build time.
# The real values are provided at runtime via the container environment.
ENV BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime-0000000000
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
RUN bun run build

# 3. Minimal runtime image
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
