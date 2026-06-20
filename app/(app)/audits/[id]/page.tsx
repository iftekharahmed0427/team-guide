import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Pencil } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { audit, auditScore, auditScreenshot } from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import { formatDateTime } from "@/lib/datetime";
import { signedGetUrl } from "@/lib/storage";
import Avatar from "@/app/components/avatar";
import DeleteAuditButton from "../delete-audit-button";
import AuditScreenshots from "../audit-screenshots";
import { AUDIT_CRITERIA, percentage } from "../criteria";

// A stored key needs a short-lived presigned URL; a legacy inline data URL is
// already renderable as-is.
async function displayUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return (await signedGetUrl(imageUrl)) ?? "";
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// A ticket date is a plain calendar date; format it literally (no tz shift).
function formatTicketDate(d: string | null): string | null {
  if (!d) return null;
  const x = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(x.getTime())) return d;
  return `${SHORT_MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
}

function pctColor(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-amber-400";
  return "text-red-400";
}

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const a = (
    await db
      .select({
        id: audit.id,
        ticketNumber: audit.ticketNumber,
        ticketType: audit.ticketType,
        ticketDate: audit.ticketDate,
        memberId: audit.memberId,
        memberName: audit.memberName,
        memberImage: user.image,
        reviewerName: audit.reviewerName,
        totalScore: audit.totalScore,
        possibleScore: audit.possibleScore,
        summary: audit.summary,
        createdAt: audit.createdAt,
      })
      .from(audit)
      .leftJoin(user, eq(audit.memberId, user.id))
      .where(eq(audit.id, id))
      .limit(1)
  )[0];

  if (!a) notFound();
  // Members can only open their own audits.
  if (!isAdmin && a.memberId !== session?.user.id) redirect("/audits");

  const scores = await db.select().from(auditScore).where(eq(auditScore.auditId, id));
  const byKey = new Map(scores.map((s) => [s.criterionKey, s]));
  const shotRows = await db
    .select()
    .from(auditScreenshot)
    .where(eq(auditScreenshot.auditId, id))
    .orderBy(asc(auditScreenshot.createdAt));
  const shots = await Promise.all(
    shotRows.map(async (s) => ({ id: s.id, src: await displayUrl(s.imageUrl) })),
  );
  const pct = percentage(a.totalScore, a.possibleScore);
  const ticketDate = formatTicketDate(a.ticketDate);

  const card = "border border-border bg-surface";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Ticket #{a.ticketNumber}</h1>
          <p className="text-xs text-muted">QA audit · {formatDateTime(a.createdAt)}</p>
        </div>
        <Link
          href="/audits"
          className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Back
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-5">
          {/* Summary */}
          <section className={`${card} flex flex-wrap items-center justify-between gap-4 p-5`}>
            <div className="flex items-center gap-3">
              <Avatar name={a.memberName} image={a.memberImage} size={40} />
              <div className="leading-tight">
                <p className="text-sm font-semibold">{a.memberName || "Member"}</p>
                <p className="text-xs text-muted">
                  {a.ticketType ? `${a.ticketType} · ` : ""}
                  {ticketDate ? `${ticketDate} · ` : ""}
                  reviewed by {a.reviewerName}
                </p>
              </div>
            </div>
            <div className="text-right leading-tight">
              <p className="text-2xl font-semibold tabular-nums">
                {a.totalScore}/{a.possibleScore} <span className={pctColor(pct)}>· {pct}%</span>
              </p>
              <p className="text-[11px] text-muted">Total review score</p>
            </div>
          </section>

          {/* Criteria */}
          <section className={card}>
            {AUDIT_CRITERIA.map((c, i) => {
              const s = byKey.get(c.key);
              const na = s?.na ?? false;
              const score = s?.score ?? 0;
              return (
                <div key={c.key} className="border-b border-border p-4 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <p className="min-w-0 text-sm">
                      <span className="text-muted">{i + 1}.</span> {c.label}
                    </p>
                    <span
                      className={`shrink-0 border px-2 py-0.5 text-xs font-medium tabular-nums ${
                        na ? "border-border text-muted" : "border-border text-foreground"
                      }`}
                    >
                      {na ? "N/A" : c.maxPoints === 1 ? (score === 1 ? "Yes" : "No") : `${score}/${c.maxPoints}`}
                    </span>
                  </div>
                  {s?.comment ? (
                    <p className="mt-1 text-xs leading-5 text-muted">
                      <span className="text-foreground">Note:</span> {s.comment}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </section>

          {shots.length > 0 ? (
            <section className={`${card} p-5`}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                Screenshots ({shots.length})
              </p>
              <AuditScreenshots images={shots} />
            </section>
          ) : null}

          {a.summary ? (
            <section className={`${card} p-5`}>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">Overall feedback</p>
              <p className="text-sm leading-6 text-foreground">{a.summary}</p>
            </section>
          ) : null}

          {isAdmin ? (
            <div className="flex justify-end gap-2">
              <Link
                href={`/audits/${a.id}/edit`}
                className="btn-wipe inline-flex h-8 items-center gap-2 border border-border px-3 text-xs text-muted transition-colors hover:text-foreground"
              >
                <Pencil size={13} strokeWidth={1.75} />
                Edit
              </Link>
              <DeleteAuditButton id={a.id} />
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
