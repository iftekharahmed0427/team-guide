import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { commission } from "@/db/app-schema";
import { formatDateTime } from "@/lib/datetime";
import { plainName } from "../member";
import { imagesByUserId } from "@/lib/member-images";
import type { CommissionMember, CommissionRow } from "./commissions-shape";

// The commission query, shared by the grid and the member detail behind it.
//
// Kept apart from commissions-shape.ts, which the client components import: this
// module pulls in the database, and anything a "use client" file touches ends up
// in the browser bundle.

// One row of the commission table, shaped for display. Shared by both queries
// so a member's own view and the admin grid agree on the arithmetic.
function toRow(row: typeof commission.$inferSelect): CommissionRow {
  const payout =
    row.productPrice != null
      ? (row.productPrice * (row.commissionRate ?? 0)) / 100
      : 0;
  return {
    id: row.id,
    ticketName: row.ticketName,
    customerEmail: row.customerEmail,
    status: row.status,
    renewal: row.renewalDate,
    price: row.productPrice,
    rate: row.commissionRate,
    payout,
    note: row.reviewNote,
    reviewedByName: row.reviewedByName,
    when: formatDateTime(row.createdAt),
  };
}

/**
 * Just this member's commissions. A member sees only their own payouts, so
 * their page queries for them rather than filtering the whole table down: the
 * team's rows and the team's totals never enter the request at all.
 */
export async function commissionsForMember(
  userId: string,
): Promise<{ rows: CommissionRow[]; earnings: number; pending: number }> {
  if (!userId) return { rows: [], earnings: 0, pending: 0 };

  const found = await db
    .select()
    .from(commission)
    .where(eq(commission.submittedById, userId))
    .orderBy(desc(commission.createdAt));

  const rows = found.map(toRow);
  return {
    rows,
    // Approved only, the same rule the grid's earnings use.
    earnings: rows.reduce(
      (sum, r) => sum + (r.status === "approved" ? r.payout : 0),
      0,
    ),
    pending: rows.filter((r) => r.status === "pending").length,
  };
}

/** Every commission, grouped by submitter. Admin only: this is the whole team. */
export async function commissionMembers(): Promise<{
  members: CommissionMember[];
  total: number;
  pending: number;
}> {
  const rows = await db
    .select()
    .from(commission)
    .orderBy(desc(commission.createdAt));

  const acc = new Map<string, CommissionMember>();
  for (const row of rows) {
    const name = plainName(row.submittedByName || "Member");
    const key = row.submittedById || `name:${name}`;
    const member =
      acc.get(key) ??
      ({
        key,
        name,
        image: null,
        pending: 0,
        approved: 0,
        denied: 0,
        earnings: 0,
        rows: [],
      } as CommissionMember);

    const shaped = toRow(row);
    const payout = shaped.payout;
    if (row.status === "approved") {
      member.approved += 1;
      member.earnings += payout;
    } else if (row.status === "denied") {
      member.denied += 1;
    } else {
      member.pending += 1;
    }

    member.rows.push(shaped);
    acc.set(key, member);
  }

  // The key is the submitter's user id wherever the row had one, so it doubles
  // as the lookup for their picture.
  const images = await imagesByUserId([...acc.keys()]);
  for (const [key, member] of acc) member.image = images.get(key) ?? null;

  // Anyone with work awaiting review first, then alphabetical - the order the
  // live tool uses, so the queue stays at the front.
  const members = [...acc.values()].sort(
    (a, b) => b.pending - a.pending || a.name.localeCompare(b.name),
  );

  return {
    members,
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
  };
}
