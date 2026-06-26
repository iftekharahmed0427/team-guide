"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { paymentPeriod, paymentPeriodRow } from "@/db/app-schema";
import { user as userTable } from "@/db/auth-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const PAGE = "/payments/history";

type Result = { ok: true } | { error: string };

export type PeriodRowInput = {
  memberName: string;
  memberId: string | null; // explicit link; else resolved by name
  roleName: string;
  paidPerTicket: boolean;
  tickets: number;
  baseCompensation: number;
  bonus: number;
  commission: number;
  amountOverride: number | null;
};

export type SavePeriodInput = {
  id?: string; // present = update an existing period
  label: string;
  startDate: string | null;
  endDate: string | null;
  ticketRate: number;
  rows: PeriodRowInput[];
};

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Not authorized");
  return session;
}

const money = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100;
const whole = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

// Create or replace a historical pay period and all its rows in one save.
export async function savePeriod(input: SavePeriodInput): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can edit payment history." };
  }

  const label = (input.label ?? "").trim().slice(0, 120);
  const startDate = input.startDate?.trim() || null;
  const endDate = input.endDate?.trim() || null;
  for (const d of [startDate, endDate]) {
    if (d && Number.isNaN(Date.parse(d))) return { error: "Enter valid dates." };
  }
  const ticketRate = money(input.ticketRate);
  if (!Number.isFinite(ticketRate) || ticketRate < 0) {
    return { error: "Ticket rate must be a non-negative number." };
  }

  const cleanRows = (Array.isArray(input.rows) ? input.rows : [])
    .map((r) => ({
      memberName: (r.memberName ?? "").trim().slice(0, 80),
      memberId: r.memberId || null,
      roleName: (r.roleName ?? "").trim().slice(0, 60),
      paidPerTicket: !!r.paidPerTicket,
      tickets: whole(r.tickets),
      baseCompensation: money(r.baseCompensation),
      bonus: money(r.bonus),
      commission: money(r.commission),
      amountOverride:
        r.amountOverride === null || r.amountOverride === undefined ? null : money(r.amountOverride),
    }))
    .filter((r) => r.memberName !== "");

  if (cleanRows.length === 0) return { error: "Add at least one member with a name." };
  for (const r of cleanRows) {
    if (
      [r.baseCompensation, r.bonus, r.commission].some((n) => n < 0) ||
      (r.amountOverride !== null && r.amountOverride < 0)
    ) {
      return { error: "Amounts must be non-negative." };
    }
  }

  // Resolve memberId by exact name match when not explicitly linked, so current
  // members get their avatar while departed names stay unlinked (letter avatar).
  const users = await db.select({ id: userTable.id, name: userTable.name }).from(userTable);
  const byName = new Map<string, string>();
  for (const u of users) if (u.name) byName.set(u.name.trim().toLowerCase(), u.id);
  const validIds = new Set(users.map((u) => u.id));
  for (const r of cleanRows) {
    if (r.memberId && !validIds.has(r.memberId)) r.memberId = null;
    if (!r.memberId) r.memberId = byName.get(r.memberName.toLowerCase()) ?? null;
  }

  const isUpdate = !!input.id;
  const periodId = input.id || randomUUID();

  if (isUpdate) {
    const exists = (
      await db.select({ id: paymentPeriod.id }).from(paymentPeriod).where(eq(paymentPeriod.id, periodId)).limit(1)
    )[0];
    if (!exists) return { error: "That period no longer exists." };
    await db
      .update(paymentPeriod)
      .set({ label, startDate, endDate, ticketRate })
      .where(eq(paymentPeriod.id, periodId));
    await db.delete(paymentPeriodRow).where(eq(paymentPeriodRow.periodId, periodId));
  } else {
    await db
      .insert(paymentPeriod)
      .values({ id: periodId, label, startDate, endDate, ticketRate, source: "manual" });
  }

  await db.insert(paymentPeriodRow).values(
    cleanRows.map((r, i) => ({
      id: randomUUID(),
      periodId,
      memberId: r.memberId,
      memberName: r.memberName,
      roleName: r.roleName,
      paidPerTicket: r.paidPerTicket,
      tickets: r.tickets,
      baseCompensation: r.baseCompensation,
      bonus: r.bonus,
      commission: r.commission,
      amountOverride: r.amountOverride,
      position: i,
    })),
  );

  await logActivity(isUpdate ? "payment.period_updated" : "payment.period_added", label || "period");
  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true };
}

// Copy a period and all its rows into a new one (labeled "(copy)"), so a similar
// period can be created without re-entering everyone. The copy is always manual.
export async function duplicatePeriod(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const period = (
    await db.select().from(paymentPeriod).where(eq(paymentPeriod.id, id)).limit(1)
  )[0];
  if (!period) return;

  const rows = await db
    .select()
    .from(paymentPeriodRow)
    .where(eq(paymentPeriodRow.periodId, id))
    .orderBy(asc(paymentPeriodRow.position));

  const newId = randomUUID();
  await db.insert(paymentPeriod).values({
    id: newId,
    label: (period.label ? `${period.label} (copy)` : "Copy").slice(0, 120),
    startDate: period.startDate,
    endDate: period.endDate,
    ticketRate: period.ticketRate,
    source: "manual",
  });
  if (rows.length > 0) {
    await db.insert(paymentPeriodRow).values(
      rows.map((r, i) => ({
        id: randomUUID(),
        periodId: newId,
        memberId: r.memberId,
        memberName: r.memberName,
        roleName: r.roleName,
        paidPerTicket: r.paidPerTicket,
        tickets: r.tickets,
        baseCompensation: r.baseCompensation,
        bonus: r.bonus,
        commission: r.commission,
        amountOverride: r.amountOverride,
        position: i,
      })),
    );
  }

  await logActivity("payment.period_duplicated", period.label || "period");
  await notifyChange();
  revalidatePath(PAGE);
}

// Delete a historical period (its rows cascade away with it).
export async function deletePeriod(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(paymentPeriod).where(eq(paymentPeriod.id, id));
  await logActivity("payment.period_deleted");
  await notifyChange();
  revalidatePath(PAGE);
}
