import Link from "next/link";
import { asc, desc, eq, isNotNull } from "drizzle-orm";
import { ArrowLeft, History } from "lucide-react";
import { db } from "@/db";
import { review, reportPeriod, reviewSource } from "@/db/app-schema";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { fileUrl } from "@/lib/storage";
import PeriodReviews, { type ArchivedReview } from "./period-reviews";

// /reviews/history - the review archive, reached by History on /reviews.
//
// No frame draws it. The page borrows the shape of the report and payment
// archives already in v2 - a card per period, titled by its range - and fills
// each with the review tiles from the current-period list.
//
// A "Reset all" stamps the open reviews with the report period it closes, so a
// period here is a report_period reached through review.periodId.

async function displayUrl(imageUrl: string): Promise<string | null> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return fileUrl(imageUrl);
}

export default async function ReviewHistoryPage() {
  const sources = await db
    .select()
    .from(reviewSource)
    .orderBy(asc(reviewSource.sortOrder));
  const nameOf = (id: string) => sources.find((s) => s.id === id)?.name ?? id;

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

  type Period = {
    id: string;
    startedAt: Date | null;
    endedAt: Date;
    /** Every archived review, which is what the tallies count. */
    total: number;
    counts: Map<string, number>;
    /** Only those whose screenshot resolves, which is what the grid shows. */
    items: ArchivedReview[];
  };

  const periods = new Map<string, Period>();
  for (const row of rows) {
    if (!row.periodId || !row.endedAt) continue;
    let period = periods.get(row.periodId);
    if (!period) {
      period = {
        id: row.periodId,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        total: 0,
        counts: new Map(),
        items: [],
      };
      periods.set(row.periodId, period);
    }
    period.total += 1;
    period.counts.set(row.source, (period.counts.get(row.source) ?? 0) + 1);

    // The tallies come from every row, so they stay right even where the
    // screenshot cannot be resolved - fileUrl returns null with STORAGE_DIR
    // unset, as in local development.
    const src = await displayUrl(row.imageUrl);
    if (src) {
      period.items.push({
        id: row.id,
        src,
        sourceName: nameOf(row.source),
        note: row.note,
        addedByName: row.addedByName,
        when: formatDateTime(row.createdAt),
      });
    }
  }

  const ordered = [...periods.values()];
  const card = "rounded-[12px] border border-[#243033]! bg-[#171e24]";

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex min-w-0 flex-col gap-[6px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">
            Review history
          </h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Past periods, archived on each Reset all
          </p>
        </div>
        <Link
          href="/reviews"
          className="flex shrink-0 items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
        >
          <ArrowLeft size={14} strokeWidth={2} className="text-[#94a3b8]" />
          Back to reviews
        </Link>
      </div>

      {ordered.length === 0 ? (
        <div
          className={`flex flex-col items-center gap-[16px] p-[48px] ${card}`}
        >
          <span className="rounded-full bg-[#0e1217] p-[16px]">
            <History size={24} strokeWidth={2} className="text-[#64748b]" />
          </span>
          <p className="text-[13px] font-normal text-[#64748b]">
            No archived reviews yet. They move here when an admin runs Reset
            all.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-[24px]">
        {ordered.map((period) => {
          const from = period.startedAt
            ? formatDate(period.startedAt)
            : "start";
          const to = formatDate(period.endedAt);
          const tally = sources
            .map((s) => ({ name: s.name, n: period.counts.get(s.id) ?? 0 }))
            .filter((c) => c.n > 0)
            .map((c) => `${c.n} ${c.name}`);

          return (
            <div
              key={period.id}
              className={`flex flex-col gap-[20px] p-[24px] ${card}`}
            >
              <div className="flex flex-col gap-[6px]">
                <p className="text-[18px] font-bold text-[#e2e8f0]">
                  {from} – {to}
                </p>
                <p className="text-[13px] font-normal text-[#94a3b8]">
                  {[...tally, `${period.total} total`].join(" · ")}
                </p>
              </div>

              {period.items.length > 0 ? (
                <PeriodReviews items={period.items} />
              ) : (
                <p className="rounded-[8px] border border-[#243033]! bg-[#0e1217] p-[24px] text-center text-[13px] text-[#64748b]">
                  Screenshots for this period are not available here.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
