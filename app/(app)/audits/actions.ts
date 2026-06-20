"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { audit, auditScore } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { AUDIT_CRITERIA, computeTotals } from "./criteria";

const PAGE = "/audits";

type Result = { ok: true; id: string } | { error: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Not authorized");
  return session;
}

export type ScoreInput = { key: string; na: boolean; score: number; comment: string };

// Admin creates a QA audit for a member's ticket. The per-criterion scores are
// re-normalized against the rubric here (the client total is never trusted), and
// the audit + one audit_score row per criterion are written together.
export async function createAudit(input: {
  memberId: string;
  memberName: string;
  ticketNumber: string;
  ticketType: string;
  ticketDate: string | null;
  summary: string;
  scores: ScoreInput[];
}): Promise<Result> {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return { error: "Only admins can create audits." };
  }

  const memberId = input.memberId?.trim();
  if (!memberId) return { error: "Choose the team member being reviewed." };
  const ticketNumber = input.ticketNumber.trim().slice(0, 100);
  if (!ticketNumber) return { error: "Ticket # is required." };
  const ticketDate = input.ticketDate?.trim() || null;
  if (ticketDate && Number.isNaN(Date.parse(ticketDate))) {
    return { error: "Enter a valid ticket date." };
  }

  // Clamp every criterion to its rubric (N/A only where allowed, score 0..max).
  const rows = AUDIT_CRITERIA.map((c) => {
    const given = input.scores.find((s) => s.key === c.key);
    const na = c.allowNa && !!given?.na;
    const score = na ? 0 : Math.max(0, Math.min(c.maxPoints, Math.round(Number(given?.score) || 0)));
    return { key: c.key, na, score, comment: (given?.comment ?? "").trim().slice(0, 1000) };
  });
  const { total, possible } = computeTotals(rows);

  const id = randomUUID();
  await db.insert(audit).values({
    id,
    ticketNumber,
    ticketType: input.ticketType.trim().slice(0, 100),
    ticketDate,
    memberId,
    memberName: input.memberName.trim().slice(0, 120) || "Member",
    reviewerId: session.user.id,
    reviewerName: session.user.name || session.user.email || "Admin",
    totalScore: total,
    possibleScore: possible,
    summary: input.summary.trim().slice(0, 2000),
  });
  await db.insert(auditScore).values(
    rows.map((r) => ({
      id: randomUUID(),
      auditId: id,
      criterionKey: r.key,
      na: r.na,
      score: r.score,
      comment: r.comment,
    })),
  );

  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true, id };
}

// Admins can remove an audit (cascade deletes its scores).
export async function deleteAudit(id: string): Promise<void> {
  await requireAdmin();
  if (!id) return;
  await db.delete(audit).where(eq(audit.id, id));
  await notifyChange();
  revalidatePath(PAGE);
}
