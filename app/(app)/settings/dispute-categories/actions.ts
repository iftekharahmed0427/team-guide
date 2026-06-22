"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { disputeCategory } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const PAGE = "/settings/dispute-categories";
const DISPUTES_PAGE = "/disputes";

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
  revalidatePath(PAGE);
  revalidatePath(DISPUTES_PAGE);
}

// Add a category. Categories are stored as text on each dispute, so this only
// affects the options offered going forward (existing disputes keep their label).
export async function createCategory(name: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage categories." };
  }
  const label = clean(name);
  if (!label) return { error: "Enter a category name." };

  const existing = await db
    .select({ id: disputeCategory.id })
    .from(disputeCategory)
    .where(eq(disputeCategory.name, label))
    .limit(1);
  if (existing.length > 0) return { error: "That category already exists." };

  const rows = await db.select({ s: disputeCategory.sortOrder }).from(disputeCategory);
  const next = rows.reduce((m, r) => Math.max(m, r.s), -1) + 1;

  await db.insert(disputeCategory).values({ id: randomUUID(), name: label, sortOrder: next });
  await logActivity("dispute.category_created", label);
  await refresh();
  return { ok: true };
}

export async function renameCategory(id: string, name: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage categories." };
  }
  if (!id) return { error: "Missing category." };
  const label = clean(name);
  if (!label) return { error: "Enter a category name." };

  const existing = await db
    .select({ id: disputeCategory.id })
    .from(disputeCategory)
    .where(eq(disputeCategory.name, label))
    .limit(1);
  if (existing.length > 0 && existing[0].id !== id) {
    return { error: "That category already exists." };
  }

  await db.update(disputeCategory).set({ name: label }).where(eq(disputeCategory.id, id));
  await logActivity("dispute.category_renamed", label);
  await refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage categories." };
  }
  if (!id) return { error: "Missing category." };

  const row = (
    await db
      .select({ name: disputeCategory.name })
      .from(disputeCategory)
      .where(eq(disputeCategory.id, id))
      .limit(1)
  )[0];
  await db.delete(disputeCategory).where(eq(disputeCategory.id, id));
  await logActivity("dispute.category_deleted", row?.name ?? "a category");
  await refresh();
  return { ok: true };
}
