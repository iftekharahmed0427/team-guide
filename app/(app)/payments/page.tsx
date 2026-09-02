import Link from "next/link";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  getCurrentPeriod,
  getPayableMembers,
} from "@/lib/payments";
import {
  effectiveTickets,
  ticketPayout,
} from "@/lib/payment-constants";
import { formatDate } from "@/lib/datetime";
import { initialsOf, plainName, tintFor } from "../member";
import { PER_TICKET, money, toRow } from "./payments-data";
import PaymentsTable from "./payments-table";
import HiddenMembers, { type HiddenMember } from "./hidden-members";

// /payments - the payroll sheet, built from the "payments-page" Figma frame
// (node 56:4): the period/tickets/top-member stat row, the payroll card, and
// the hidden-members section underneath. Shell comes from app/layout.tsx;
// the card is a client island because it carries the edit state from
// "payments-table-edit-state" (node 60:504).
//
// Admin-only, as the live sheet is: it shows what every member is owed.
//
// Amounts come from the live memberTotal rather than being recomputed here, so
// the two sheets cannot disagree about anyone's pay.

const DAY_MS = 1000 * 60 * 60 * 24;

export default async function PaymentsPage() {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/");

  const [members, period] = await Promise.all([
    getPayableMembers(),
    getCurrentPeriod(),
  ]);

  // Hidden members leave the sheet, its totals and the cards, but are kept
  // aside so an admin can put them back.
  const visible = members.filter((m) => !m.hidden);
  const rows = visible.map(toRow);

  const hidden: HiddenMember[] = members
    .filter((m) => m.hidden && m.userId)
    .map((m) => {
      const name = plainName(m.name);
      return {
        userId: m.userId as string,
        name,
        initials: initialsOf(name),
        tint: tintFor(name),
        role: m.roleName ?? "Unassigned",
      };
    });

  const totalTickets = visible.reduce((s, m) => s + effectiveTickets(m), 0);
  // Ticket money is only earned by roles that are paid per ticket.
  const ticketPay = visible.reduce(
    (s, m) => s + (m.paidPerTicket ? ticketPayout(effectiveTickets(m)) : 0),
    0,
  );
  const top = [...rows].sort((a, b) => b.tickets - a.tickets)[0];

  // Reading the clock is impure, which the purity rule flags even in a server
  // component. This one renders per request, so there is no re-render for the
  // value to drift across.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const elapsedDays = period.start
    ? Math.max(1, Math.round((nowMs - period.start.getTime()) / DAY_MS))
    : 0;
  const periodLabel = period.start
    ? `${formatDate(period.start)} – ${period.end ? formatDate(period.end) : "now"}`
    : "No period yet";
  const periodNote = period.start
    ? `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} in`
    : "Starts at the first reset";

  const cards = [
    { label: "Current Period", value: periodLabel, note: periodNote },
    {
      label: "Total Tickets",
      value: totalTickets.toLocaleString("en-US"),
      note: `${money(ticketPay)} from tickets`,
    },
    {
      label: "Top Member",
      value: top && top.tickets > 0 ? top.name : "Nobody yet",
      note:
        top && top.tickets > 0
          ? `${top.tickets} tickets · ${money(top.tickets * PER_TICKET)}`
          : "No tickets counted this period",
    },
  ];

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
          href="/payments/history"
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-white transition-colors hover:border-[#2f3d42]!"
        >
          <History size={16} strokeWidth={2} className="text-[#94a3b8]" />
          History
        </Link>
      </div>

      <div className="flex items-start gap-[16px]">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex min-w-0 flex-1 flex-col gap-[8px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]"
          >
            <p className="text-[11px] font-bold tracking-[0.44px] text-[#94a3b8] uppercase">
              {card.label}
            </p>
            <p className="truncate text-[24px] font-bold text-[#e2e8f0]">
              {card.value}
            </p>
            <p className="text-[13px] font-normal text-[#8fb0a7]">
              {card.note}
            </p>
          </div>
        ))}
      </div>

      <PaymentsTable rows={rows} />

      <HiddenMembers members={hidden} />
    </div>
  );
}
