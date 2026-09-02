import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Pencil } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { audit, auditScore, auditScreenshot } from "@/db/app-schema";
import { formatDateTime } from "@/lib/datetime";
import { fileUrl } from "@/lib/storage";
import { AUDIT_CRITERIA } from "@/lib/audit-criteria";
import { initialsOf, plainName, tintFor } from "../../../member";
import DeleteAudit from "../../delete-audit";
import { badgeLabel, badgeTone, pct, splitSummary } from "../../audits-data";
import AuditScreenshots, { type Shot } from "./screenshots";

// /audits/[member]/[audit] - one filled-in scorecard, from the
// "ticket-audit-review" Figma frame (node 146:176). Reached by clicking a ticket
// on the member detail behind it.
//
// The frame pads the page 48/40/64 where every other v2 page uses 32. Kept at 32
// so the padding does not jump between the three audits screens; everything
// inside is the frame's.
//
// Edit Audit opens the pre-filled form; Delete Audit calls the live action
// behind a confirmation. Both are admin-only, as the actions are.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ticketDate is a date-only column, so it is split literally rather than parsed
// as an instant - lib/datetime would read it as UTC midnight and shift it back a
// day in Eastern time.
function fmtTicketDate(value: string | null): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}, ${y}` : value;
}

// A stored key needs the /api/files route; a legacy inline data URL is already
// renderable. fileUrl returns null when STORAGE_DIR is unset, which is the case
// in local development - those tiles are dropped rather than drawn broken.
async function displayUrl(imageUrl: string): Promise<string | null> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return fileUrl(imageUrl);
}

export default async function AuditReviewPage({
  params,
}: {
  params: Promise<{ member: string; audit: string }>;
}) {
  const { member: segment, audit: auditId } = await params;

  const row = (
    await db.select().from(audit).where(eq(audit.id, auditId)).limit(1)
  )[0];
  if (!row) notFound();

  // The audit has to belong to the member in the path, so a hand-edited URL
  // cannot show one member's audit under another's back link.
  const memberKey =
    row.memberId || `name:${plainName(row.memberName || "Member")}`;
  if (memberKey !== decodeURIComponent(segment)) notFound();

  const scores = await db
    .select()
    .from(auditScore)
    .where(eq(auditScore.auditId, auditId));
  const byKey = new Map(scores.map((s) => [s.criterionKey, s]));

  // Screenshots belong to the older audits only; newer ones carry the transcript
  // link instead, so the section is dropped when there are none.
  const shotRows = await db
    .select()
    .from(auditScreenshot)
    .where(eq(auditScreenshot.auditId, auditId))
    .orderBy(asc(auditScreenshot.createdAt));
  const shots = (
    await Promise.all(
      shotRows.map(async (s) => ({
        id: s.id,
        src: await displayUrl(s.imageUrl),
      })),
    )
  ).filter((s): s is Shot => Boolean(s.src));

  const name = plainName(row.memberName || "Member");
  const percent = pct(row.totalScore, row.possibleScore);
  const ticketDate = fmtTicketDate(row.ticketDate);
  const meta = [
    row.ticketType,
    ticketDate,
    row.reviewerName ? `reviewed by ${row.reviewerName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const feedback = splitSummary(row.summary);

  const card = "rounded-[12px] border border-[#243033]! bg-[#171e24]";

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <h1 className="truncate text-[28px] font-bold text-[#e2e8f0]">
            Ticket #{row.ticketNumber}
          </h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            QA audit · {formatDateTime(row.createdAt)}
          </p>
        </div>
        {/* The frame's label reads "← Back" next to an arrow icon, which would
            draw the arrow twice; the icon carries it. */}
        <Link
          href={`/audits/${encodeURIComponent(memberKey)}`}
          className="flex shrink-0 items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back
        </Link>
      </div>

      <div className="h-px w-full bg-[#243033]" />

      <div
        className={`flex items-center justify-between gap-[24px] p-[24px] ${card}`}
      >
        <div className="flex min-w-0 items-center gap-[16px]">
          <span
            style={{ backgroundColor: tintFor(name) }}
            className="flex size-[48px] shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-[#0e1217]"
          >
            {initialsOf(name)}
          </span>
          <div className="flex min-w-0 flex-col gap-[4px]">
            <p className="truncate text-[18px] font-bold text-[#e2e8f0]">
              {name}
            </p>
            <p className="truncate text-[13px] font-normal text-[#94a3b8]">
              {meta}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-[2px]">
          <div className="flex items-baseline gap-[6px]">
            <p className="text-[24px] font-bold text-[#e2e8f0]">
              {row.totalScore}/{row.possibleScore}
            </p>
            <p
              className={`text-[18px] font-bold ${
                percent >= 90
                  ? "text-[#10b981]"
                  : percent >= 70
                    ? "text-[#a3b18a]"
                    : "text-[#ef4444]"
              }`}
            >
              · {percent}%
            </p>
          </div>
          <p className="text-[12px] font-medium text-[#64748b]">
            Total review score
          </p>
        </div>
      </div>

      <div className={`flex flex-col px-[24px] py-[12px] ${card}`}>
        {AUDIT_CRITERIA.map((criterion, i) => {
          const score = byKey.get(criterion.key);
          const na = score?.na ?? false;
          const value = score?.score ?? 0;
          const note = score?.comment.trim() ?? "";
          return (
            <div
              key={criterion.key}
              className="flex flex-col gap-[10px] border-b border-[#243033]! py-[16px]"
            >
              <div className="flex items-center justify-between gap-[16px]">
                <p className="min-w-0 flex-1 text-[14px] font-medium text-[#e2e8f0]">
                  {i + 1}. {criterion.label}
                </p>
                <span
                  className={`shrink-0 rounded-[6px] px-[10px] py-[4px] text-[13px] font-semibold ${badgeTone(
                    na,
                    value,
                    criterion.maxPoints,
                  )}`}
                >
                  {badgeLabel(na, value, criterion.maxPoints)}
                </span>
              </div>

              {/* The reviewer's note on this criterion, when there is one. No
                  frame draws it - the icon matches the one the form puts on the
                  comment field it was typed into. */}
              {note ? (
                <div className="flex items-start gap-[8px]">
                  <MessageSquare
                    size={14}
                    strokeWidth={2}
                    className="mt-[2px] shrink-0 text-[#64748b]"
                  />
                  <p className="min-w-0 flex-1 text-[13px] leading-[1.5] font-normal whitespace-pre-line text-[#94a3b8]">
                    {note}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {shots.length ? (
        <div className={`flex flex-col gap-[16px] p-[24px] ${card}`}>
          <p className="text-[14px] font-bold text-[#8fb0a7] uppercase">
            Screenshots ({shots.length})
          </p>
          <AuditScreenshots shots={shots} />
        </div>
      ) : null}

      <div className={`flex flex-col gap-[16px] p-[24px] ${card}`}>
        <p className="text-[14px] font-bold text-[#8fb0a7] uppercase">
          Overall Feedback
        </p>
        {/* The stored summary carries its own paragraph breaks, and the frame
            keeps them. */}
        <p className="text-[14px] leading-[1.6] font-normal whitespace-pre-line text-[#e2e8f0]">
          {feedback.body}
        </p>
        {feedback.url ? (
          <div className="flex items-center gap-[8px] rounded-[6px] bg-[#0e1217] p-[12px] text-[12px]">
            <p className="shrink-0 font-semibold text-[#94a3b8]">Ticket URL:</p>
            <a
              href={feedback.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate font-normal text-[#8fb0a7] underline"
            >
              {feedback.url}
            </a>
          </div>
        ) : null}
      </div>

      <div className="flex items-start justify-center gap-[12px]">
        <Link
          href={`/audits/${encodeURIComponent(memberKey)}/${auditId}/edit`}
          className="flex items-center gap-[8px] rounded-[8px] bg-[#8fb0a7] px-[20px] py-[10px] text-[14px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8]"
        >
          <Pencil size={14} strokeWidth={2} />
          Edit Audit
        </Link>
        <DeleteAudit
          id={auditId}
          ticketNumber={row.ticketNumber}
          memberName={name}
          backHref={`/audits/${encodeURIComponent(memberKey)}`}
        />
      </div>
    </div>
  );
}
