import Link from "next/link";
import { History, RotateCcw } from "lucide-react";
import { HIDDEN, PER_TICKET, PERIOD, ROWS, money, sum } from "./payments-data";
import PaymentsTable from "./payments-table";

// /v2/payments - the redesign's payroll sheet, built from the "payments-page"
// Figma frame (node 56:4): the period/tickets/top-member stat row, the payroll
// card, and the hidden-members section underneath. Shell comes from
// app/v2/layout.tsx; the card itself is a client island because it carries the
// edit state from "payments-table-edit-state" (node 60:504).
//
// Content is the frame's placeholder copy - this is still the redesign canvas,
// so nothing reads from the payment tables and History / Restore are inert.
// Amounts, the total line and two of the stat cards are computed from the rows
// rather than transcribed, so no column can disagree with another; the numbers
// come out exactly as the frame draws them.
//
// The stat row stays on the initial rows even while the table is edited, since
// it is sourced from Reports rather than from the payroll sheet.

export default function V2PaymentsPage() {
  const totalTickets = sum(ROWS, (r) => r.tickets);
  const top = [...ROWS].sort((a, b) => b.tickets - a.tickets)[0];

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[28px] font-bold text-white">Payments</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            {money(PER_TICKET)} per ticket (live from Reports)
          </p>
        </div>
        <Link
          href="/v2/payments/history"
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-white transition-colors hover:border-[#2f3d42]!"
        >
          <History size={16} strokeWidth={2} className="text-[#94a3b8]" />
          History
        </Link>
      </div>

      <div className="flex items-start gap-[16px]">
        {[
          { label: "Current Period", value: PERIOD.label, note: PERIOD.note },
          {
            label: "Total Tickets",
            value: totalTickets.toLocaleString("en-US"),
            note: `${money(totalTickets * PER_TICKET)} from tickets`,
          },
          {
            label: "Top Member",
            value: top.name,
            note: `${top.tickets} tickets · ${money(top.tickets * PER_TICKET)}`,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="flex min-w-0 flex-1 flex-col gap-[8px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]"
          >
            <p className="text-[11px] font-bold tracking-[0.44px] text-[#94a3b8] uppercase">
              {card.label}
            </p>
            <p className="truncate text-[24px] font-bold text-[#e2e8f0]">{card.value}</p>
            <p className="text-[13px] font-normal text-[#8fb0a7]">{card.note}</p>
          </div>
        ))}
      </div>

      <PaymentsTable />

      <div className="flex flex-col gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]">
        <p className="text-[11px] font-bold tracking-[0.44px] text-[#94a3b8] uppercase">
          Hidden from payments ({HIDDEN.length})
        </p>
        {HIDDEN.map((member) => (
          <div key={member.name} className="flex items-center justify-between gap-[16px]">
            <div className="flex min-w-0 items-center gap-[12px]">
              <span
                style={{ backgroundColor: member.tint }}
                className="flex size-[28px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#0e1217]"
              >
                {member.initials}
              </span>
              <div className="flex min-w-0 flex-col gap-[2px]">
                <p className="truncate text-[14px] font-semibold text-[#94a3b8]">{member.name}</p>
                <p className="truncate text-[11px] font-normal text-[#64748b]">{member.role}</p>
              </div>
            </div>
            <button
              type="button"
              className="flex shrink-0 cursor-pointer items-center gap-[4px] rounded-[6px] border border-[#243033]! bg-white/[0.03] px-[12px] py-[6px] text-[12px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
            >
              <RotateCcw size={12} strokeWidth={2} className="text-[#94a3b8]" />
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
