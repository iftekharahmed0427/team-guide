"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { reportChannel, botSetting, ticketCount } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";

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
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

export async function clearBotToken(): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;
  await ensureSettingsRow();
  await db.update(botSetting).set({ token: null }).where(eq(botSetting.id, "singleton"));
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
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

// ── Enable / run-now ─────────────────────────────────────────────────────────

export async function setEnabled(enabled: boolean): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;
  await ensureSettingsRow();
  await db.update(botSetting).set({ enabled }).where(eq(botSetting.id, "singleton"));
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

export async function setAutoReset(autoReset: boolean): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;
  await ensureSettingsRow();
  await db.update(botSetting).set({ autoReset }).where(eq(botSetting.id, "singleton"));
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

export async function requestRunNow(): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;
  await ensureSettingsRow();
  await db
    .update(botSetting)
    .set({ runRequestedAt: new Date() })
    .where(eq(botSetting.id, "singleton"));
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

// ── Schedule ─────────────────────────────────────────────────────────────────

export async function updateBotSchedule(input: {
  periodAnchor: string;
  periodDays: number;
  postHour: number;
  postMinute: number;
}): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;

  const periodAnchor = input.periodAnchor.trim();
  const anchorMs = Date.parse(`${periodAnchor}T00:00:00Z`);
  if (Number.isNaN(anchorMs)) return { error: "Period anchor must be a valid date." };
  if (new Date(anchorMs).getUTCDay() !== 5) {
    return { error: "Period anchor must be a Friday. Periods end on Fridays." };
  }
  if (!Number.isInteger(input.periodDays) || input.periodDays < 1) {
    return { error: "Period length must be a whole number of days (≥ 1)." };
  }
  if (!Number.isInteger(input.postHour) || input.postHour < 0 || input.postHour > 23) {
    return { error: "Post hour must be 0–23 (UTC)." };
  }
  if (!Number.isInteger(input.postMinute) || input.postMinute < 0 || input.postMinute > 59) {
    return { error: "Post minute must be 0–59." };
  }

  await ensureSettingsRow();
  await db
    .update(botSetting)
    .set({
      periodAnchor,
      periodDays: input.periodDays,
      postHour: input.postHour,
      postMinute: input.postMinute,
    })
    .where(eq(botSetting.id, "singleton"));
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

  await db
    .insert(reportChannel)
    .values({ id: randomUUID(), channelId, userId, name })
    .onConflictDoUpdate({ target: reportChannel.channelId, set: { userId, name } });
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

// Reset every channel at once (e.g. when moving over to manual resets): stamp
// `countResetAt = now` and zero all tallies, then zero the team total.
export async function resetAllReportChannels(): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;

  const now = new Date();
  await db.update(reportChannel).set({ countResetAt: now, currentCount: 0, countedAt: now });
  await db
    .update(ticketCount)
    .set({ total: 0 })
    .where(eq(ticketCount.id, "singleton"));

  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

export async function deleteReportChannel(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(reportChannel).where(eq(reportChannel.id, id));
  revalidatePath(PAGE);
  await notifyChange();
}

// Manually zero a channel's count: stamp `countResetAt = now` so the bot starts
// counting screenshots from this moment, and clear the live tally immediately so
// the dashboard and reports page update without waiting for the next bot tick.
export async function resetReportChannel(id: string): Promise<Result> {
  const denied = await adminGuard();
  if (denied) return denied;
  if (!id) return { error: "Missing channel." };

  const row = (
    await db
      .select({ currentCount: reportChannel.currentCount })
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

  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}
