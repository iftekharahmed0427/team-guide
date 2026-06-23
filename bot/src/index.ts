import {
  Client,
  Events,
  GatewayIntentBits,
  ActivityType,
  type PresenceData,
} from "discord.js";
import { loadEnv } from "./config.ts";
import {
  getSettings,
  getReportChannels,
  getLiveChannels,
  updateChannelCount,
  setTicketTotal,
  notifyAppEvent,
  heartbeat,
  recordError,
  recordReport,
  getLastReportAt,
  getLatestArchivedPeriod,
  getPeriodEntries,
  clearResetAfterRun,
  closeDb,
  type Settings,
} from "./db.ts";
import { runReport, postArchivedReport } from "./report.ts";
import { countWindow } from "./count.ts";

const args = new Set(process.argv.slice(2));
const RUN_NOW = args.has("--now"); // one-shot report, then exit
const DRY_RUN = args.has("--dry-run"); // count + log, never post

const TICK_MS = 30_000;
// The live dashboard count re-counts each channel's window above its last manual
// reset every tick (recounting current state is what lets deleted screenshots
// drop back out of the tally). Each tick reads settings + channels from the DB,
// so this cadence is a constant, 24/7 egress floor — keep it modest. 30s is
// plenty fresh for a dashboard stat; the Discord topic has its own throttle.
const COUNT_TICK_MS = 30_000;

// How often each channel's Discord topic is refreshed with its ticket count.
// Discord rate-limits topic edits to ~2 per 10 min per channel, so keep this at
// or above ~10 min and edit each channel at most once per window.
const TOPIC_REFRESH_MS = 10 * 60_000;

// Reaction the live counter puts on each screenshot it tallies.
const TICK_REACTION = "✅";

let client: Client | null = null;
let loggedInToken: string | null = null;
let appliedPresence = "";
let reporting = false;
let counting = false;
let lastTotalWritten: number | null = null;
let shuttingDown = false;
// channelId → last time we wrote its Discord topic (ms), to throttle edits.
const topicWrittenAt = new Map<string, number>();

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ── Presence ─────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: Record<string, ActivityType> = {
  Playing: ActivityType.Playing,
  Watching: ActivityType.Watching,
  Listening: ActivityType.Listening,
  Competing: ActivityType.Competing,
  Custom: ActivityType.Custom,
};

function buildPresence(s: Settings): PresenceData {
  const allowed = ["online", "idle", "dnd", "invisible"] as const;
  const status = (allowed as readonly string[]).includes(s.presenceStatus)
    ? (s.presenceStatus as (typeof allowed)[number])
    : "online";
  const text = s.presenceActivityText.trim();
  if (s.presenceActivityType === "none" || !text) return { status, activities: [] };
  if (s.presenceActivityType === "Custom") {
    return { status, activities: [{ name: "Custom Status", type: ActivityType.Custom, state: text }] };
  }
  const type = ACTIVITY_TYPES[s.presenceActivityType] ?? ActivityType.Playing;
  return { status, activities: [{ name: text, type }] };
}

function applyPresence(s: Settings): void {
  if (!client?.user) return;
  const key = `${s.presenceStatus}|${s.presenceActivityType}|${s.presenceActivityText}`;
  if (key === appliedPresence) return;
  client.user.setPresence(buildPresence(s));
  appliedPresence = key;
  console.log("[bot] presence applied");
}

// ── Connection ───────────────────────────────────────────────────────────────

async function login(token: string): Promise<void> {
  const c = new Client({ intents: [GatewayIntentBits.Guilds] });
  c.on("error", (e) => {
    console.error("[bot] client error:", e);
    void recordError(`Client error: ${msg(e)}`).catch(() => {});
  });
  await c.login(token);
  if (!c.isReady()) {
    await new Promise<void>((resolve) => c.once(Events.ClientReady, () => resolve()));
  }
  client = c;
  loggedInToken = token;
  appliedPresence = "";
  console.log(`[bot] logged in as ${c.user?.tag}`);
}

async function reloginWith(token: string): Promise<void> {
  if (client) {
    try {
      await client.destroy();
    } catch {
      // ignore
    }
    client = null;
  }
  await login(token);
}

// ── Reporting ────────────────────────────────────────────────────────────────

async function doReport(s: Settings): Promise<void> {
  if (!client) return;
  reporting = true;
  try {
    const channels = await getReportChannels();
    if (s.resetAfterRun) {
      // "Reset all" already archived + zeroed the counts on the website; post the
      // just-closed period's report from the archive. Always clear the flag (even
      // if posting hiccups) so it can't loop or fall back to a zeroed live report.
      try {
        const period = await getLatestArchivedPeriod();
        if (period) {
          const entries = await getPeriodEntries(period.id);
          await postArchivedReport(client, s, channels, period, entries);
        }
      } finally {
        await clearResetAfterRun().catch(() => {});
      }
    } else {
      await runReport(client, s, channels, new Date(), { dryRun: false });
    }
    await recordReport();
  } catch (e) {
    console.error("[bot] report failed:", e);
    try {
      await recordError(`Report failed: ${msg(e)}`);
    } catch {
      // ignore
    }
  } finally {
    reporting = false;
  }
}

// ── Channel topic ─────────────────────────────────────────────────────────────

