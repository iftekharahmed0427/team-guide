"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { audit, auditScore, auditScreenshot } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { storageEnabled, uploadDataUrl, deleteObject } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { AUDIT_CRITERIA, computeTotals } from "./criteria";

const PAGE = "/audits";
const MAX_SHOTS = 8;
// A downscaled JPEG data URL is well under this; the cap just blocks abuse.
const MAX_IMAGE_CHARS = 4_000_000;

type Result = { ok: true; id: string } | { error: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Not authorized");
  return session;
}

export type ScoreInput = { key: string; na: boolean; score: number; comment: string };

type AuditFields = {
  memberId: string;
  memberName: string;
  ticketNumber: string;
  ticketType: string;
  ticketDate: string | null;
  summary: string;
  scores: ScoreInput[];
};

// Validate the shared fields and normalize the per-criterion scores against the
// rubric (the client total is never trusted). Returns the cleaned values, the
// computed totals, and the audit_score rows, or an error message.
function prepare(input: AuditFields) {
  const memberId = input.memberId?.trim();
  if (!memberId) return { ok: false as const, error: "Choose the team member being reviewed." };
  const ticketNumber = input.ticketNumber.trim().slice(0, 100);
  if (!ticketNumber) return { ok: false as const, error: "Ticket # is required." };
  const ticketDate = input.ticketDate?.trim() || null;
  if (ticketDate && Number.isNaN(Date.parse(ticketDate))) {
    return { ok: false as const, error: "Enter a valid ticket date." };
  }
  const rows = AUDIT_CRITERIA.map((c) => {
    const given = input.scores.find((s) => s.key === c.key);
    const na = c.allowNa && !!given?.na;
    const score = na ? 0 : Math.max(0, Math.min(c.maxPoints, Math.round(Number(given?.score) || 0)));
    return { key: c.key, na, score, comment: (given?.comment ?? "").trim().slice(0, 1000) };
  });
  const { total, possible } = computeTotals(rows);
  return {
    ok: true as const,
    values: {
      memberId,
      memberName: input.memberName.trim().slice(0, 120) || "Member",
      ticketNumber,
      ticketType: input.ticketType.trim().slice(0, 100),
      ticketDate,
      summary: input.summary.trim().slice(0, 2000),
    },
    rows,
    total,
    possible,
  };
}

// Upload new screenshots (client-downscaled data URLs) to the bucket, returning
// stored keys (or inline data URLs when storage is off), or an error message.
async function uploadNewShots(dataUrls: string[]): Promise<{ urls: string[] } | { error: string }> {
  const urls: string[] = [];
  for (const raw of (dataUrls ?? []).slice(0, MAX_SHOTS)) {
    const dataUrl = (raw ?? "").trim();
    if (!dataUrl.startsWith("data:image/")) continue;
    if (dataUrl.length > MAX_IMAGE_CHARS) {
      return { error: "One of the screenshots is too large. Try a tighter capture." };
    }
    if (storageEnabled()) {
      try {
        urls.push(await uploadDataUrl(dataUrl, "audits"));
      } catch {
        return { error: "Couldn't upload a screenshot. Try again." };
      }
    } else {
      urls.push(dataUrl);
    }
  }
  return { urls };
}

function scoreRowValues(auditId: string, rows: { key: string; na: boolean; score: number; comment: string }[]) {
  return rows.map((r) => ({
    id: randomUUID(),
    auditId,
    criterionKey: r.key,
    na: r.na,
    score: r.score,
    comment: r.comment,
  }));
}

// Admin creates a QA audit for a member's ticket (audit + one audit_score per
// criterion + any screenshots, written together).
export async function createAudit(input: AuditFields & { screenshots: string[] }): Promise<Result> {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return { error: "Only admins can create audits." };
  }

  const p = prepare(input);
  if (!p.ok) return { error: p.error };
  const shots = await uploadNewShots(input.screenshots);
  if ("error" in shots) return shots;

  const id = randomUUID();
  await db.insert(audit).values({
    id,
    ...p.values,
    reviewerId: session.user.id,
    reviewerName: session.user.name || session.user.email || "Admin",
    totalScore: p.total,
    possibleScore: p.possible,
  });
  await db.insert(auditScore).values(scoreRowValues(id, p.rows));
  if (shots.urls.length > 0) {
    await db.insert(auditScreenshot).values(
      shots.urls.map((imageUrl) => ({ id: randomUUID(), auditId: id, imageUrl })),
    );
  }

  await logActivity("audit.created", `#${p.values.ticketNumber}`);
  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true, id };
}

// Admin edits an existing audit: re-scores it, keeps the screenshots whose ids
// are in `keepScreenshotIds`, removes the rest (and their bucket objects), and
// adds any `newScreenshots`. The original reviewer is preserved.
export async function updateAudit(
  input: AuditFields & { id: string; keepScreenshotIds: string[]; newScreenshots: string[] },
): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can edit audits." };
  }
  if (!input.id) return { error: "Missing audit." };

  const p = prepare(input);
  if (!p.ok) return { error: p.error };
  const shots = await uploadNewShots(input.newScreenshots);
  if ("error" in shots) return shots;

  await db
    .update(audit)
    .set({ ...p.values, totalScore: p.total, possibleScore: p.possible })
    .where(eq(audit.id, input.id));

  // Replace the per-criterion scores.
  await db.delete(auditScore).where(eq(auditScore.auditId, input.id));
  await db.insert(auditScore).values(scoreRowValues(input.id, p.rows));

  // Drop removed screenshots (and their bucket objects), then add new ones.
  const existing = await db
    .select({ id: auditScreenshot.id, imageUrl: auditScreenshot.imageUrl })
    .from(auditScreenshot)
    .where(eq(auditScreenshot.auditId, input.id));
  const keep = new Set(input.keepScreenshotIds ?? []);
  const remove = existing.filter((s) => !keep.has(s.id));
  if (remove.length > 0) {
    await db.delete(auditScreenshot).where(inArray(auditScreenshot.id, remove.map((s) => s.id)));
    for (const s of remove) {
      if (s.imageUrl && !s.imageUrl.startsWith("data:")) await deleteObject(s.imageUrl);
    }
  }
  if (shots.urls.length > 0) {
    await db.insert(auditScreenshot).values(
      shots.urls.map((imageUrl) => ({ id: randomUUID(), auditId: input.id, imageUrl })),
    );
  }

  await logActivity("audit.updated", `#${p.values.ticketNumber}`);
  await notifyChange();
  revalidatePath(PAGE);
  revalidatePath(`/audits/${input.id}`);
  return { ok: true, id: input.id };
}

// Admins can remove an audit (cascade deletes its scores + screenshot rows; the
// stored screenshot objects are removed from the bucket here).
export async function deleteAudit(id: string): Promise<void> {
  await requireAdmin();
  if (!id) return;
  const a = (await db.select({ ticketNumber: audit.ticketNumber }).from(audit).where(eq(audit.id, id)).limit(1))[0];
  const shots = await db
    .select({ imageUrl: auditScreenshot.imageUrl })
    .from(auditScreenshot)
    .where(eq(auditScreenshot.auditId, id));
  await db.delete(audit).where(eq(audit.id, id));
  for (const s of shots) {
    if (s.imageUrl && !s.imageUrl.startsWith("data:")) await deleteObject(s.imageUrl);
  }
  await logActivity("audit.deleted", a ? `#${a.ticketNumber}` : "");
  await notifyChange();
  revalidatePath(PAGE);
}
