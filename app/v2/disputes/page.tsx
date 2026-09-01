import Link from "next/link";
import { asc, desc, isNull } from "drizzle-orm";
import { Clock, Gavel } from "lucide-react";
import { db } from "@/db";
import { dispute, disputeCategory, reportPeriod } from "@/db/app-schema";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { fileUrl } from "@/lib/storage";
import { plainName } from "../member";
import LogDispute from "./log-dispute";
import DisputeList from "./dispute-list";
import {
  BONUS_OUTCOME,
  BONUS_RATE,
  money,
  type Dispute,
} from "./disputes-shape";

// /v2/disputes - the payment dispute log. No Figma frame draws it, so it is
// composed from the v2 design system: the reviews page almost exactly, since it
// is the same shape of tool - a period counter, stat cards, a log form with a
// screenshot, and this period's evidence.
//
// Reads the real dispute table. The current period is everything not yet
// archived (periodId null), the rule the live page uses; the subtitle dates it
// from the last "Reset all". Access is role-gated on the live page, not here -
// v2 pages do not gate, the shell does.

async function displayUrl(imageUrl: string): Promise<string | null> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return fileUrl(imageUrl);
}

export default async function V2DisputesPage() {
  const categories = await db
    .select({ name: disputeCategory.name })
    .from(disputeCategory)
    .orderBy(asc(disputeCategory.sortOrder));

  const rows = await db
    .select()
    .from(dispute)
    .where(isNull(dispute.periodId))
    .orderBy(desc(dispute.createdAt));

  const lastArchive = (
    await db
      .select({ endedAt: reportPeriod.endedAt })
      .from(reportPeriod)
      .orderBy(desc(reportPeriod.endedAt))
      .limit(1)
  )[0];
  const periodLabel = lastArchive?.endedAt
    ? `Current period: since ${formatDate(lastArchive.endedAt)}`
    : "Current period: ongoing (no reset yet)";

  const items: Dispute[] = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      dispute: r.dispute,
      category: r.category,
      outcome: r.outcome,
      amount: r.amount,
      src: await displayUrl(r.imageUrl),
      submittedByName: plainName(r.submittedByName || "Member"),
      when: formatDateTime(r.createdAt),
    })),
  );

  // Only won disputes feed the recovered total, and the bonus is 5% of that,
  // rounded to the cent the way lib/disputes does it.
  const recovered = rows.reduce(
    (sum, r) => sum + (r.outcome === BONUS_OUTCOME ? r.amount : 0),
    0,
  );
  const bonusPool = Math.round(recovered * BONUS_RATE * 100) / 100;

  const card = "rounded-[12px] border border-[#243033]! bg-[#171e24]";

  const stats = [
    {
      key: "count",
      value: String(rows.length),
      label: "Disputes",
      sub: "logged this period",
    },
    {
      key: "recovered",
      value: money(recovered),
      label: "Recovered",
      sub: "from won disputes",
    },
    {
      key: "bonus",
      value: money(bonusPool),
      label: "Bonus pool",
      sub: "5% of won, across submitters",
      accent: true,
    },
  ];

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex min-w-0 flex-col gap-[6px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Disputes</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            {periodLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-[16px]">
          <Link
            href="/v2/disputes/history"
            className="flex items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
          >
            <Clock size={14} strokeWidth={2} className="text-[#94a3b8]" />
            History
          </Link>
          <p className="rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#8fb0a7]">
            This period: {rows.length}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-[12px]">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className={`flex min-w-0 flex-1 flex-col gap-[12px] overflow-hidden rounded-[12px] border p-[20px] shadow-[0px_10px_24px_-10px_rgba(0,0,0,0.2)] ${
              stat.accent
                ? "border-[#8fb0a7]! bg-[#0e1217]"
                : "border-[#243033]! bg-[#171e24]"
            }`}
          >
            <p className="truncate text-[40px] font-bold text-[#e2e8f0]">
              {stat.value}
            </p>
            <div className="flex flex-col gap-[2px]">
              <p className="text-[13px] font-bold text-[#94a3b8] uppercase">
                {stat.label}
              </p>
              <p className="truncate text-[12px] font-normal text-[#64748b]">
                {stat.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <LogDispute categories={categories.map((c) => c.name)} />

      <div className="flex flex-col gap-[12px]">
        <div className="flex items-start pb-[4px]">
          <p className="text-[12px] font-bold text-[#8fb0a7] uppercase">
            This period&apos;s disputes
          </p>
        </div>

        {items.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center gap-[16px] p-[48px] ${card}`}
          >
            <span className="rounded-full bg-[#0e1217] p-[16px]">
              <Gavel size={24} strokeWidth={2} className="text-[#64748b]" />
            </span>
            <div className="flex w-full flex-col items-center gap-[6px] text-center">
              <p className="text-[15px] font-semibold text-[#e2e8f0]">
                No disputes logged yet this period
              </p>
              <p className="text-[13px] font-normal text-[#64748b]">
                Add one above to track what the team recovers.
              </p>
            </div>
          </div>
        ) : (
          <DisputeList items={items} />
        )}
      </div>
    </div>
  );
}
