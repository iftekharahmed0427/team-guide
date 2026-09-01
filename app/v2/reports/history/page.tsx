import Link from "next/link";
import { asc, desc, inArray } from "drizzle-orm";
import { Award, ChevronLeft } from "lucide-react";
import { db } from "@/db";
import {
  reportPeriod,
  reportPeriodEntry,
  review,
  reviewSource,
} from "@/db/app-schema";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { initialsOf, plainName, tintFor } from "../../member";
import DeletePeriod from "./delete-period";

// /v2/reports/history - the archive from the "report-history-page" Figma frame
// (node 77:4): one card per period closed by a "Reset all", each with its reset
// stamp, review tally and the final ticket leaderboard.
//
// Reads the real report_period / report_period_entry snapshots, like the rest of
// v2 now does. The delete button opens the confirmation but does not delete;
// that action still belongs to the live /reports/history page.

// Gold, silver and bronze from the frame.
const MEDALS = ["#ffb03a", "#cbd5e1", "#cd7f32"];

export default async function V2ReportHistoryPage() {
  const periods = await db
    .select()
    .from(reportPeriod)
    .orderBy(desc(reportPeriod.endedAt));
  const ids = periods.map((p) => p.id);

  const entries = ids.length
    ? await db
        .select()
        .from(reportPeriodEntry)
        .where(inArray(reportPeriodEntry.periodId, ids))
        .orderBy(desc(reportPeriodEntry.count))
    : [];

  // Reviews are archived against the same period, and their source is either a
  // review_source id or a legacy literal like "trustpilot".
  const reviewRows = ids.length
    ? await db
        .select({ periodId: review.periodId, source: review.source })
        .from(review)
        .where(inArray(review.periodId, ids))
    : [];
  // A plain select rather than getReviewSources(), which seeds the table when it
  // is empty; nothing on the v2 canvas should write.
  const sources = await db
    .select({ id: reviewSource.id, name: reviewSource.name })
    .from(reviewSource)
    .orderBy(asc(reviewSource.sortOrder), asc(reviewSource.name));
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));

  // One member's Discord name is set in fancy Unicode; the frames all read it
  // as plain letters.
  const rowsFor = (periodId: string) =>
    entries
      .filter((e) => e.periodId === periodId)
      .map((e) => ({ ...e, name: plainName(e.name || "Member") }));

  function reviewsFor(periodId: string): string | null {
    const counts = new Map<string, number>();
    for (const r of reviewRows) {
      if (r.periodId !== periodId) continue;
      const label = sourceName.get(r.source) ?? r.source;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    if (counts.size === 0) return null;
    return `Reviews: ${[...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, n]) => `${n} ${label}`)
      .join(" · ")}`;
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">
            Report history
          </h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Archived periods from each Reset all
          </p>
        </div>
        <Link
          href="/v2/reports"
          className="flex shrink-0 items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[14px] py-[8px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
        >
          <ChevronLeft size={12} strokeWidth={2} className="text-[#8fb0a7]" />
          Back to reports
        </Link>
      </div>

      {periods.length === 0 ? (
        <p className="rounded-[12px] border border-[#243033]! bg-[#171e24] p-[40px] text-center text-[13px] text-[#64748b]">
          No archived periods yet. One is written each time an admin runs Reset
          all.
        </p>
      ) : null}

      <div className="flex flex-col gap-[24px]">
        {periods.map((period) => {
          // The first period ever has no start, which the frame labels "start".
          const span = `${period.startedAt ? formatDate(period.startedAt) : "start"} – ${formatDate(period.endedAt)}`;
          const rows = rowsFor(period.id);
          const reviews = reviewsFor(period.id);

          return (
            <div
              key={period.id}
              className="flex flex-col gap-[20px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]"
            >
              <div className="flex items-start justify-between gap-[16px]">
                <div className="flex min-w-0 flex-col gap-[6px]">
                  <p className="truncate text-[18px] font-bold text-[#e2e8f0]">
                    {span}
                  </p>
                  <div className="flex flex-col gap-[2px]">
                    <p className="text-[13px] leading-[18px] font-normal text-[#94a3b8]">
                      Reset: {formatDateTime(period.endedAt)} · Total tickets
                      done: {period.total}
                    </p>
                    {reviews ? (
                      <p className="text-[12px] font-medium text-[#8fb0a7]">
                        {reviews}
                      </p>
                    ) : null}
                  </div>
                </div>
                <DeletePeriod label={span} />
              </div>

              <div className="flex flex-col">
                <div className="flex items-start rounded-[6px] bg-[#0e1217] px-[16px] py-[8px] text-[11px] font-bold text-[#94a3b8] uppercase">
                  <p className="w-[80px] shrink-0">Rank</p>
                  <p className="min-w-0 flex-1">Member</p>
                  <p className="w-[100px] shrink-0 text-right">Tickets</p>
                </div>

                {rows.length === 0 ? (
                  <p className="px-[16px] py-[16px] text-[13px] font-normal text-[#64748b]">
                    No member rows were archived for this period.
                  </p>
                ) : null}

                {rows.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center border-b border-[#243033]! px-[16px] py-[10px]"
                  >
                    <div className="flex w-[80px] shrink-0 items-center">
                      {i < 3 ? (
                        <Award
                          size={16}
                          strokeWidth={2}
                          style={{ color: MEDALS[i] }}
                          aria-label={`Rank ${i + 1}`}
                        />
                      ) : (
                        <span className="text-[13px] font-semibold text-[#64748b]">
                          #{i + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-[12px]">
                      <span
                        style={{ backgroundColor: tintFor(entry.name) }}
                        className="flex size-[24px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0e1217]"
                      >
                        {initialsOf(entry.name)}
                      </span>
                      <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">
                        {entry.name}
                      </p>
                    </div>
                    <p className="w-[100px] shrink-0 text-right text-[14px] font-bold text-[#e2e8f0]">
                      {entry.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
