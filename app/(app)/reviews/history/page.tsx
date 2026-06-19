import Link from "next/link";
import { desc, eq, isNotNull } from "drizzle-orm";
import { ArrowLeft, History } from "lucide-react";
import { db } from "@/db";
import { review, reportPeriod } from "@/db/app-schema";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { signedGetUrl } from "@/lib/storage";
import ReviewLightbox from "../review-lightbox";

const SOURCE_LABEL: Record<string, string> = { trustpilot: "Trustpilot", google: "Google" };
const SOURCE_BADGE: Record<string, string> = {
  trustpilot: "border-emerald-500/40 text-emerald-400",
  google: "border-sky-500/40 text-sky-400",
};

async function displayUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return (await signedGetUrl(imageUrl)) ?? "";
}

// Archived reviews grouped by the period they were closed into (a "Reset all"
// stamps the current reviews with the report_period it archives). Visible to all
// members, like the live reviews page.
export default async function ReviewHistoryPage() {
  const rows = await db
    .select({
      id: review.id,
      source: review.source,
      imageUrl: review.imageUrl,
      note: review.note,
      addedByName: review.addedByName,
      createdAt: review.createdAt,
      periodId: review.periodId,
      startedAt: reportPeriod.startedAt,
      endedAt: reportPeriod.endedAt,
    })
    .from(review)
    .innerJoin(reportPeriod, eq(review.periodId, reportPeriod.id))
    .where(isNotNull(review.periodId))
    .orderBy(desc(reportPeriod.endedAt), desc(review.createdAt));

  const items = await Promise.all(rows.map(async (r) => ({ ...r, src: await displayUrl(r.imageUrl) })));

  type Period = {
    id: string;
    startedAt: Date | null;
    endedAt: Date;
    trustpilot: number;
    google: number;
    items: typeof items;
  };
  const periods = new Map<string, Period>();
  for (const it of items) {
    if (!it.periodId || !it.endedAt) continue;
    let p = periods.get(it.periodId);
    if (!p) {
      p = { id: it.periodId, startedAt: it.startedAt, endedAt: it.endedAt, trustpilot: 0, google: 0, items: [] };
      periods.set(it.periodId, p);
    }
    if (it.source === "trustpilot") p.trustpilot++;
    else if (it.source === "google") p.google++;
    p.items.push(it);
  }
  const ordered = [...periods.values()];

  const card = "border border-border bg-surface";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Review history</h1>
          <p className="text-xs text-muted">Past periods, archived on each Reset all</p>
        </div>
        <Link
          href="/reviews"
          className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Back to reviews
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-6">
          {ordered.length === 0 ? (
            <div className={`${card} flex flex-col items-center gap-2 px-5 py-16 text-center`}>
              <History size={22} strokeWidth={1.5} className="text-muted" />
              <p className="text-sm text-muted">
                No archived reviews yet. Reviews move here when an admin runs Reset all.
              </p>
            </div>
          ) : (
            ordered.map((p) => {
              const started = p.startedAt ? formatDate(p.startedAt) : "start";
              const ended = formatDate(p.endedAt);
              return (
                <section key={p.id} className={card}>
                  <div className="border-b border-border px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight">
                      {started} – {ended}
                    </h2>
                    <p className="text-xs text-muted">
                      {p.trustpilot} Trustpilot · {p.google} Google · {p.items.length} total
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                    {p.items.map((r) => (
                      <div key={r.id} className="flex flex-col border border-border bg-surface-2">
                        <ReviewLightbox
                          src={r.src}
                          alt={`${SOURCE_LABEL[r.source] ?? "Review"} screenshot`}
                        />
                        <div className="flex flex-1 flex-col gap-2 p-3">
                          <span
                            className={`w-fit border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${SOURCE_BADGE[r.source] ?? "border-border text-muted"}`}
                          >
                            {SOURCE_LABEL[r.source] ?? r.source}
                          </span>
                          {r.note ? <p className="text-sm text-foreground">{r.note}</p> : null}
                          <p className="mt-auto text-xs text-muted">
                            {r.addedByName || "Admin"} · {formatDateTime(r.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
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
