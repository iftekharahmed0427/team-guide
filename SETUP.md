# Setup

Auth uses Better Auth (Discord OAuth, invite-only) with Drizzle ORM on Postgres.

## 1. Install dependencies

```bash
bun install
```

## 2. Point at a Postgres

Production runs Postgres 17 in a container on the VPS, shared with the other
projects on that host and reachable only from inside Docker. Two connection
strings, same server:

```
# DATABASE_URL  (app + bot; the container name on the internal `data` network)
postgres://teamguide:[PASSWORD]@postgres:5432/teamguide

# DIRECT_URL  (migrations and host-side tools; published on loopback only)
postgres://teamguide:[PASSWORD]@127.0.0.1:5432/teamguide
```

Set `DATABASE_SSL=disable` for that setup: the connection never leaves the host.
Against a managed provider reached over the internet, leave it empty and TLS
stays on, handled by `db/index.ts` and `drizzle.config.ts` with no CA file.

Note that LISTEN/NOTIFY, which drives live updates (`lib/notify.ts` ->
`lib/events.ts` -> `/api/events`), does **not** work through a transaction
pooler. Point the app at a real Postgres port, not a pgBouncer-style pooler.

Tip: for an isolated dev database, run your own Postgres and use its string in
`.env.local`. Otherwise local dev and production share the same data.

## 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `BETTER_AUTH_SECRET` - generate with `openssl rand -base64 32`. Keep it stable: changing it invalidates every session cookie and logs the whole team out.
- `DATABASE_URL` / `DIRECT_URL` - from step 2
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` - from step 4
- `AUTH_ALLOWED_EMAILS` - comma-separated emails allowed to sign up (the invite list)
- `STORAGE_DIR` - where uploaded screenshots are written. Unset falls back to inlining them as data URLs in the database.

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

Open http://localhost:3000; you will be redirected to `/sign-in` until you log in with Discord.

## 7. Deploy

Production is a single OVH VPS running Docker. Nothing listens on a public port:
Cloudflare Tunnel dials out and reaches the app container by name, so there is no
inbound firewall rule and no TLS to manage on the box.

```
/srv/
├── postgres/       shared Postgres 17 (one database per project on the host)
├── cloudflared/    the tunnel, the only thing facing the internet
└── teamguide/
    ├── repo/       this checkout
    ├── .env        secrets, deliberately outside the checkout
    ├── data/uploads/   screenshots, bind-mounted into the app (must be uid 1001)
    └── backups/
```

Two external Docker networks: `edge` (cloudflared to web containers) and `data`
(Postgres and its clients). The app joins both, the bot only `data`.

```bash
cd /srv/teamguide/repo && ./deploy.sh
```

That pulls, rebuilds and restarts both the app and the reports bot from
`docker-compose.prod.yml`. Set `BETTER_AUTH_URL=https://YOUR_DOMAIN` in
`/srv/teamguide/.env` and add the production Discord redirect
(`https://YOUR_DOMAIN/api/auth/callback/discord`). Run `bun run db:migrate`
against `DIRECT_URL` from the host once per schema change.

In Cloudflare, the tunnel routes the hostname to `http://teamguide-app:3000`.

`NEXT_PUBLIC_PANEL_URL` and `NEXT_PUBLIC_WHMCS_URL` are inlined at build time,
not read at runtime. Their built-in defaults already match production, so they
only need `--build-arg` wiring if those URLs ever change.

## How auth is wired

- `lib/auth.ts` - Better Auth server instance (Drizzle adapter, Discord provider, invite-only `databaseHooks`).
- `lib/auth-client.ts` - client SDK (`signIn`, `signOut`, `useSession`).
- `app/api/auth/[...all]/route.ts` - mounts the Better Auth handler.
- `proxy.ts` - optimistic redirect to `/sign-in` when the session cookie is absent (Next 16 renamed middleware to proxy).
- `app/(v1)/layout.tsx` - server-side session guard for everything in the `(v1)` route group; the real enforcement.
- `app/sign-in/` - public sign-in page with the Discord button.
- `db/index.ts` - connects to Postgres (TLS unless `DATABASE_SSL=disable`); `db/auth-schema.ts` is generated; migrations live in `drizzle/`.

## Invite-only behavior

A brand new Discord login can only create an account if its email is in `AUTH_ALLOWED_EMAILS` (or matches `AUTH_ALLOWED_EMAIL_DOMAIN`). Anyone else is rejected with a 403. Existing members sign in normally.
