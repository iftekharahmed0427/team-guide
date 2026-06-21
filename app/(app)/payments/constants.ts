// Client-safe payment helpers (no db imports). The server query lives in
// lib/payments.ts.

export const TICKET_RATE = 1; // US dollars paid per ticket

export function formatUSD(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

// One payable member: their live current-period ticket count from Reports, plus
// an optional admin override of that count.
export type PayableMember = {
  userId: string | null; // app user id; null when the report channel isn't linked
  channelId: string; // stable key for unlinked rows
  name: string;
  image: string | null;
  tickets: number; // current-period ticket count (live from Reports)
  override: number | null; // admin's fixed count; null = track the live count
  roleId: string | null; // assigned payment role; null = unassigned
  roleName: string | null; // its display name (denormalized for read)
  paidPerTicket: boolean; // does the assigned role earn ticket pay (unassigned = true)
  bonusEligible: boolean; // does the assigned role get the Bonus + Recovered revenue fields
  baseCompensation: number; // flat $ paid on top of ticket pay
  bonus: number; // manual $ bonus (bonus-eligible roles); adds to Amount
  recoveredRevenue: number; // recorded only, not paid
};

// One assignable payment role from the admin-managed catalog. `paidPerTicket`
// marks the "Tickets" group (earns per ticket); `bonusEligible` marks the
// "Disputes" group (gets Bonus + Recovered revenue fields).
export type PaymentRole = {
  id: string;
  name: string;
  paidPerTicket: boolean;
  bonusEligible: boolean;
};

// The count a member is actually paid on: the admin override when set, otherwise
// the live Reports count.
export function effectiveTickets(m: { tickets: number; override: number | null }): number {
  return m.override ?? m.tickets;
}

// Payout for a ticket count at the flat per-ticket rate.
export function ticketPayout(tickets: number): number {
  return tickets * TICKET_RATE;
}

// Total a member is owed, role-based: ticket pay (on the effective count) when
// their role is paid-per-ticket, plus flat base compensation, plus a manual
// bonus when their role is bonus-eligible. Recovered revenue is recorded only.
export function memberTotal(m: {
  tickets: number;
  override: number | null;
  paidPerTicket: boolean;
  bonusEligible: boolean;
  baseCompensation: number;
  bonus: number;
}): number {
  const ticketPart = m.paidPerTicket ? ticketPayout(effectiveTickets(m)) : 0;
  const bonusPart = m.bonusEligible ? m.bonus || 0 : 0;
  return ticketPart + (m.baseCompensation || 0) + bonusPart;
}
