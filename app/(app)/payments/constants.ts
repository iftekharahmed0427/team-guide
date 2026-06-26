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
  disputeAmount: number; // summed disputed amount this period (from /disputes); the recovered total
  disputeBonus: number; // 5% of disputeAmount, added to Amount on top of the manual bonus
  reviewBonus: number; // flat review bonus (eligible member + team hit the period threshold); adds to Amount
  commission: number; // summed approved commission payouts this period (from /commissions); the computed default
  commissionOverride: number | null; // admin's fixed commission $; null = track the computed value
  hidden: boolean; // admin-excluded from the payments list (still in Reports); unhideable
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

// The commission a member is actually paid: the admin override when set, otherwise
// the computed approved-commission total this period.
export function effectiveCommission(m: {
  commission: number;
  commissionOverride: number | null;
}): number {
  return m.commissionOverride ?? m.commission;
}

// Payout for a ticket count at the flat per-ticket rate.
export function ticketPayout(tickets: number): number {
  return tickets * TICKET_RATE;
}

// Total a member is owed: ticket pay (on the effective count) when their role is
// paid-per-ticket, plus flat base compensation, plus a manual bonus (every member
// can have one), plus the auto disputes bonus (5% of their disputes this period),
// the review bonus (flat, once their assigned reviews pass the threshold), and
// their approved commission payouts this period. Recovered revenue is recorded
// only, never paid.
export function memberTotal(m: {
  tickets: number;
  override: number | null;
  paidPerTicket: boolean;
  baseCompensation: number;
  bonus: number;
  disputeBonus?: number;
  reviewBonus?: number;
  commission?: number;
}): number {
  const ticketPart = m.paidPerTicket ? ticketPayout(effectiveTickets(m)) : 0;
  return (
    ticketPart +
    (m.baseCompensation || 0) +
    (m.bonus || 0) +
    (m.disputeBonus || 0) +
    (m.reviewBonus || 0) +
    (m.commission || 0)
  );
}

// One row in a historical pay period (/payments/history). Bonus is a single number
// (the total that was paid that period), not split into manual/disputes/review.
export type HistoryRowInput = {
  paidPerTicket: boolean;
  tickets: number;
  baseCompensation: number;
  bonus: number;
  commission: number;
  amountOverride: number | null; // null = use the computed amount
};

// A history row's Amount, mirroring memberTotal but with a per-period ticket rate
// and a flat bonus. The admin override wins when set.
export function historyRowAmount(r: HistoryRowInput, ticketRate: number): number {
  if (r.amountOverride !== null) return r.amountOverride;
  const ticketPart = r.paidPerTicket ? r.tickets * ticketRate : 0;
  return ticketPart + (r.baseCompensation || 0) + (r.bonus || 0) + (r.commission || 0);
}
