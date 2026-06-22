"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import {
  reportChannel,
  botSetting,
  ticketCount,
  reportPeriod,
  reportPeriodEntry,
  resetLog,
  review,
  dispute,
} from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const PAGE = "/settings/discord-bot";
const SNOWFLAKE = /^\d{5,25}$/;
const PRESENCE_STATUS = new Set(["online", "idle", "dnd", "invisible"]);
const ACTIVITY_TYPE = new Set([
  "none",
  "Playing",
  "Watching",
  "Listening",
  "Competing",
  "Custom",
]);

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Not authorized");
  }
  return session;
}

// Ensure the singleton settings row exists before updating individual fields.
async function ensureSettingsRow() {
  await db.insert(botSetting).values({ id: "singleton" }).onConflictDoNothing();
}

type Result = { ok: true } | { error: string };

async function adminGuard(): Promise<Result | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return { error: "Only admins can edit bot settings." };
  }
}

// ── Token (set-only; never read back to the browser) ─────────────────────────

export async function setBotToken(token: string): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;
  const value = token.trim();
  if (value.length < 20) {
    return { error: "That doesn't look like a valid bot token." };
  }
  await ensureSettingsRow();
  await db.update(botSetting).set({ token: value }).where(eq(botSetting.id, "singleton"));
  await logActivity("bot.token_set");
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

export async function clearBotToken(): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;
  await ensureSettingsRow();
  await db.update(botSetting).set({ token: null }).where(eq(botSetting.id, "singleton"));
  await logActivity("bot.token_cleared");
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

// ── Presence (the bot's Discord status) ──────────────────────────────────────

export async function updatePresence(input: {
  presenceStatus: string;
  presenceActivityType: string;
  presenceActivityText: string;
}): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;
  if (!PRESENCE_STATUS.has(input.presenceStatus)) {
    return { error: "Invalid status." };
  }
  if (!ACTIVITY_TYPE.has(input.presenceActivityType)) {
    return { error: "Invalid activity type." };
  }
  await ensureSettingsRow();
  await db
    .update(botSetting)
    .set({
      presenceStatus: input.presenceStatus,
      presenceActivityType: input.presenceActivityType,
      presenceActivityText: input.presenceActivityText.trim().slice(0, 128),
    })
    .where(eq(botSetting.id, "singleton"));
  await logActivity("bot.presence_updated");
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

// ── Run-now ──────────────────────────────────────────────────────────────────

export async function requestRunNow(): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;
  await ensureSettingsRow();
  await db
    .update(botSetting)
    .set({ runRequestedAt: new Date() })
    .where(eq(botSetting.id, "singleton"));
  await logActivity("bot.run_now");
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

// ── Period-end leaderboard announcement ──────────────────────────────────────

const HEX = /^#?[0-9a-fA-F]{6}$/;

export async function updateAnnouncement(input: {
  announcementChannelId: string;
  announcementEnabled: boolean;
  announcementTitle: string;
  announcementColor: string;
  announcementIntro: string;
  announcementFooter: string;
  announcementRoleId: string;
  announcementPingText: string;
}): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;

  const channelId = input.announcementChannelId.trim();
  if (channelId && !SNOWFLAKE.test(channelId)) {
    return { error: "Channel ID must be a Discord ID (numbers only)." };
  }
  if (input.announcementEnabled && !channelId) {
    return { error: "Set an announcement channel before enabling it." };
  }
  const color = input.announcementColor.trim();
  if (color && !HEX.test(color)) {
    return { error: "Color must be a 6-digit hex, e.g. #5865f2." };
  }
  const roleId = input.announcementRoleId.trim();
  if (roleId && !SNOWFLAKE.test(roleId)) {
    return { error: "Ping role ID must be a Discord ID (numbers only)." };
  }

  await ensureSettingsRow();
  await db
    .update(botSetting)
    .set({
      announcementChannelId: channelId || null,
      announcementEnabled: input.announcementEnabled,
      announcementTitle:
        input.announcementTitle.trim().slice(0, 256) || "Ticket count for this period",
      announcementColor: color ? (color.startsWith("#") ? color : `#${color}`) : "#5865f2",
      announcementIntro: input.announcementIntro.trim().slice(0, 500),
      announcementFooter: input.announcementFooter.trim().slice(0, 200),
      announcementRoleId: roleId || null,
      announcementPingText: input.announcementPingText.trim().slice(0, 200),
    })
    .where(eq(botSetting.id, "singleton"));
  await logActivity("bot.announcement_updated");
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

// ── Report channels ──────────────────────────────────────────────────────────

export async function addReportChannel(input: {
  channelId: string;
  userId: string | null;
  name: string;
}): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;

  const channelId = input.channelId.trim();
  if (!SNOWFLAKE.test(channelId)) {
    return { error: "Channel ID must be a Discord ID (numbers only)." };
  }
  const userId = input.userId?.trim() || null;
  if (userId && !SNOWFLAKE.test(userId)) {
    return { error: "Member ID must be a Discord ID (numbers only)." };
  }
  const name = input.name.trim().slice(0, 80);

  // Floor a newly added channel at the current period's start (the last "Reset
  // all") so it only counts screenshots posted after that reset, not old ones.
  const lastReset = (
    await db
      .select({ endedAt: reportPeriod.endedAt })
      .from(reportPeriod)
      .orderBy(desc(reportPeriod.endedAt))
      .limit(1)
  )[0];

  await db
    .insert(reportChannel)
    .values({ id: randomUUID(), channelId, userId, name, countResetAt: lastReset?.endedAt ?? null })
    .onConflictDoUpdate({ target: reportChannel.channelId, set: { userId, name } });
  await logActivity("bot.channel_added", name);
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

