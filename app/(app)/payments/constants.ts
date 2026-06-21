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
};

// One assignable payment role from the admin-managed catalog.
export type PaymentRole = { id: string; name: string };

// The count a member is actually paid on: the admin override when set, otherwise
// the live Reports count.
export function effectiveTickets(m: { tickets: number; override: number | null }): number {
  return m.override ?? m.tickets;
}

// Payout for a ticket count at the flat per-ticket rate.
export function ticketPayout(tickets: number): number {
  return tickets * TICKET_RATE;
}
