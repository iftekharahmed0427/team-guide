import { randomUUID } from "node:crypto";
import { asc, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { paymentPeriod, paymentPeriodRow } from "@/db/app-schema";
import { user as userTable } from "@/db/auth-schema";
import { getPayableMembers } from "@/lib/payments";
import {
  effectiveTickets,
  effectiveCommission,
  TICKET_RATE,
} from "@/app/(app)/payments/constants";

export type PaymentHistoryRow = {
  id: string;
  memberId: string | null;
  memberName: string;
  memberImage: string | null;
  roleName: string;
  paidPerTicket: boolean;
  tickets: number;
  baseCompensation: number;
  bonus: number;
  commission: number;
  amountOverride: number | null;
};

export type PaymentHistoryPeriod = {
  id: string;
  label: string;
  startDate: string | null;
  endDate: string | null;
  ticketRate: number;
  source: string;
  rows: PaymentHistoryRow[];
};

// All archived pay periods, newest first, each with its rows. A row's avatar is
// resolved from its linked user when that user still exists; otherwise the row
// falls back to a letter avatar from memberName.
export async function getPaymentHistory(): Promise<PaymentHistoryPeriod[]> {
  const periods = await db
    .select()
    .from(paymentPeriod)
    .orderBy(desc(paymentPeriod.endDate), desc(paymentPeriod.createdAt));
  if (periods.length === 0) return [];

  const ids = periods.map((p) => p.id);
  const rows = await db
    .select()
    .from(paymentPeriodRow)
    .where(inArray(paymentPeriodRow.periodId, ids))
    .orderBy(asc(paymentPeriodRow.position), asc(paymentPeriodRow.createdAt));

  const memberIds = [...new Set(rows.map((r) => r.memberId).filter((x): x is string => !!x))];
  const images = new Map<string, string | null>();
  if (memberIds.length) {
    const users = await db
      .select({ id: userTable.id, image: userTable.image })
      .from(userTable)
      .where(inArray(userTable.id, memberIds));
    for (const u of users) images.set(u.id, u.image ?? null);
  }

  const byPeriod = new Map<string, PaymentHistoryRow[]>();
  for (const r of rows) {
    const list = byPeriod.get(r.periodId) ?? [];
    list.push({
      id: r.id,
      memberId: r.memberId,
      memberName: r.memberName,
      memberImage: r.memberId ? images.get(r.memberId) ?? null : null,
      roleName: r.roleName,
      paidPerTicket: r.paidPerTicket,
      tickets: r.tickets,
      baseCompensation: r.baseCompensation,
      bonus: r.bonus,
      commission: r.commission,
      amountOverride: r.amountOverride,
    });
    byPeriod.set(r.periodId, list);
  }

  return periods.map((p) => ({
    id: p.id,
    label: p.label,
    startDate: p.startDate,
    endDate: p.endDate,
    ticketRate: p.ticketRate,
    source: p.source,
    rows: byPeriod.get(p.id) ?? [],
  }));
}

const toDateStr = (d: Date | null): string | null =>
  d ? d.toISOString().slice(0, 10) : null;

// Snapshot the CURRENT payments table into history. Called from "Reset all" with
// the closing period's date range, BEFORE counts are zeroed and before reviews /
// disputes / commissions are stamped with the period (so the live totals are
// captured). Bonus is flattened to the total paid (manual + disputes + review).
// Skips all-zero rows. Returns the new period id, or null if there was nothing.
export async function snapshotPaymentsPeriod(
  startedAt: Date | null,
  endedAt: Date | null,
): Promise<string | null> {
  const members = (await getPayableMembers()).filter((m) => !m.hidden);

  const rows = members
    .map((m) => ({
      userId: m.userId,
      name: m.name,
      roleName: m.roleName ?? "Unassigned",
      paidPerTicket: m.paidPerTicket,
      tickets: effectiveTickets(m),
      baseCompensation: m.baseCompensation || 0,
      bonus: (m.bonus || 0) + (m.disputeBonus || 0) + (m.reviewBonus || 0),
      commission: effectiveCommission(m),
    }))
    .filter((r) => r.tickets > 0 || r.baseCompensation > 0 || r.bonus > 0 || r.commission > 0);

  if (rows.length === 0) return null;

  const periodId = randomUUID();
  await db.insert(paymentPeriod).values({
    id: periodId,
    label: "",
    startDate: toDateStr(startedAt),
    endDate: toDateStr(endedAt),
    ticketRate: TICKET_RATE,
    source: "reset",
  });
  await db.insert(paymentPeriodRow).values(
    rows.map((r, i) => ({
      id: randomUUID(),
      periodId,
      memberId: r.userId,
      memberName: r.name,
      roleName: r.roleName,
      paidPerTicket: r.paidPerTicket,
      tickets: r.tickets,
      baseCompensation: r.baseCompensation,
      bonus: r.bonus,
      commission: r.commission,
      amountOverride: null,
      position: i,
    })),
  );
  return periodId;
}