// "5 minutes ago" style age, coarse minute/hour/day buckets, floored at "just now".
function relativeAge(fromMs: number, nowMs: number): string {
  const mins = Math.max(0, Math.round((nowMs - fromMs) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function buildTopic(count: number, lastChangeMs: number, nowMs: number): string {
  return `Tickets this period: ${count} | Last updated ${relativeAge(lastChangeMs, nowMs)}`;
}

// Refresh a channel's topic with its current count, at most once per channel per
// TOPIC_REFRESH_MS (Discord throttles topic edits hard). The slot is reserved
// before the edit so a failure (e.g. missing the Manage Channels permission)
// doesn't retry-spam every tick. Without that permission the edit 403s; we log
// it and keep the bot online rather than treating it as a fatal error.
async function refreshTopic(
  c: Client,
  channelId: string,
  count: number,
  lastChangeMs: number,
  nowMs: number,
): Promise<void> {
  if (nowMs - (topicWrittenAt.get(channelId) ?? 0) < TOPIC_REFRESH_MS) return;
  topicWrittenAt.set(channelId, nowMs);
  try {
    const channel = await c.channels.fetch(channelId);
    if (!channel || !("setTopic" in channel)) return;
    await channel.setTopic(buildTopic(count, lastChangeMs, nowMs));
  } catch (e) {
    console.error(`[topic] ${channelId}: ${msg(e)}`);
  }
}

// ── Live dashboard count ─────────────────────────────────────────────────────

// Keep the dashboard "Tickets solved" total fresh. Runs only while connected;
// re-counts every channel's window above its last manual reset.
async function countTick(): Promise<void> {
  if (shuttingDown || counting || reporting) return;
  if (!client || !client.isReady()) return;

  counting = true;
  try {
    let s: Settings;
    try {
      s = await getSettings();
    } catch {
      return;
    }
    if (!s.token) return; // not configured; the main tick handles disconnect

    // Counts accumulate until an admin resets a channel: the only floor is its
    // manual reset (count_reset_at), and another bot's messages are not a floor,
    // so a count persists instead of dropping when some bot posts in the channel.
    const channels = await getLiveChannels();
    const now = Date.now();
    let total = 0;
    let changed = false;

    for (const ch of channels) {
      const floor = ch.resetAt ?? 0;
      const res = await countWindow(client, ch, floor, false, TICK_REACTION);

      if (!res.ok) {
        // Keep the last good tally for this channel; don't drop the team total.
        total += ch.currentCount;
        continue;
      }

      const countChanged = res.count !== ch.currentCount;
      if (countChanged) {
        await updateChannelCount(ch.channelId, res.count);
        changed = true;
      }
      total += res.count;

      // Mirror the count into the channel's Discord topic. "Last updated" is the
      // age of the last count change (this tick if it just moved, else the stored
      // counted_at). Throttled inside refreshTopic to ~once per 10 min. Detached
      // so a topic edit waiting on a Discord rate limit never stalls counting;
      // the throttle slot is reserved synchronously, so this can't double-edit.
      const lastChangeMs = countChanged ? now : (ch.countedAt ?? now);
      void refreshTopic(client, ch.channelId, res.count, lastChangeMs, now);
    }

    await setTicketTotal(total);
    // Refresh the dashboard + reports page when any per-member count moved (the
    // reports leaderboard can change even when the team total does not).
    if (changed || total !== lastTotalWritten) {
      lastTotalWritten = total;
      await notifyAppEvent().catch(() => {});
    }
  } catch (e) {
    console.error("[count] tick failed:", msg(e));
  } finally {
    counting = false;
  }
}

// ── Main loop ────────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  if (shuttingDown) return;

  let s: Settings;
  try {
    s = await getSettings();
  } catch (e) {
    console.error("[bot] settings fetch failed:", msg(e));
    return;
  }

  // No token configured → disconnect and report it.
  if (!s.token) {
    if (client) {
      try {
        await client.destroy();
      } catch {
        // ignore
      }
      client = null;
      loggedInToken = null;
    }
    await heartbeat("no_token", null).catch(() => {});
    return;
  }

  // (Re)connect if the token changed.
  if (s.token !== loggedInToken) {
    try {
      await reloginWith(s.token);
    } catch (e) {
      loggedInToken = null;
      if (client) {
        try {
          await client.destroy();
        } catch {
          // ignore
        }
        client = null;
      }
      await recordError(`Login failed: ${msg(e)}`).catch(() => {});
      return;
    }
  }

  if (!client || !client.isReady()) {
    await heartbeat("offline", null).catch(() => {});
    return;
  }

  applyPresence(s);
  await heartbeat("online", client.user?.tag ?? null).catch(() => {});

  if (reporting) return;
  const last = await getLastReportAt().catch(() => 0);

  // The bot only posts when a human asks: "Run now" or "Reset all" (both bump
  // run_requested_at). There is no scheduled / automatic posting.
  if (s.runRequestedAt > last) {
    console.log("[bot] run requested, running report");
    await doReport(s);
  }
}

async function main() {
  loadEnv();

  if (RUN_NOW) {
    const s = await getSettings();
    if (!s.token) {
      console.error("[bot] no token configured. Set it in the website (Settings > Discord bot)");
      await closeDb();
      process.exit(1);
    }
    await login(s.token);
    const channels = await getReportChannels();
    await runReport(client!, s, channels, new Date(), { dryRun: DRY_RUN });
    if (!DRY_RUN) await recordReport();
    if (client) await client.destroy();
    await closeDb();
    process.exit(0);
  }

  console.log(
    `[bot] starting; config every ${TICK_MS / 1000}s, live count every ${COUNT_TICK_MS / 1000}s`,
  );
  await tick();
  const interval = setInterval(() => void tick(), TICK_MS);
  const countInterval = setInterval(() => void countTick(), COUNT_TICK_MS);

  const shutdown = async (sig: string) => {
    shuttingDown = true;
    clearInterval(interval);
    clearInterval(countInterval);
    console.log(`[bot] ${sig}: shutting down`);
    if (client) {
      try {
        await client.destroy();
      } catch {
        // ignore
      }
    }
    await closeDb().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((e) => {
  console.error("[bot] fatal:", msg(e));
  process.exit(1);
});
