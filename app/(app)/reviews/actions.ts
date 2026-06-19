"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { review } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";

const PAGE = "/reviews";
const SOURCES = new Set(["trustpilot", "google"]);
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

  if (!SOURCES.has(input.source)) return { error: "Pick a review source." };
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl.startsWith("data:image/")) return { error: "Attach a screenshot of the review." };
  if (imageUrl.length > MAX_IMAGE_CHARS) {
    return { error: "That image is too large. Try a tighter screenshot." };
  }

  await db.insert(review).values({
    id: randomUUID(),
    source: input.source,
    imageUrl,
    note: input.note.trim().slice(0, 300),
    addedById: session.user.id,
    addedByName: session.user.name || session.user.email || "Admin",
  });
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}

export async function deleteReview(id: string): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Only admins can delete reviews." };
  if (!id) return { error: "Missing review." };
  await db.delete(review).where(eq(review.id, id));
  revalidatePath(PAGE);
  await notifyChange();
  return { ok: true };
}
