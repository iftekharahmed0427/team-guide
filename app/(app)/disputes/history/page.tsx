import Link from "next/link";
import { desc, eq, isNotNull } from "drizzle-orm";
import { ArrowLeft, History } from "lucide-react";
import { db } from "@/db";
import { dispute, reportPeriod } from "@/db/app-schema";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { fileUrl } from "@/lib/storage";
import { plainName } from "../../member";
import DisputeList from "../dispute-list";
import {
  BONUS_OUTCOME,
  BONUS_RATE,
  money,
  type Dispute,
} from "../disputes-shape";

// /disputes/history - the dispute archive, reached by History on /disputes.
//
// The same period-card shape as the review archive next door: a card per period
// titled by its range, with what it recovered, filled with that period's tiles.
//
// A "Reset all" stamps the open disputes with the report period it closes, so a
// period here is a report_period reached through dispute.periodId.

async function displayUrl(imageUrl: string): Promise<string | null> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return fileUrl(imageUrl);
}

export default async function DisputeHistoryPage() {
  const rows = await db
    .select({
      id: dispute.id,
      dispute: dispute.dispute,
      category: dispute.category,
      outcome: dispute.outcome,
      amount: dispute.amount,
      imageUrl: dispute.imageUrl,
      submittedById: dispute.submittedById,
      submittedByName: dispute.submittedByName,
      createdAt: dispute.createdAt,
      periodId: dispute.periodId,
      startedAt: reportPeriod.startedAt,
      endedAt: reportPeriod.endedAt,
    })
    .from(dispute)
    .innerJoin(reportPeriod, eq(dispute.periodId, reportPeriod.id))
    .where(isNotNull(dispute.periodId))
    .orderBy(desc(reportPeriod.endedAt), desc(dispute.createdAt));

  type Period = {
    id: string;
    startedAt: Date | null;
    endedAt: Date;
    recovered: number;
    items: Dispute[];
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
        recovered: 0,
        items: [],
      };
      periods.set(row.periodId, period);
    }
    if (row.outcome === BONUS_OUTCOME) period.recovered += row.amount;
    period.items.push({
      id: row.id,
      dispute: row.dispute,
      category: row.category,
      outcome: row.outcome,
      amount: row.amount,
      src: await displayUrl(row.imageUrl),
      submittedById: row.submittedById,
      submittedByName: plainName(row.submittedByName || "Member"),
      when: formatDateTime(row.createdAt),
    });
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
            Dispute history
          </h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Past periods, archived on each Reset all
          </p>
        </div>
        <Link
          href="/disputes"
          className="flex shrink-0 items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
        >
          <ArrowLeft size={14} strokeWidth={2} className="text-[#94a3b8]" />
          Back to disputes
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
            No archived disputes yet. They move here when an admin runs Reset
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
          const bonus = Math.round(period.recovered * BONUS_RATE * 100) / 100;

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
                  {period.items.length} dispute
                  {period.items.length === 1 ? "" : "s"} ·{" "}
                  {money(period.recovered)} recovered · {money(bonus)} bonus
                  pool
                </p>
              </div>

              <DisputeList items={period.items} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
