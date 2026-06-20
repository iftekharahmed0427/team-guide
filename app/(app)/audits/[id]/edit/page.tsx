import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { audit, auditScore, auditScreenshot } from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import { signedGetUrl } from "@/lib/storage";
import AuditForm, { type InitialAudit } from "../../audit-form";

async function displayUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return (await signedGetUrl(imageUrl)) ?? "";
}

// Admin-only: edit an existing audit (reuses the scorecard form, pre-filled).
export default async function EditAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/audits");

  const a = (await db.select().from(audit).where(eq(audit.id, id)).limit(1))[0];
  if (!a) notFound();

  const scores = await db.select().from(auditScore).where(eq(auditScore.auditId, id));
  const shotRows = await db
    .select()
    .from(auditScreenshot)
    .where(eq(auditScreenshot.auditId, id))
    .orderBy(asc(auditScreenshot.createdAt));
  const screenshots = await Promise.all(
    shotRows.map(async (s) => ({ id: s.id, src: await displayUrl(s.imageUrl) })),
  );

  const members = (
    await db.select({ id: user.id, name: user.name, email: user.email }).from(user).orderBy(asc(user.name))
  ).map((m) => ({ id: m.id, name: m.name || m.email || "Member" }));

  const initial: InitialAudit = {
    id: a.id,
    memberId: a.memberId ?? "",
    ticketNumber: a.ticketNumber,
    ticketType: a.ticketType,
    ticketDate: a.ticketDate ?? "",
    summary: a.summary,
    scores: scores.map((s) => ({ key: s.criterionKey, na: s.na, score: s.score, comment: s.comment })),
    screenshots,
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Edit audit</h1>
          <p className="text-xs text-muted">Ticket #{a.ticketNumber}</p>
        </div>
        <Link
          href={`/audits/${id}`}
          className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Back
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto w-full max-w-3xl">
          <AuditForm members={members} initial={initial} />
        </div>
      </main>
    </>
  );
}
