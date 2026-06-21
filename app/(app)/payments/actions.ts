"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { paymentOverride, paymentRole } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const PAGE = "/payments";

type Result = { ok: true } | { error: string };

export type PaymentChange = {
  userId: string;
  ticketOverride: number | null; // null = track the live Reports count
  roleId: string | null; // null = unassigned
  baseCompensation: number;
};

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Not authorized");
  return session;
}

// Batch-save the admin's staged edits from the /payments table: one upsert per
// changed member writing role, ticket override, and base compensation together.
export async function savePayments(changes: PaymentChange[]): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can edit payments." };
  }
  if (!Array.isArray(changes) || changes.length === 0) return { ok: true };

  // Validate referenced roles once.
  const validRoleIds = new Set(
    (await db.select({ id: paymentRole.id }).from(paymentRole)).map((r) => r.id),
  );

  const rows = [];
  for (const c of changes) {
    if (!c.userId) return { error: "Missing member." };

    let ticketOverride: number | null = null;
    if (c.ticketOverride !== null) {
      const n = Math.round(Number(c.ticketOverride));
      if (!Number.isFinite(n) || n < 0) return { error: "Ticket counts must be whole numbers." };
      ticketOverride = n;
    }

    const baseCompensation = Math.round((Number(c.baseCompensation) || 0) * 100) / 100;
    if (!Number.isFinite(baseCompensation) || baseCompensation < 0) {
      return { error: "Base compensation must be a valid amount." };
    }

    const roleId = c.roleId || null;
    if (roleId && !validRoleIds.has(roleId)) return { error: "A selected role no longer exists." };

    rows.push({ userId: c.userId, ticketOverride, roleId, baseCompensation });
  }

  for (const r of rows) {
    await db
      .insert(paymentOverride)
      .values(r)
      .onConflictDoUpdate({
        target: paymentOverride.userId,
        set: {
          ticketOverride: r.ticketOverride,
          roleId: r.roleId,
          baseCompensation: r.baseCompensation,
          updatedAt: new Date(),
        },
      });
  }

  await logActivity("payment.saved", `${rows.length} member${rows.length === 1 ? "" : "s"}`);
  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true };
}
