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
  getTicketPeriodStart,
  rolloverTicketCounts,
  updateChannelCount,
  setTicketTotal,
  notifyAppEvent,
  heartbeat,
  recordError,
  recordReport,
  getLastReportAt,
  closeDb,
  type Settings,
} from "./db.ts";
import { runReport } from "./report.ts";
import { liveCountFull, liveCountAfter } from "./count.ts";
import { isPeriodEnd, currentPeriodStart } from "./period.ts";

const args = new Set(process.argv.slice(2));
const RUN_NOW = args.has("--now"); // one-shot report, then exit
const DRY_RUN = args.has("--dry-run"); // count + log, never post

const TICK_MS = 30_000;
// The live dashboard count runs on its own faster cadence. It is rate-safe: after
// one seeding full count it only fetches messages newer than `lastSeenMessageId`,
// so a tick is ~1 cheap request per channel. A periodic full re-count corrects
// drift from deleted messages.
const COUNT_TICK_MS = 5_000;
const RECONCILE_MS = 10 * 60_000;

let client: Client | null = null;
let loggedInToken: string | null = null;
let appliedPresence = "";
let reporting = false;
let counting = false;
let lastReconcileMs = 0;
let lastTotalWritten: number | null = null;
let shuttingDown = false;

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

function scheduledFireMs(s: Settings): number {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    s.postHour,
    s.postMinute,
    0,
    0,
  );
}

async function doReport(s: Settings): Promise<void> {
  if (!client) return;
  reporting = true;
  try {
    const channels = await getReportChannels();
    await runReport(client, s, channels, new Date(), { dryRun: false });
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

// ── Live dashboard count ─────────────────────────────────────────────────────

// Keep the dashboard "Tickets solved" total fresh. Runs only while connected;
// re-seeds (full count) on a new period or when a reconcile is due, otherwise
// adds just the messages posted since the last tick.
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

    const periodStart = currentPeriodStart(new Date(), s);
    const storedStart = await getTicketPeriodStart();
    const rollover = storedStart == null || storedStart !== periodStart;
    const reconcileDue = Date.now() - lastReconcileMs >= RECONCILE_MS;

    if (rollover) await rolloverTicketCounts(periodStart);

    const channels = await getLiveChannels();
    let total = 0;
    let changed = rollover; // a rollover reset is itself a visible change

    for (const ch of channels) {
      const full = rollover || reconcileDue || ch.lastSeenMessageId == null;
      const res = full
        ? await liveCountFull(client, ch, periodStart)
        : await liveCountAfter(client, ch, ch.lastSeenMessageId!);

      if (!res.ok) {
        // Keep the last good tally for this channel; don't drop the team total.
        total += ch.currentCount;
        continue;
      }

      if (full) {
        await updateChannelCount(ch.channelId, res.count, res.newestId);
        if (res.count !== ch.currentCount) changed = true;
        total += res.count;
      } else {
        const newCount = ch.currentCount + res.count;
        if (res.count > 0 || res.newestId !== ch.lastSeenMessageId) {
          await updateChannelCount(ch.channelId, newCount, res.newestId);
        }
        if (newCount !== ch.currentCount) changed = true;
        total += newCount;
      }
    }

    if (reconcileDue) lastReconcileMs = Date.now();

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

  // Run-now is a manual override (ignores the enabled toggle).
  if (s.runRequestedAt > last) {
    console.log("[bot] run-now requested, running report");
    await doReport(s);
    return;
  }

  // Scheduled: once we cross the post time on a period-end Friday.
  if (s.enabled && isPeriodEnd(new Date(), s)) {
    const fire = scheduledFireMs(s);
    if (Date.now() >= fire && last < fire) {
      console.log("[bot] scheduled period end, running report");
      await doReport(s);
    }
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