// Reset every channel at once — the manual period-closing action. Archives the
// current standings into history (a report_period + one entry per member with a
// count), then stamps `countResetAt = now`, zeroes all tallies, and zeroes the
// team total so the next period starts fresh.
export async function resetAllReportChannels(): Promise<Result> {
  const session = await requireAdmin().catch(() => null);
  if (!session) return { error: "Only admins can edit bot settings." };

  const now = new Date();

  const channels = await db
    .select({
      name: reportChannel.name,
      userId: reportChannel.userId,
      count: reportChannel.currentCount,
    })
    .from(reportChannel);
  const total = channels.reduce((sum, c) => sum + (c.count ?? 0), 0);
  // Reviews and disputes share the report period: the current ones (periodId
  // null) get stamped with the period we archive here, so each new period starts
  // clean (and the disputes 5% bonus resets).
  const currentReviews = await db
    .select({ id: review.id })
    .from(review)
    .where(isNull(review.periodId));
  const currentDisputes = await db
    .select({ id: dispute.id })
    .from(dispute)
    .where(isNull(dispute.periodId));

  // Archive when there are tickets OR reviews OR disputes to record for the period.
  const archived = total > 0 || currentReviews.length > 0 || currentDisputes.length > 0;
  let archivedPeriodId: string | null = null;
  if (archived) {
    const last = (
      await db
        .select({ endedAt: reportPeriod.endedAt })
        .from(reportPeriod)
        .orderBy(desc(reportPeriod.endedAt))
        .limit(1)
    )[0];
    const periodId = randomUUID();
    archivedPeriodId = periodId;
    await db.insert(reportPeriod).values({
      id: periodId,
      startedAt: last?.endedAt ?? null, // the previous period's end, or null for the first
      endedAt: now,
      total,
    });
    const entries = channels
      .filter((c) => (c.count ?? 0) > 0)
      .map((c) => ({
        id: randomUUID(),
        periodId,
        name: c.name ?? "",
        userId: c.userId ?? null,
        count: c.count ?? 0,
      }));
    if (entries.length > 0) await db.insert(reportPeriodEntry).values(entries);
    if (currentReviews.length > 0) {
      await db.update(review).set({ periodId }).where(isNull(review.periodId));
    }
    if (currentDisputes.length > 0) {
      await db.update(dispute).set({ periodId }).where(isNull(dispute.periodId));
    }
  }

  await db.update(reportChannel).set({ countResetAt: now, currentCount: 0, countedAt: now });
  await db.update(ticketCount).set({ total: 0 }).where(eq(ticketCount.id, "singleton"));

  // Signal the bot to post the just-closed period's report to Discord (per-channel
  // embeds + the announcement) — only when something was actually archived, so it
  // never re-posts an older period for a no-op reset. `runRequestedAt` is the
  // trigger; `resetAfterRun` tells the bot to read the archived period (live
  // counts are now zeroed).
  if (archived) {
    await ensureSettingsRow();
    await db
      .update(botSetting)
      .set({ runRequestedAt: now, resetAfterRun: true })
      .where(eq(botSetting.id, "singleton"));
  }

  // Audit the reset (every click, even a no-op that archived nothing).
  await db.insert(resetLog).values({
    id: randomUUID(),
    scope: "all",
    actorId: session.user.id,
    actorName: session.user.name || session.user.email || "Admin",
    periodId: archivedPeriodId,
    createdAt: now,
  });

  await logActivity("bot.reset_all");
  revalidatePath(PAGE);
  revalidatePath("/reports");
  revalidatePath("/reports/history");
  revalidatePath("/reviews");
  revalidatePath("/disputes");
  revalidatePath("/payments");
  await notifyChange();
  return { ok: true };
}

export async function deleteReportChannel(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ch = (await db.select({ name: reportChannel.name }).from(reportChannel).where(eq(reportChannel.id, id)).limit(1))[0];
  await db.delete(reportChannel).where(eq(reportChannel.id, id));
  await logActivity("bot.channel_deleted", ch?.name ?? "");
  revalidatePath(PAGE);
  await notifyChange();
}

// Manually zero a channel's count: stamp `countResetAt = now` so the bot starts
// counting screenshots from this moment, and clear the live tally immediately so
// the dashboard and reports page update without waiting for the next bot tick.
export async function resetReportChannel(id: string): Promise<Result> {
  const session = await requireAdmin().catch(() => null);
  if (!session) return { error: "Only admins can edit bot settings." };
  if (!id) return { error: "Missing channel." };

  const row = (
    await db
      .select({ currentCount: reportChannel.currentCount, name: reportChannel.name })
      .from(reportChannel)
      .where(eq(reportChannel.id, id))
      .limit(1)
  )[0];
  if (!row) return { error: "Channel not found." };

  await db
    .update(reportChannel)
    .set({ countResetAt: new Date(), currentCount: 0, countedAt: new Date() })
    .where(eq(reportChannel.id, id));

  // Subtract this channel's tally from the team total (the bot recomputes it on
  // its next tick, but this keeps the dashboard correct in the meantime).
  if (row.currentCount > 0) {
    await db
      .update(ticketCount)
      .set({ total: sql`greatest(${ticketCount.total} - ${row.currentCount}, 0)` })
      .where(eq(ticketCount.id, "singleton"));
  }

  await db.insert(resetLog).values({
    id: randomUUID(),
    scope: "channel",
    channelName: row.name || null,
    actorId: session.user.id,
    actorName: session.user.name || session.user.email || "Admin",
    createdAt: new Date(),
  });

  await logActivity("bot.channel_reset", row.name || "");
  revalidatePath(PAGE);
  revalidatePath("/reports/history");
  await notifyChange();
  return { ok: true };
}
