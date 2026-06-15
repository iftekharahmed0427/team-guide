# Setup

Auth uses Better Auth (Discord OAuth, invite-only) with Drizzle ORM on Supabase Postgres.

## 1. Install dependencies

```bash
bun install
```

## 2. Create the Supabase database

1. Create a project at https://supabase.com. Pick a region close to where the app will run and save the database password it gives you.
2. In the dashboard go to Project Settings > Database > Connection string. You will use two of them:
   - Transaction pooler (port 6543) for the running app -> `DATABASE_URL`
   - Direct connection (port 5432) for migrations -> `DIRECT_URL`

   They look like:

   ```
   # DATABASE_URL  (transaction pooler, app runtime)
   postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres

   # DIRECT_URL  (direct connection, migrations)
   postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres
   ```

   Replace `[PASSWORD]` with your database password.
3. SSL is required and is handled automatically by `db/index.ts` and `drizzle.config.ts` (no CA file needed).

Tip: for an isolated dev database, create a second Supabase project and use its strings in `.env.local`. Otherwise local dev and production share the same data.

## 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `BETTER_AUTH_SECRET` - generate with `openssl rand -base64 32`
- `DATABASE_URL` - Supabase transaction pooler string (port 6543)
- `DIRECT_URL` - Supabase direct connection string (port 5432)
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` - from step 4
- `AUTH_ALLOWED_EMAILS` - comma-separated emails allowed to sign up (the invite list)

## 4. Create the Discord OAuth app

1. Go to https://discord.com/developers/applications and create a new application.
2. Open OAuth2 and copy the Client ID and Client Secret into `.env.local`.
3. Under OAuth2 > Redirects, add:
   - `http://localhost:3000/api/auth/callback/discord` (development)
   - `https://YOUR_DOMAIN/api/auth/callback/discord` (production)

## 5. Create the database tables

```bash
bun run db:migrate   # applies the migration in drizzle/ using DIRECT_URL
# or, for quick iteration:
bun run db:push
```

If you change the auth config later (new providers, email/password, plugins), regenerate:

```bash
bun run auth:generate   # regenerate db/auth-schema.ts from lib/auth.ts
bun run db:generate     # create a new SQL migration
bun run db:migrate      # apply it
```

## 6. Run locally

```bash
bun run dev
```

Open http://localhost:3000; you will be redirected to `/sign-in` until you log in with Discord. Local dev connects straight to Supabase over TLS, so there is no tunnel or local database to run.

## 7. Deploy

The database is managed by Supabase, so you can host the Next app anywhere; it connects to Supabase over TLS. In your host, set the same env vars, plus `BETTER_AUTH_URL=https://YOUR_DOMAIN`, and add the production Discord redirect (`https://YOUR_DOMAIN/api/auth/callback/discord`).

### Option A: Vercel

1. Import the repo in Vercel.
2. Add env vars: `DATABASE_URL` (transaction pooler), `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your Vercel URL), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `AUTH_ALLOWED_EMAILS`.
3. Run migrations from your machine or CI (the Vercel build does not): `bun run db:migrate` against `DIRECT_URL`.

### Option B: Docker (VPS or any container host)

The repo ships a standalone-output `Dockerfile` and an app-only `docker-compose.prod.yml`.

```bash
# on the host, with a .env file containing the vars above
docker compose -f docker-compose.prod.yml up -d --build
```

The app listens on `127.0.0.1:3000`; put your reverse proxy in front and terminate TLS there. Run `bun run db:migrate` against `DIRECT_URL` once.

## How auth is wired

- `lib/auth.ts` - Better Auth server instance (Drizzle adapter, Discord provider, invite-only `databaseHooks`).
- `lib/auth-client.ts` - client SDK (`signIn`, `signOut`, `useSession`).
- `app/api/auth/[...all]/route.ts` - mounts the Better Auth handler.
- `proxy.ts` - optimistic redirect to `/sign-in` when the session cookie is absent (Next 16 renamed middleware to proxy).
- `app/(app)/layout.tsx` - server-side session guard for everything in the `(app)` route group; the real enforcement.
- `app/sign-in/` - public sign-in page with the Discord button.
- `db/index.ts` - connects to Supabase over TLS; `db/auth-schema.ts` is generated; migrations live in `drizzle/`.

## Invite-only behavior

A brand new Discord login can only create an account if its email is in `AUTH_ALLOWED_EMAILS` (or matches `AUTH_ALLOWED_EMAIL_DOMAIN`). Anyone else is rejected with a 403. Existing members sign in normally.
