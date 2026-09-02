import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { audit, auditScore, auditScreenshot } from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import { plainName } from "../../../../member";
import { splitSummary } from "../../../audits-data";
import V2AuditForm, {
  type InitialAudit,
  type Member,
} from "../../../audit-form";

// /v2/audits/[member]/[audit]/edit - the scorecard form again, pre-filled.
// Opened by Edit Audit on the review.
//
// There is no Figma frame for editing and none is needed: the form is the
// "new-audit-form" frame with a different title, back target and save label,
// which is how the live app does it too.

export default async function V2EditAuditPage({
  params,
}: {
  params: Promise<{ member: string; audit: string }>;
}) {
  const { member: segment, audit: auditId } = await params;

  const row = (
    await db.select().from(audit).where(eq(audit.id, auditId)).limit(1)
  )[0];
  if (!row) notFound();

  // Same guard as the review behind it: the audit has to belong to the member in
  // the path, so a hand-edited URL cannot open one member's audit under another.
  const memberKey =
    row.memberId || `name:${plainName(row.memberName || "Member")}`;
  if (memberKey !== decodeURIComponent(segment)) notFound();

  const scores = await db
    .select()
    .from(auditScore)
    .where(eq(auditScore.auditId, auditId));

  const members: Member[] = (
    await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .orderBy(asc(user.name))
  ).map((m) => ({ id: m.id, name: plainName(m.name || m.email || "Member") }));

  // The transcript link lives on the end of the summary rather than in a column,
  // so it goes back into its own field the way the review page reads it.
  const feedback = splitSummary(row.summary);

  // The audit keeps whatever screenshots it already has: new audits carry a
  // ticket link instead, so the form never adds more, and updateAudit deletes
  // any id it is not told to keep.
  const screenshotIds = (
    await db
      .select({ id: auditScreenshot.id })
      .from(auditScreenshot)
      .where(eq(auditScreenshot.auditId, auditId))
  ).map((r) => r.id);

  const initial: InitialAudit = {
    id: row.id,
    screenshotIds,
    memberId: row.memberId ?? "",
    ticketNumber: row.ticketNumber,
    ticketType: row.ticketType,
    ticketDate: row.ticketDate ?? "",
    ticketLink: feedback.url ?? "",
    summary: feedback.body,
    scores: scores.map((s) => ({
      key: s.criterionKey,
      na: s.na,
      score: s.score,
      comment: s.comment,
    })),
  };

  return (
    <V2AuditForm
      members={members}
      initial={initial}
      backHref={`/v2/audits/${encodeURIComponent(memberKey)}/${auditId}`}
    />
  );
}
