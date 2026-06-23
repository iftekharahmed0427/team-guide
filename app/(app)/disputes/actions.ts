"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { dispute, disputeCategory } from "@/db/app-schema";
import { canAccessDisputes } from "@/lib/disputes";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { storageEnabled, uploadDataUrl, deleteObject } from "@/lib/storage";

const PAGE = "/disputes";
const PAYMENTS = "/payments";
// A downscaled JPEG data URL is well under this; the cap just blocks abuse.
const MAX_IMAGE_CHARS = 4_000_000;

type Result = { ok: true } | { error: string };

// Log a dispute (Disputes-role members or admins). The screenshot arrives as a
// downscaled data URL from the client (see editor-images.ts). 5% of the amount
// flows into the submitter's /payments bonus for the current period.
export async function createDispute(input: {
  dispute: string;
  category: string;
  amount: number;
  imageUrl: string;
}): Promise<Result> {
  const session = await getSession();
  if (!session || !(await canAccessDisputes(session))) {
    return { error: "You don't have access to disputes." };
  }

  const disputeText = input.dispute.trim().slice(0, 200);
  if (!disputeText) return { error: "Enter the dispute." };

  const category = input.category.trim();
  const known = await db
    .select({ id: disputeCategory.id })
    .from(disputeCategory)
    .where(eq(disputeCategory.name, category))
    .limit(1);
  if (known.length === 0) return { error: "Pick a category." };

  const amount = Math.round((Number(input.amount) || 0) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0) return { error: "Enter a valid amount." };

  const dataUrl = input.imageUrl.trim();
  if (!dataUrl.startsWith("data:image/")) return { error: "Attach a screenshot of the dispute." };
  if (dataUrl.length > MAX_IMAGE_CHARS) {
    return { error: "That image is too large. Try a tighter screenshot." };
  }

  // Upload to the private bucket and store the object key; fall back to inlining
  // the data URL if storage isn't configured (mirrors reviews/audits).
  let imageUrl = dataUrl;
  if (storageEnabled()) {
    try {
      imageUrl = await uploadDataUrl(dataUrl, "disputes");
    } catch {
      return { error: "Couldn't upload the screenshot. Try again." };
    }
  }

  await db.insert(dispute).values({
    id: randomUUID(),
    dispute: disputeText,
    category,
    amount,
    imageUrl,
    submittedById: session.user.id,
    submittedByName: session.user.name || session.user.email || "Member",
  });
  await logActivity("dispute.created", category);
  revalidatePath(PAGE);
  revalidatePath(PAYMENTS);
  await notifyChange();
  return { ok: true };
}

// Delete a dispute: the submitter (their own) or an admin (any).
export async function deleteDispute(id: string): Promise<Result> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!id) return { error: "Missing dispute." };

  const row = (
    await db
      .select({ imageUrl: dispute.imageUrl, submittedById: dispute.submittedById })
      .from(dispute)
      .where(eq(dispute.id, id))
      .limit(1)
  )[0];
  if (!row) return { error: "That dispute no longer exists." };

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && row.submittedById !== session.user.id) {
    return { error: "You can only delete your own disputes." };
  }

  await db.delete(dispute).where(eq(dispute.id, id));
  // Remove the stored object too (keys, not inline data URLs).
  if (row.imageUrl && !row.imageUrl.startsWith("data:")) {
    await deleteObject(row.imageUrl);
  }
  await logActivity("dispute.deleted");
  revalidatePath(PAGE);
  revalidatePath(PAYMENTS);
  await notifyChange();
  return { ok: true };
}
