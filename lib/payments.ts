import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { reportChannel, reportPeriod, ticketCount, botSetting, paymentOverride, paymentRole } from "@/db/app-schema";
import { user as userTable, account } from "@/db/auth-schema";
import { effectiveTickets, type PayableMember, type PaymentRole } from "@/app/(app)/payments/constants";

const DAY_MS = 1000 * 60 * 60 * 24;

// Build the payable member list: each member's live current-period ticket count
// from the Reports channels (Discord snowflake -> account -> app user). Counts
// from multiple channels owned by the same member are merged. Channels not
// linked to a user are excluded.
export async function getPayableMembers(): Promise<PayableMember[]> {
  const [rows, overrides] = await Promise.all([
    db
      .select({
        channelId: reportChannel.id,
        channelName: reportChannel.name,
        current: reportChannel.currentCount,
        userId: userTable.id,
        userName: userTable.name,
        image: userTable.image,
      })
      .from(reportChannel)
      .leftJoin(
        account,
        and(eq(account.accountId, reportChannel.userId), eq(account.providerId, "discord")),
      )
      .leftJoin(userTable, eq(userTable.id, account.userId))
      .where(isNotNull(reportChannel.userId))
      .orderBy(desc(reportChannel.currentCount)),
    db
      .select({
        userId: paymentOverride.userId,
        ticketOverride: paymentOverride.ticketOverride,
        roleId: paymentOverride.roleId,
        roleName: paymentRole.name,
        paidPerTicket: paymentRole.paidPerTicket,
        baseCompensation: paymentOverride.baseCompensation,
      })
      .from(paymentOverride)
      .leftJoin(paymentRole, eq(paymentRole.id, paymentOverride.roleId)),
  ]);

  const ovById = new Map(overrides.map((o) => [o.userId, o]));

  const byKey = new Map<string, PayableMember>();
  for (const r of rows) {
    const key = r.userId ?? `channel:${r.channelId}`;
    const o = r.userId ? ovById.get(r.userId) : undefined;
    const existing = byKey.get(key);
    const tickets = (existing?.tickets ?? 0) + (r.current ?? 0);
    byKey.set(key, {
      userId: r.userId ?? null,
      channelId: r.channelId,
      name: r.userName || r.channelName || "Member",
      image: r.image ?? null,
      tickets,
      override: o?.ticketOverride ?? null,
      roleId: o?.roleId ?? null,
      roleName: o?.roleName ?? null,
      // Unassigned members default to paid-per-ticket (the ticket-handler group).
      paidPerTicket: o?.roleId ? o.paidPerTicket ?? false : true,
      baseCompensation: o?.baseCompensation ?? 0,
    });
  }

  return [...byKey.values()].sort(
    (a, b) => effectiveTickets(b) - effectiveTickets(a) || a.name.localeCompare(b.name),
  );
}

// The admin-managed catalog of payment roles, in display order. Shared by the
// /payments Role dropdown and the /settings/payment-roles manager.
export async function getPaymentRoles(): Promise<PaymentRole[]> {
  return db
    .select({
      id: paymentRole.id,
      name: paymentRole.name,
      paidPerTicket: paymentRole.paidPerTicket,
    })
    .from(paymentRole)
    .orderBy(asc(paymentRole.sortOrder), asc(paymentRole.name));
}

// The live period as a From/To range. `start` is the most recent "Reset all"
// (the end of the last archived period), else the legacy period start stored in
// ticket_count; null means no reset has happened yet. `end` projects the biweekly
// window: start + the configured period length (botSetting.periodDays, 14 by
// default).
export async function getCurrentPeriod(): Promise<{ start: Date | null; end: Date | null }> {
  const [lastArchive, tc, setting] = await Promise.all([
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
    db
      .select({ periodDays: botSetting.periodDays })
      .from(botSetting)
      .where(eq(botSetting.id, "singleton"))
      .limit(1),
  ]);
  const src = lastArchive[0]?.endedAt ?? tc[0]?.periodStart ?? null;
  const start = src ? new Date(src) : null;
  const days = setting[0]?.periodDays ?? 14;
  const end = start ? new Date(start.getTime() + days * DAY_MS) : null;
  return { start, end };
}
