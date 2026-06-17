# Team Guide Reports Bot

A small Discord bot that counts **screenshot tickets** in each team member's
report channel and posts a summary embed at the end of every 14-day period
(ending on a Friday, UTC).

- Each member has their own report channel. When they finish a ticket they post
  a screenshot there.
- Only **uploaded image attachments** are counted. Text, links, stickers, and
  emoji are ignored. **Each image counts as one ticket** (3 screenshots in one
  message is 3 tickets).
- At each period end the bot posts an embed in every report channel:
  *"You solved **N** tickets this period."*

It counts by scanning each channel's last-14-days history over the REST API at
period end, so it does **not** need the privileged *Message Content* intent.

## Everything is controlled from the website

Sign in as an admin and open **Settings > Discord bot**. Everything below is
edited there and stored in the shared Supabase database; the bot reads it at
runtime (polled every 30s) and reports its health back:

- **Bot token.** Set, replace, or clear it from the UI (stored set-only; never
  shown again). The bot logs in (and re-logs in on change) using this token.
- **Status.** Live online/offline, the logged-in bot tag, last heartbeat, last
  report time, and the last error.
- **Presence.** The bot's Discord status (online/idle/dnd/invisible) and activity
  (Playing, Watching, or a custom status).
- **Enable toggle.** Pause or resume posting without stopping the container.
- **Run now.** Trigger a report immediately. This is a manual override and runs
  even if posting is paused.
- **Schedule.** Period anchor (a Friday), length, and UTC post time.
- **Report channels.** Channel ID plus which member owns it (or "count everyone").

The bot's environment only needs `DATABASE_URL` (the same Supabase Postgres).

## How counting and timing work

- A period is `period_days` (14) long and ends on the configured anchor Friday
  and every 14 days from it. The anchor must be a Friday; the website enforces
  this.
- The bot posts once it crosses the configured UTC time on a period-end Friday.
  It also catches up if it was offline at that moment, as long as it comes back
  the same day.
- A channel's count is the image attachments posted by its member in the
  `(periodEnd - 14 days, periodEnd]` window. Deleted messages do not count.

## 1. Create the Discord bot

1. Go to <https://discord.com/developers/applications> and create a New
   Application.
2. Open **Bot**, click **Reset Token**, and paste it into **Settings > Discord
   bot** in the web app (not into any file).
3. No privileged intents are required. Leave *Message Content*, *Presence*, and
   *Server Members* off.
4. Invite it with only the permissions it needs: **View Channel, Read Message
   History, Send Messages, Embed Links** (permission integer `84992`):

   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=84992
   ```

## 2. Run

```bash
cp .env.example .env        # set DATABASE_URL
bun install
bun start                   # connects, applies presence, posts on schedule / run-now

# one-shot helpers (use the token + config already in the DB):
bun run dry                 # count the last period and log totals; post nothing
bun run now                 # post the embeds once immediately, then exit
```

## 3. Deploy with Docker (VPS)

The bot is **outbound-only**. It opens connections to Discord and Postgres and
never listens on a port, so it cannot conflict with other containers. The compose
project name and container name are unique, and no host ports are published.

```bash
# in bot/, with .env (DATABASE_URL) filled in
docker compose up -d --build
docker compose logs -f
```

All other configuration is done in the website, with no container restart needed.

## Files

| File | Purpose |
| --- | --- |
| `src/index.ts` | Login (token from DB), 30s loop: presence, heartbeat, run-now, scheduled posting, `--now`/`--dry-run` |
| `src/config.ts` | Validate `DATABASE_URL` |
| `src/db.ts` | Read settings + channels, write status/heartbeat |
| `src/period.ts` | Period boundary + window math (UTC) |
| `src/count.ts` | Scan a channel's history, count image attachments |
| `src/report.ts` | Count all channels, build + post the embed |
