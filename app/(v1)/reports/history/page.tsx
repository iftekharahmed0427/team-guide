import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { ArrowLeft, History, RotateCcw } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { reportPeriod, reportPeriodEntry, resetLog, review } from "@/db/app-schema";
import { formatDate as fmtDate, formatDateTime as fmtDateTime } from "@/lib/datetime";
import { getReviewSources } from "@/lib/reviews";
import DeletePeriodButton from "./delete-period-button";

const MEDALS = ["🥇", "🥈", "🥉"];

// Admin-only archive of past reporting periods. Each period is a snapshot taken
// when an admin ran "Reset all"; rows can be deleted individually.
export default async function ReportHistoryPage() {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/");

  const periods = await db.select().from(reportPeriod).orderBy(desc(reportPeriod.endedAt));
  const ids = periods.map((p) => p.id);
  const allEntries = ids.length
    ? await db
        .select()
        .from(reportPeriodEntry)
        .where(inArray(reportPeriodEntry.periodId, ids))
        .orderBy(desc(reportPeriodEntry.count))
    : [];

  const entriesByPeriod = new Map<string, typeof allEntries>();
  for (const e of allEntries) {
    const list = entriesByPeriod.get(e.periodId) ?? [];
    list.push(e);
    entriesByPeriod.set(e.periodId, list);
  }

  // Review counts per source for each archived period (reviews share the period).
  const reviewRows = ids.length
    ? await db
        .select({ periodId: review.periodId, source: review.source })
        .from(review)
        .where(inArray(review.periodId, ids))
    : [];
  const sources = await getReviewSources();
  const reviewsByPeriod = new Map<string, Map<string, number>>();
  for (const r of reviewRows) {
    if (!r.periodId) continue;
    const c = reviewsByPeriod.get(r.periodId) ?? new Map<string, number>();
    c.set(r.source, (c.get(r.source) ?? 0) + 1);
    reviewsByPeriod.set(r.periodId, c);
  }

  // Audit trail of who reset counts and when (Reset all + per-channel resets).
  const resets = await db
    .select()
    .from(resetLog)
    .orderBy(desc(resetLog.createdAt))
    .limit(50);

  const card = "border border-border bg-surface";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Report history</h1>
          <p className="text-xs text-muted">Archived periods from each Reset all</p>
        </div>
        <Link
          href="/reports"
          className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Back to reports
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-6">
          {/* Reset log: who reset counts and when */}
          <section className={card}>
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <RotateCcw size={15} strokeWidth={1.75} className="text-muted" />
              <h2 className="text-sm font-semibold tracking-tight">Reset log</h2>
            </div>
            {resets.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">
                No resets recorded yet.
              </div>
            ) : (
              <ul>
                {resets.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 text-sm last:border-0"
                  >
                    <span>
                      <span className="font-medium">{r.actorName || "Admin"}</span>
                      <span className="text-muted"> reset </span>
                      <span className="font-medium">
                        {r.scope === "all" ? "all channels" : r.channelName || "a channel"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      {fmtDateTime(r.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {periods.length === 0 ? (
            <div className={`${card} flex flex-col items-center gap-2 px-5 py-16 text-center`}>
              <History size={22} strokeWidth={1.5} className="text-muted" />
              <p className="text-sm text-muted">
                No archived periods yet. A period is saved here each time an admin runs
                Reset all on the Discord bot settings.
              </p>
            </div>
          ) : (
            periods.map((p) => {
              const rows = entriesByPeriod.get(p.id) ?? [];
              const rev = reviewsByPeriod.get(p.id);
              const started = p.startedAt ? fmtDate(p.startedAt) : "start";
              const ended = fmtDate(p.endedAt);
              return (
                <section key={p.id} className={card}>
                  <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                    <div className="leading-tight">
                      <h2 className="text-sm font-semibold tracking-tight">
                        {started} – {ended}
                      </h2>
                      <p className="text-xs text-muted">
                        Reset {fmtDateTime(p.endedAt)} · Total tickets done: {p.total}
                      </p>
                      {rev && rev.size > 0 ? (
                        <p className="text-xs text-muted">
                          Reviews:{" "}
                          {sources
                            .filter((s) => (rev.get(s.id) ?? 0) > 0)
                            .map((s) => `${rev.get(s.id)} ${s.name}`)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <DeletePeriodButton id={p.id} />
                  </div>

                  {rows.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted">
                      No tickets were recorded this period.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                          <th className="w-16 py-2 pl-5 pr-3 text-left font-medium">Rank</th>
                          <th className="py-2 px-3 text-left font-medium">Member</th>
                          <th className="w-24 py-2 pr-5 pl-3 text-right font-medium">Tickets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((e, i) => (
                          <tr key={e.id} className="border-b border-border last:border-0">
                            <td className="py-2.5 pl-5 pr-3 text-left">
                              {i < MEDALS.length ? (
                                <span className="text-base">{MEDALS[i]}</span>
                              ) : (
                                <span className="text-muted">#{i + 1}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-medium">{e.name || "Member"}</td>
                            <td className="py-2.5 pr-5 pl-3 text-right tabular-nums">{e.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
