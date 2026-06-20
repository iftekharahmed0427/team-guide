import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ClipboardCheck, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { audit } from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import { formatDateTime } from "@/lib/datetime";
import Avatar from "@/app/components/avatar";
import { percentage } from "./criteria";

function pctColor(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-amber-400";
  return "text-red-400";
}

// QA audits of support tickets. Admins see and create all; members see only the
// audits of their own tickets, read-only. Live via the app_event SSE bus.
export default async function AuditsPage() {
  const session = await getSession();
  const currentUserId = session?.user.id ?? "";
  const isAdmin = session?.user.role === "admin";

  const rows = await db
    .select({
      id: audit.id,
      ticketNumber: audit.ticketNumber,
      ticketType: audit.ticketType,
      memberName: audit.memberName,
      memberImage: user.image,
      reviewerName: audit.reviewerName,
      totalScore: audit.totalScore,
      possibleScore: audit.possibleScore,
      createdAt: audit.createdAt,
    })
    .from(audit)
    .leftJoin(user, eq(audit.memberId, user.id))
    .where(isAdmin ? undefined : eq(audit.memberId, currentUserId))
    .orderBy(desc(audit.createdAt));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Audits</h1>
          <p className="text-xs text-muted">
            {isAdmin ? "Support ticket QA reviews" : "QA reviews of your tickets"}
            {rows.length ? ` · ${rows.length}` : ""}
          </p>
        </div>
        {isAdmin ? (
          <Link
            href="/audits/new"
            className="btn-wipe btn-wipe-dark inline-flex h-9 items-center gap-2 border border-border bg-foreground px-3 text-sm font-medium text-background"
          >
            <Plus size={15} strokeWidth={2} />
            New audit
          </Link>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-3">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 border border-border bg-surface px-5 py-16 text-center">
              <ClipboardCheck size={22} strokeWidth={1.5} className="text-muted" />
              <p className="text-sm text-muted">
                {isAdmin ? "No audits yet. Create one with New audit." : "No audits of your tickets yet."}
              </p>
            </div>
          ) : (
            rows.map((a) => {
              const pct = percentage(a.totalScore, a.possibleScore);
              return (
                <Link
                  key={a.id}
                  href={`/audits/${a.id}`}
                  className="block border border-border bg-surface p-4 transition-colors hover:border-muted"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={a.memberName} image={a.memberImage} size={32} />
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-medium">{a.memberName || "Member"}</p>
                        <p className="truncate text-xs text-muted">
                          Ticket #{a.ticketNumber}
                          {a.ticketType ? ` · ${a.ticketType}` : ""}
                          {isAdmin ? ` · by ${a.reviewerName}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right leading-tight">
                      <p className="text-sm font-semibold tabular-nums">
                        {a.totalScore}/{a.possibleScore} <span className={pctColor(pct)}>· {pct}%</span>
                      </p>
                      <p className="text-[11px] text-muted">{formatDateTime(a.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
