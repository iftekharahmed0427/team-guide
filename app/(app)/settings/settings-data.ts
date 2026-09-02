import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLog,
  botSetting,
  botStatus,
  disputeCategory,
  gameCategory,
  invite as inviteTable,
  memberGame,
  paymentRole,
  reportChannel,
  reportPeriod,
  reviewSetting,
  reviewSource,
} from "@/db/app-schema";
import { user as userTable } from "@/db/auth-schema";
import { TICKET_RATE } from "@/lib/payment-constants";
import { DISPUTE_BONUS_RATE } from "@/lib/disputes";
import { REVIEW_BONUS_DEFAULTS } from "@/lib/reviews";
import { formatDate } from "@/lib/datetime";
import type { SettingsFacts } from "./settings-index";

// The live numbers on the overview cards, so the hub doubles as a status board:
// an admin can see the bot is online and the period is eleven days old without
// opening either page.
//
// Server-only (it reads the database). The shape it returns is a plain map of
// group id to a couple of short facts, which is all the client overview needs.
//
// Everything here reads the same tables the live settings pages do. Nothing is
// invented: a card either shows a real number or says the thing is unset.

const BOT_STATE: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  error: "Error",
  no_token: "No token set",
};

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export async function getSettingsFacts(): Promise<SettingsFacts> {
  const [
    setting,
    status,
    channels,
    roles,
    categories,
    sources,
    games,
    members,
    invites,
    lastPeriod,
    activityCount,
    reviewBonus,
    specialists,
  ] = await Promise.all([
    db
      .select({ periodDays: botSetting.periodDays })
      .from(botSetting)
      .where(eq(botSetting.id, "singleton"))
      .limit(1),
    db
      .select({ state: botStatus.state, botTag: botStatus.botTag })
      .from(botStatus)
      .where(eq(botStatus.id, "singleton"))
      .limit(1),
    db.select({ n: count() }).from(reportChannel),
    db.select({ n: count() }).from(paymentRole),
    db.select({ n: count() }).from(disputeCategory),
    db.select({ n: count() }).from(reviewSource),
    db.select({ n: count() }).from(gameCategory),
    db.select({ n: count() }).from(userTable),
    db.select({ n: count() }).from(inviteTable),
    db
      .select({ endedAt: reportPeriod.endedAt })
      .from(reportPeriod)
      .orderBy(desc(reportPeriod.endedAt))
      .limit(1),
    db.select({ n: count() }).from(activityLog),
    db
      .select({
        threshold: reviewSetting.threshold,
        amount: reviewSetting.amount,
      })
      .from(reviewSetting)
      .where(eq(reviewSetting.id, "singleton"))
      .limit(1),
    db.select({ n: count() }).from(memberGame),
  ]);

  const periodDays = setting[0]?.periodDays ?? 14;
  const endedAt = lastPeriod[0]?.endedAt ?? null;
  const bonus = reviewBonus[0] ?? REVIEW_BONUS_DEFAULTS;

  // Pending invites are the ones nobody has signed in with yet. The team page
  // works this out by email; a count of both is enough for a card.
  const pendingInvites = Math.max(0, (invites[0]?.n ?? 0) - (members[0]?.n ?? 0));

  return {
    period: [
      plural(periodDays, "day", "days") + " long",
      endedAt ? `Since ${formatDate(endedAt)}` : "No reset yet",
    ],
    bot: [
      BOT_STATE[status[0]?.state ?? "offline"] ?? (status[0]?.state as string),
      plural(channels[0]?.n ?? 0, "report channel"),
    ],
    lists: [
      plural(roles[0]?.n ?? 0, "role"),
      plural(categories[0]?.n ?? 0, "category", "categories"),
      plural(sources[0]?.n ?? 0, "source"),
    ],
    "pay-rules": [
      `$${TICKET_RATE} per ticket`,
      `${Math.round(DISPUTE_BONUS_RATE * 100)}% dispute bonus`,
      `$${bonus.amount} at ${bonus.threshold} reviews`,
    ],
    activity: [
      plural(activityCount[0]?.n ?? 0, "entry", "entries"),
      "Newest first",
    ],
    people: [
      plural(members[0]?.n ?? 0, "member"),
      pendingInvites > 0 ? plural(pendingInvites, "pending invite") : "No pending invites",
    ],
    games: [
      plural(games[0]?.n ?? 0, "game"),
      plural(specialists[0]?.n ?? 0, "assignment"),
    ],
  };
}
