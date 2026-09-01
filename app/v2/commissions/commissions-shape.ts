// The shape and formatting of a commission, with no database import, so the
// client components can share it. commissions-data.ts holds the query; keeping
// them apart stops `pg` being pulled into the browser bundle, the same split
// post-shape.ts makes for news and guides.

export type CommissionRow = {
  id: string;
  ticketName: string;
  customerEmail: string;
  status: string;
  renewal: string | null;
  price: number | null;
  rate: number;
  /** price * rate / 100, computed on read the way the live tool does it. */
  payout: number;
  note: string;
  reviewedByName: string;
  when: string;
};

export type CommissionMember = {
  /** Route segment, and the grid's React key. */
  key: string;
  name: string;
  pending: number;
  approved: number;
  denied: number;
  /** Approved payouts only. */
  earnings: number;
  rows: CommissionRow[];
};

export const money = (n: number): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

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

// renewalDate is a date-only column, so it is split literally rather than parsed
// as an instant - lib/datetime would read it as UTC midnight and shift it back a
// day in Eastern time.
export function fmtRenewal(value: string | null): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}, ${y}` : value;
}

/** The status pill tones, the same set the audit scorecard badges use. */
export function statusTone(status: string): string {
  if (status === "approved") return "bg-[#10b981]/15 text-[#10b981]";
  if (status === "denied") return "bg-[#ef4444]/15 text-[#ef4444]";
  return "bg-[#64748b]/10 text-[#64748b]";
}

export const statusLabel = (status: string): string =>
  status === "approved"
    ? "Approved"
    : status === "denied"
      ? "Denied"
      : "Pending";
