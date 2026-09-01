import Link from "next/link";
import { asc, desc, inArray } from "drizzle-orm";
import { ArrowLeft, Plus } from "lucide-react";
import { db } from "@/db";
import { paymentPeriod, paymentPeriodRow } from "@/db/app-schema";
import { initialsOf, plainName, tintFor } from "../../member";
import PeriodCard, { type PeriodMember } from "./period-card";

// /v2/payments/history - the archive from the "payment-history-page" Figma frame
// (node 136:97): one card per pay period, each with its range, ticket rate and
// the same payroll table the live sheet uses.
//
// Reads the real payment_period / payment_period_row snapshots. Amounts go
// through historyRowAmount, the same helper the live page uses, so the admin
// override and the signed adjustment behave identically here.

// startDate / endDate are date-only columns, so they are split literally rather
// than parsed as instants. lib/datetime is explicit that a "YYYY-MM-DD" must not
// go through it: it would be read as UTC midnight and shift a day backwards in
// Eastern time. Mirrors fmtDate in the live history-manager.
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtDate(value: string | null): string {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}, ${y}` : value;
}

export default async function V2PaymentHistoryPage() {
  const periods = await db
    .select()
    .from(paymentPeriod)
    .orderBy(desc(paymentPeriod.endDate), desc(paymentPeriod.createdAt));
  const ids = periods.map((p) => p.id);

  const rows = ids.length
    ? await db
        .select()
        .from(paymentPeriodRow)
        .where(inArray(paymentPeriodRow.periodId, ids))
        .orderBy(asc(paymentPeriodRow.position))
    : [];

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">
            Payment history
          </h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Past pay periods and payouts for all team members by hand
          </p>
        </div>
        <Link
          href="/v2/payments"
          className="flex shrink-0 items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
        >
          <ArrowLeft size={12} strokeWidth={2} className="text-[#94a3b8]" />
          Back to payments
        </Link>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
        >
          <Plus size={14} strokeWidth={2} className="text-[#8fb0a7]" />
          Add period
        </button>
      </div>

      {periods.length === 0 ? (
        <p className="rounded-[12px] border border-[#243033]! bg-[#171e24] p-[40px] text-center text-[13px] text-[#64748b]">
          No pay periods yet.
        </p>
      ) : null}

      <div className="flex flex-col gap-[24px]">
        {periods.map((period) => {
          // Auto periods carry no label, so they are titled by their range; the
          // first one has no start, which the report archive labels "start".
          const from = fmtDate(period.startDate) || "start";
          const to = fmtDate(period.endDate) || "open";
          const range = `${from} – ${to}`;
          const title = period.label || range;

          const people: PeriodMember[] = rows
            .filter((r) => r.periodId === period.id)
            .map((r) => {
              // One member's Discord name is set in fancy Unicode; the frames
              // all read it as plain letters.
              const name = plainName(r.memberName || "Member");
              return {
                id: r.id,
                name,
                initials: initialsOf(name),
                tint: tintFor(name),
                role: r.roleName,
                paidPerTicket: r.paidPerTicket,
                amountOverride: r.amountOverride,
                values: {
                  base: r.baseCompensation,
                  tickets: r.tickets,
                  bonus: r.bonus,
                  commissions: r.commission,
                  adjustment: r.adjustment,
                },
              };
            });

          return (
            <PeriodCard
              key={period.id}
              title={title}
              auto={period.source === "reset"}
              ticketRate={period.ticketRate}
              members={people}
            />
          );
        })}
      </div>
    </div>
  );
}
