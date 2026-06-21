"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { paymentRole } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const ROLES_PAGE = "/settings/payment-roles";
const PAYMENTS_PAGE = "/payments";

type Result = { ok: true } | { error: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Not authorized");
  return session;
}

function clean(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 60);
}

async function refresh() {
  await notifyChange();
  revalidatePath(ROLES_PAGE);
  revalidatePath(PAYMENTS_PAGE);
}

// Add a new role to the catalog. Appended after the existing roles.
export async function createRole(name: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage roles." };
  }
  const label = clean(name);
  if (!label) return { error: "Enter a role name." };

  const rows = await db.select({ s: paymentRole.sortOrder }).from(paymentRole);
  const next = rows.reduce((m, r) => Math.max(m, r.s), -1) + 1;

  await db.insert(paymentRole).values({ id: randomUUID(), name: label, sortOrder: next });
  await logActivity("payment.role_created", label);
  await refresh();
  return { ok: true };
}

// Rename an existing role.
export async function renameRole(id: string, name: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage roles." };
  }
  if (!id) return { error: "Missing role." };
  const label = clean(name);
  if (!label) return { error: "Enter a role name." };

  await db.update(paymentRole).set({ name: label }).where(eq(paymentRole.id, id));
  await logActivity("payment.role_renamed", label);
  await refresh();
  return { ok: true };
}

// Toggle whether a role is paid per ticket (the "Tickets" group) or base only.
export async function setRolePayType(id: string, paidPerTicket: boolean): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage roles." };
  }
  if (!id) return { error: "Missing role." };

  const role = (
    await db.select({ name: paymentRole.name }).from(paymentRole).where(eq(paymentRole.id, id)).limit(1)
  )[0];
  await db.update(paymentRole).set({ paidPerTicket }).where(eq(paymentRole.id, id));
  await logActivity("payment.role_paytype", role?.name ?? "a role");
  await refresh();
  return { ok: true };
}

// Toggle whether a role gets the Bonus + Recovered revenue fields (the
// "Disputes" group).
export async function setRoleBonusEligible(id: string, bonusEligible: boolean): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage roles." };
  }
  if (!id) return { error: "Missing role." };

  const role = (
    await db.select({ name: paymentRole.name }).from(paymentRole).where(eq(paymentRole.id, id)).limit(1)
  )[0];
  await db.update(paymentRole).set({ bonusEligible }).where(eq(paymentRole.id, id));
  await logActivity("payment.role_bonus", role?.name ?? "a role");
  await refresh();
  return { ok: true };
}

// Delete a role. Members assigned to it are unassigned (FK on delete set null).
export async function deleteRole(id: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage roles." };
  }
  if (!id) return { error: "Missing role." };

  const role = (
    await db.select({ name: paymentRole.name }).from(paymentRole).where(eq(paymentRole.id, id)).limit(1)
  )[0];
  await db.delete(paymentRole).where(eq(paymentRole.id, id));
  await logActivity("payment.role_deleted", role?.name ?? "a role");
  await refresh();
  return { ok: true };
}
