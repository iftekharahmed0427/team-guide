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
import AuditDirectory, { type AuditItem, type MemberData } from "./audit-directory";

function pctColor(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-amber-400";
  return "text-red-400";
}

// QA audits of support tickets. Admins get a directory of member cards (drill in
// to a member's audits, like Commissions); members see only the audits of their
// own tickets, read-only. Live via the app_event SSE bus.
export default async function AuditsPage() {
  const session = await getSession();
  const currentUserId = session?.user.id ?? "";
  const isAdmin = session?.user.role === "admin";

  const rows = await db
    .select({
      id: audit.id,
      ticketNumber: audit.ticketNumber,
      ticketType: audit.ticketType,
      memberId: audit.memberId,
      memberName: audit.memberName,
      memberImage: user.image,
      totalScore: audit.totalScore,
      possibleScore: audit.possibleScore,
      createdAt: audit.createdAt,
    })
    .from(audit)
    .leftJoin(user, eq(audit.memberId, user.id))
    .where(isAdmin ? undefined : eq(audit.memberId, currentUserId))
    .orderBy(desc(audit.createdAt));

  const header = (
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
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-2 border border-border bg-surface px-5 py-16 text-center">
      <ClipboardCheck size={22} strokeWidth={1.5} className="text-muted" />
      <p className="text-sm text-muted">
        {isAdmin ? "No audits yet. Create one with New audit." : "No audits of your tickets yet."}
      </p>
    </div>
  );

  // ── Admin: group audits by member into cards ────────────────────────────────
  if (isAdmin) {
    const acc = new Map<
      string,
      { id: string; name: string; image: string | null; audits: AuditItem[]; sumTotal: number; sumPossible: number }
    >();
    for (const a of rows) {
      const key = a.memberId || `name:${a.memberName}`;
      let m = acc.get(key);
      if (!m) {
        m = { id: a.memberId || "", name: a.memberName || "Member", image: a.memberImage ?? null, audits: [], sumTotal: 0, sumPossible: 0 };
        acc.set(key, m);
      }
      m.sumTotal += a.totalScore;
      m.sumPossible += a.possibleScore;
      m.audits.push({
        id: a.id,
        ticketNumber: a.ticketNumber,
        ticketType: a.ticketType,
        totalScore: a.totalScore,
        possibleScore: a.possibleScore,
        createdAtLabel: formatDateTime(a.createdAt),
      });
    }
    const members: MemberData[] = [...acc.values()]
      .map((m) => ({
        id: m.id,
        name: m.name,
        image: m.image,
        count: m.audits.length,
        avgPct: percentage(m.sumTotal, m.sumPossible),
        audits: m.audits,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return (
      <>
        {header}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="fx-rise mx-auto w-full max-w-3xl">
            {members.length === 0 ? emptyState : <AuditDirectory members={members} />}
          </div>
        </main>
      </>
    );
  }

  // ── Member: their own audits, read-only ─────────────────────────────────────
  return (
    <>
      {header}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-3">
          {rows.length === 0
            ? emptyState
            : rows.map((a) => {
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
                          <p className="truncate text-sm font-medium">Ticket #{a.ticketNumber}</p>
                          {a.ticketType ? (
                            <p className="truncate text-xs text-muted">{a.ticketType}</p>
                          ) : null}
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
              })}
        </div>
      </main>
    </>
  );
}
