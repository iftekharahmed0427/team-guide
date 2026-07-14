"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { review, reviewSetting, reviewBonusMember, reviewSource } from "@/db/app-schema";
import { user as userTable } from "@/db/auth-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { storageEnabled, uploadDataUrl, deleteObject } from "@/lib/storage";

const PAGE = "/reviews";
// A downscaled JPEG data URL is well under this; the cap just blocks abuse.
const MAX_IMAGE_CHARS = 4_000_000;

type Result = { ok: true } | { error: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

// Log one review for the current period (admin only). The screenshot arrives as
// a data URL the client already downscaled (see editor-images.ts).
export async function addReview(input: {
  source: string;
  imageUrl: string;
  note: string;
}): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Only admins can add reviews." };

  const known = await db
    .select({ id: reviewSource.id })
    .from(reviewSource)
    .where(eq(reviewSource.id, input.source))
    .limit(1);
  if (known.length === 0) return { error: "Pick a review source." };

  const dataUrl = input.imageUrl.trim();
  if (!dataUrl.startsWith("data:image/")) return { error: "Attach a screenshot of the review." };
  if (dataUrl.length > MAX_IMAGE_CHARS) {
    return { error: "That image is too large. Try a tighter screenshot." };
  }

  // Upload to the private bucket and store the object key; fall back to inlining
  // the data URL if storage isn't configured.
  let imageUrl = dataUrl;
  if (storageEnabled()) {
    try {
      imageUrl = await uploadDataUrl(dataUrl, "reviews");
    } catch {
      return { error: "Couldn't upload the screenshot. Try again." };
    }
  }

  await db.insert(review).values({
    id: randomUUID(),
    source: input.source,
    imageUrl,
    note: input.note.trim().slice(0, 300),
    addedById: session.user.id,
    addedByName: session.user.name || session.user.email || "Admin",
  });
  await logActivity("review.added", input.source);
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

// Toggle a member's review-bonus eligibility (admin only). A row in
// review_bonus_member = eligible; the bonus only pays out when the period's
// total reviews reach the threshold (see lib/reviews.getReviewBonusByUser).
export async function setReviewEligibility(userId: string, eligible: boolean): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Only admins can change eligibility." };
  if (!userId) return { error: "Missing member." };

  const u = (
    await db
      .select({ name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1)
  )[0];
  if (!u) return { error: "That member no longer exists." };
  const who = u.name || u.email || "Member";

  if (eligible) {
    await db.insert(reviewBonusMember).values({ userId }).onConflictDoNothing();
  } else {
    await db.delete(reviewBonusMember).where(eq(reviewBonusMember.userId, userId));
  }
  await logActivity("review.eligibility_set", `${who} ${eligible ? "eligible" : "not eligible"}`);
  revalidatePath(PAGE);
  revalidatePath("/payments"); // eligibility may change a member's bonus there
  await notifyChange();
  return { ok: true };
}

// Update the review-bonus rule: when the team's total reviews this period reach
// `threshold`, each eligible member earns a flat `amount` USD. Admin only.
export async function updateReviewBonus(input: {
  threshold: number;
  amount: number;
}): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Only admins can change the review bonus." };

  const threshold = Math.max(0, Math.floor(Number(input.threshold) || 0));
  const amount = Math.max(0, Math.round((Number(input.amount) || 0) * 100) / 100);

  await db
    .insert(reviewSetting)
    .values({ id: "singleton", threshold, amount })
    .onConflictDoUpdate({ target: reviewSetting.id, set: { threshold, amount } });
  await logActivity("review.bonus_updated", `${threshold}+ reviews -> ${amount}/member`);
  revalidatePath(PAGE);
  revalidatePath("/payments");
  await notifyChange();
  return { ok: true };
}

export async function deleteReview(id: string): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Only admins can delete reviews." };
  if (!id) return { error: "Missing review." };

  const row = (await db.select({ imageUrl: review.imageUrl }).from(review).where(eq(review.id, id)).limit(1))[0];
  await db.delete(review).where(eq(review.id, id));
  // Remove the stored object too (keys, not inline data URLs).
  if (row?.imageUrl && !row.imageUrl.startsWith("data:")) {
    await deleteObject(row.imageUrl);
  }
  await logActivity("review.deleted");
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}
