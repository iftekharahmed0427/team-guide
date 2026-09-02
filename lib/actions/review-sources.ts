"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { reviewSource } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const PAGE = "/settings/review-sources";
const REVIEWS_PAGE = "/reviews";

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
  revalidatePath(REVIEWS_PAGE);
}

// Add a review source. `review.source` stores the source id, so existing reviews
// are unaffected; this only adds an option going forward.
export async function createSource(name: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage review sources." };
  }
  const label = clean(name);
  if (!label) return { error: "Enter a source name." };

  const existing = await db
    .select({ id: reviewSource.id })
    .from(reviewSource)
    .where(eq(reviewSource.name, label))
    .limit(1);
  if (existing.length > 0) return { error: "That source already exists." };

  const rows = await db.select({ s: reviewSource.sortOrder }).from(reviewSource);
  const next = rows.reduce((m, r) => Math.max(m, r.s), -1) + 1;

  await db.insert(reviewSource).values({ id: randomUUID(), name: label, sortOrder: next });
  await logActivity("review.source_created", label);
  await refresh();
  return { ok: true };
}

// Rename a source. Because reviews store the id, the new label shows everywhere,
// including on already-logged reviews.
export async function renameSource(id: string, name: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage review sources." };
  }
  if (!id) return { error: "Missing source." };
  const label = clean(name);
  if (!label) return { error: "Enter a source name." };

  const existing = await db
    .select({ id: reviewSource.id })
    .from(reviewSource)
    .where(eq(reviewSource.name, label))
    .limit(1);
  if (existing.length > 0 && existing[0].id !== id) {
    return { error: "That source already exists." };
  }

  await db.update(reviewSource).set({ name: label }).where(eq(reviewSource.id, id));
  await logActivity("review.source_renamed", label);
  await refresh();
  return { ok: true };
}

// Delete a source (removes the option). Reviews already logged under it keep their
// id and simply lose the friendly label (they fall back to the raw id).
export async function deleteSource(id: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can manage review sources." };
  }
  if (!id) return { error: "Missing source." };

  const row = (
    await db.select({ name: reviewSource.name }).from(reviewSource).where(eq(reviewSource.id, id)).limit(1)
  )[0];
  await db.delete(reviewSource).where(eq(reviewSource.id, id));
  await logActivity("review.source_deleted", row?.name ?? "a source");
  await refresh();
  return { ok: true };
}
