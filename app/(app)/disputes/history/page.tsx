import Link from "next/link";
import { ArrowLeft, History, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { signedGetUrl } from "@/lib/storage";
import { formatUSD } from "@/app/(app)/payments/constants";
import { getArchivedDisputes, DISPUTE_BONUS_RATE } from "@/lib/disputes";
import { BONUS_OUTCOME, OUTCOME_LABEL, OUTCOME_BADGE } from "../constants";
import DisputeShot from "../dispute-shot";

// A stored key needs a short-lived presigned URL; a legacy inline data URL is
// already renderable as-is.
async function displayUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return (await signedGetUrl(imageUrl)) ?? "";
}

// Archived disputes grouped by the report period they were closed into (a
// "Reset all" stamps the current disputes with the report_period it archives).
// Admin-only: unlike the live /disputes tool (Disputes role + admins), past
// periods of dispute details and amounts are kept to admins.
export default async function DisputeHistoryPage() {
  const session = await getSession();
  if (session?.user.role !== "admin") return <NoAccess />;

  const rows = await getArchivedDisputes();
  const items = await Promise.all(
    rows.map(async (r) => ({ ...r, src: await displayUrl(r.imageUrl) })),
  );

  type Period = {
    id: string;
    startedAt: Date | null;
    endedAt: Date;
    amount: number;
    items: typeof items;
  };
  const periods = new Map<string, Period>();
  for (const it of items) {
    if (!it.periodId || !it.endedAt) continue;
    let p = periods.get(it.periodId);
    if (!p) {
      p = { id: it.periodId, startedAt: it.startedAt, endedAt: it.endedAt, amount: 0, items: [] };
      periods.set(it.periodId, p);
    }
    // Recovered (and its bonus) counts won disputes only.
    p.amount += it.outcome === BONUS_OUTCOME ? it.amount ?? 0 : 0;
    p.items.push(it);
  }
  const ordered = [...periods.values()];

  const card = "border border-border bg-surface";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Dispute history</h1>
          <p className="text-xs text-muted">Past periods, archived on each Reset all</p>
        </div>
        <Link
          href="/disputes"
          className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Back to disputes
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-4xl flex-col gap-6">
          {ordered.length === 0 ? (
            <div className={`${card} flex flex-col items-center gap-2 px-5 py-16 text-center`}>
              <History size={22} strokeWidth={1.5} className="text-muted" />
              <p className="text-sm text-muted">
                No archived disputes yet. Disputes move here when an admin runs Reset all.
              </p>
            </div>
          ) : (
            ordered.map((p) => {
              const started = p.startedAt ? formatDate(p.startedAt) : "start";
              const ended = formatDate(p.endedAt);
              const bonus = Math.round(p.amount * DISPUTE_BONUS_RATE * 100) / 100;
              return (
                <section key={p.id} className={card}>
                  <div className="border-b border-border px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight">
                      {started} – {ended}
                    </h2>
                    <p className="text-xs text-muted">
                      {p.items.length} {p.items.length === 1 ? "dispute" : "disputes"} ·{" "}
                      {formatUSD(p.amount)} recovered · +{formatUSD(bonus)} bonus
                    </p>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                          <th className="h-11 px-4 text-left align-middle font-medium">Shot</th>
                          <th className="h-11 px-4 text-left align-middle font-medium">Dispute</th>
                          <th className="h-11 px-4 text-left align-middle font-medium">Category</th>
                          <th className="h-11 px-4 text-left align-middle font-medium">Outcome</th>
                          <th className="h-11 px-4 text-right align-middle font-medium">Amount</th>
                          <th className="h-11 px-4 text-right align-middle font-medium">Bonus</th>
                          <th className="h-11 px-4 text-left align-middle font-medium">Logged by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((d) => (
                          <tr key={d.id} className="border-b border-border last:border-0">
                            <td className="h-14 px-4 align-middle">
                              <DisputeShot src={d.src} />
                            </td>
                            <td className="h-14 px-4 align-middle">{d.dispute}</td>
                            <td className="h-14 px-4 align-middle">
                              <span className="border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
                                {d.category || "Uncategorized"}
                              </span>
                            </td>
                            <td className="h-14 px-4 align-middle">
                              <span
                                className={`border px-2 py-0.5 text-[11px] uppercase tracking-wide ${OUTCOME_BADGE[d.outcome] ?? "border-border text-muted"}`}
                              >
                                {OUTCOME_LABEL[d.outcome] ?? d.outcome}
                              </span>
                            </td>
                            <td className="h-14 px-4 text-right align-middle tabular-nums">
                              {formatUSD(d.amount)}
                            </td>
                            <td className="h-14 px-4 text-right align-middle tabular-nums text-muted">
                              {d.outcome === BONUS_OUTCOME
                                ? `+${formatUSD(Math.round(d.amount * DISPUTE_BONUS_RATE * 100) / 100)}`
                                : "-"}
                            </td>
                            <td className="h-14 px-4 align-middle text-muted">
                              <span className="text-foreground">{d.submittedByName || "Member"}</span>
                              <span className="block text-[11px]">{formatDateTime(d.createdAt)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}

function NoAccess() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Dispute history</h1>
          <p className="text-xs text-muted">Restricted</p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center border border-border bg-surface">
            <Lock size={26} strokeWidth={1.5} className="text-muted" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Restricted</h2>
            <p className="mt-1 text-sm text-muted">
              Dispute history is available to admins only. The live Disputes tool stays open to the
              Disputes role.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
