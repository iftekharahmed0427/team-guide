"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { paymentOverride, paymentRole } from "@/db/app-schema";
import { user as userTable } from "@/db/auth-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const PAGE = "/payments";

type Result = { ok: true } | { error: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Not authorized");
  return session;
}

async function memberName(userId: string): Promise<string | null> {
  const m = (
    await db
      .select({ name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1)
  )[0];
  return m ? m.name || m.email || "a member" : null;
}

// Admin sets or clears a member's ticket-count override. Pass null to clear the
// override so the count tracks the live Reports total again. A whole, non-negative
// number sets a fixed count that takes precedence over the live count.
export async function setTicketOverride(userId: string, value: number | null): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can edit ticket counts." };
  }
  if (!userId) return { error: "Missing member." };
  const who = await memberName(userId);
  if (!who) return { error: "That member no longer exists." };

  let ticketOverride: number | null = null;
  if (value !== null) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 0) return { error: "Enter a whole number of tickets." };
    ticketOverride = n;
  }

  // Upsert (never delete) so a member's role on the same row is preserved. A null
  // ticketOverride means the count tracks the live Reports total again.
  await db
    .insert(paymentOverride)
    .values({ userId, ticketOverride })
    .onConflictDoUpdate({
      target: paymentOverride.userId,
      set: { ticketOverride, updatedAt: new Date() },
    });

  await logActivity(ticketOverride === null ? "payment.tickets_reset" : "payment.tickets_updated", who);
  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true };
}

// Admin assigns or clears a member's payment role. Pass null to unassign.
export async function setMemberRole(userId: string, roleId: string | null): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can assign roles." };
  }
  if (!userId) return { error: "Missing member." };
  const who = await memberName(userId);
  if (!who) return { error: "That member no longer exists." };

  if (roleId) {
    const exists = (
      await db.select({ id: paymentRole.id }).from(paymentRole).where(eq(paymentRole.id, roleId)).limit(1)
    )[0];
    if (!exists) return { error: "That role no longer exists." };
  }

  await db
    .insert(paymentOverride)
    .values({ userId, roleId })
    .onConflictDoUpdate({
      target: paymentOverride.userId,
      set: { roleId, updatedAt: new Date() },
    });

  await logActivity("payment.role_assigned", who);
  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true };
}
