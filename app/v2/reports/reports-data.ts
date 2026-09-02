import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  botSetting,
  reportChannel,
  reportPeriod,
  ticketCount,
} from "@/db/app-schema";
import { account, user as userTable } from "@/db/auth-schema";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { plainName } from "../member";

// The standings behind /v2/reports, computed the way the live page does it so
// both agree: one entry per report channel, resolved to the member who owns it
// where there is one.

export type Trend = "up" | "down" | "flat";

export type Entry = {
  id: string;
  name: string;
  initials: string;
  count: number;
  /** Tickets per day over the window the count covers. */
  avgPerDay: number;
  trend: Trend;
  isYou: boolean;
};

export type Standings = {
  entries: Entry[];
  total: number;
  periodLabel: string;
  resetLabel: string;
};

const DAY_MS = 1000 * 60 * 60 * 24;

const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
};

export async function getStandings(
  currentUserId: string,
): Promise<Standings> {
  const now = Date.now();

  const [setting, lastArchive, tc, rows] = await Promise.all([
    db
      .select({ periodDays: botSetting.periodDays })
      .from(botSetting)
      .where(eq(botSetting.id, "singleton"))
      .limit(1),
    db
      .select({ endedAt: reportPeriod.endedAt })
      .from(reportPeriod)
      .orderBy(desc(reportPeriod.endedAt))
      .limit(1),
    db
      .select({ periodStart: ticketCount.periodStart })
      .from(ticketCount)
      .where(eq(ticketCount.id, "singleton"))
      .limit(1),
    // Left joined so a channel that counts everyone still has a row.
    db
      .select({
        id: reportChannel.id,
        channelName: reportChannel.name,
        current: reportChannel.currentCount,
        previous: reportChannel.previousCount,
        resetAt: reportChannel.countResetAt,
        userId: userTable.id,
        userName: userTable.name,
      })
      .from(reportChannel)
      .leftJoin(
        account,
        and(
          eq(account.accountId, reportChannel.userId),
          eq(account.providerId, "discord"),
        ),
      )
      .leftJoin(userTable, eq(userTable.id, account.userId))
      .orderBy(desc(reportChannel.currentCount), asc(reportChannel.createdAt)),
  ]);

  const periodDays = setting[0]?.periodDays ?? 14;
  const periodStartSource =
    lastArchive[0]?.endedAt ?? tc[0]?.periodStart ?? null;
  const periodStartMs = periodStartSource
    ? new Date(periodStartSource).getTime()
    : null;

  const entries: Entry[] = rows.map((r) => {
    const count = r.current ?? 0;
    const resetMs = r.resetAt ? new Date(r.resetAt).getTime() : null;
    // Averaged over the window the count actually covers: days since the
    // channel's last reset, or the period length when it has never been reset.
    const daysTracked = resetMs
      ? Math.max(1, Math.round((now - resetMs) / DAY_MS))
      : Math.max(1, periodDays);
    const name = plainName(r.userName || r.channelName || "Member");

    // The bot snapshots each channel's closing count into previousCount when a
    // period ends, so this compares like with like.
    const previous = r.previous ?? 0;
    const trend: Trend =
      count > previous ? "up" : count < previous ? "down" : "flat";

    return {
      id: r.id,
      name,
      initials: initialsOf(name),
      count,
      avgPerDay: Math.round((count / daysTracked) * 10) / 10,
      trend,
      isYou: !!r.userId && r.userId === currentUserId,
    };
  });

  const daysIn = periodStartMs
    ? Math.max(1, Math.round((now - periodStartMs) / DAY_MS))
    : 0;

  return {
    entries,
    total: entries.reduce((sum, e) => sum + e.count, 0),
    periodLabel: periodStartMs
      ? `Current period: since ${formatDate(periodStartMs)} (${daysIn} ${daysIn === 1 ? "day" : "days"})`
      : "Current period: ongoing (no reset yet)",
    resetLabel: periodStartMs
      ? `Reset ${formatDateTime(periodStartMs)}`
      : "No reset yet",
  };
}
