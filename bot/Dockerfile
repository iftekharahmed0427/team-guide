# Outbound-only Discord bot. No ports are exposed — it dials Discord's gateway.
FROM oven/bun:1-alpine

WORKDIR /app

# Install deps first for layer caching. bun.lock is used if present.
COPY package.json bun.lock* ./
RUN bun install --production

# App source. Secrets (.env with DISCORD_TOKEN + DATABASE_URL) are provided at
# runtime, never baked into the image. All other config lives in the database.
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
USER bun

CMD ["bun", "run", "src/index.ts"]
