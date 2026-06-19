# Team Guide Reports Bot

A small Discord bot that counts **screenshot tickets** in each team member's
report channel and posts a summary embed when an admin closes a period from the
website ("Reset all") or clicks "Run now". It never posts on its own.

- Each member has their own report channel. When they finish a ticket they post
  a screenshot there.
- Only **uploaded image attachments** are counted. Text, links, stickers, and
  emoji are ignored. **Each image counts as one ticket** (3 screenshots in one
  message is 3 tickets).
- Counting starts at the channel's **last reset** (the per-channel Reset or the
  last "Reset all") and includes every screenshot since — another bot's messages
  are not a boundary, and the reporting bot's own summary embeds are skipped, so
  posting a report never affects the count.
- A deleted screenshot stops counting: the bot recounts current channel state, so
  removing an image drops it back out of the tally.
- When an admin runs **Reset all** or **Run now**, the bot posts an embed in every
  report channel: *"You solved **N** tickets this period."*

It counts by scanning each channel's history since its last reset over the REST
API, so it does **not** need the privileged *Message Content* intent.

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
- **Run now.** Post a report to Discord immediately.
- **Reset all.** Close the current period: archive the standings to history, zero
  every channel, and post the report. The only other way the bot posts.
- **Report channels.** Channel ID plus which member owns it (or "count everyone").
  Each row has a **Reset** that zeroes just that channel.
- **Announcement.** Optional period-end leaderboard embed posted to a channel.
  The top three are ranked with 🥇🥈🥉 medals and everyone after by number, with a
  **Total tickets done** line at the end. An optional **message** line is posted
  above the embed, e.g. `Great job this period, {role}` — the `{role}` placeholder
  becomes a role mention (which Discord auto-resolves to the role name) and pings
  it; leave the role blank for a plain message. To ping a non-mentionable role the
  bot needs the *Mention @everyone, @here, and All Roles* permission.

The bot's environment only needs `DATABASE_URL` (the same Supabase Postgres).

## How counting and resets work

- Counts are **manual-only**: nothing resets or posts on a timer. A channel's
  count is every image attachment its member has posted since the channel's last
  reset, recounted live. Another bot's messages are not a boundary; the reporting
  bot's own embeds are ignored; deleted messages drop back out.
- **Reset (per channel).** Zeroes that channel and starts counting from that
  moment.
- **Reset all.** Zeroes every channel at once and **archives the current standings
  into history** (date range + each member's count) before zeroing, so it is the
  manual period-close — then the bot posts the just-closed period's report to
  Discord.
- Every reset (per-channel or Reset all) is recorded with who did it and when.
  Admins review past periods and the reset log at `/reports/history` and can
  delete any archived period.

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

   To ping a non-mentionable role in the announcement, also grant **Mention
   @everyone, @here, and All Roles** (permission integer `216064`). Skip this if
   you instead mark the pinged role as mentionable in its Discord settings.

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

### Updating after a push

To pull the latest code and rebuild in one step, run the deploy script on the
VPS after each push:

```bash
cd team-guide/bot
chmod +x deploy.sh   # first time only
./deploy.sh
```

It does a fast-forward `git pull`, rebuilds and restarts the container, prunes
old images, and tails the logs. Your `.env` and the config in the database are
left untouched.

## Files

| File | Purpose |
| --- | --- |
| `src/index.ts` | Login (token from DB), 30s loop: presence, heartbeat, run-now, scheduled posting, `--now`/`--dry-run` |
| `src/config.ts` | Validate `DATABASE_URL` |
| `src/db.ts` | Read settings + channels, write status/heartbeat |
| `src/period.ts` | Period boundary + window math (UTC) |
| `src/count.ts` | Scan a channel's history, count image attachments after the latest bot message |
| `src/report.ts` | Count all channels, build + post the embed |
