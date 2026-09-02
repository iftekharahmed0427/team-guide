import { desc } from "drizzle-orm";
import { db } from "@/db";
import { commission } from "@/db/app-schema";
import { formatDateTime } from "@/lib/datetime";
import { plainName } from "../member";
import type { CommissionMember } from "./commissions-shape";

// The commission query, shared by the grid and the member detail behind it.
//
// Kept apart from commissions-shape.ts, which the client components import: this
// module pulls in the database, and anything a "use client" file touches ends up
// in the browser bundle.

/** Every commission, grouped by submitter. */
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
        pending: 0,
        approved: 0,
        denied: 0,
        earnings: 0,
        rows: [],
      } as CommissionMember);

    const payout =
      row.productPrice != null
        ? (row.productPrice * (row.commissionRate ?? 0)) / 100
        : 0;
    if (row.status === "approved") {
      member.approved += 1;
      member.earnings += payout;
    } else if (row.status === "denied") {
      member.denied += 1;
    } else {
      member.pending += 1;
    }

    member.rows.push({
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
    });
    acc.set(key, member);
  }

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
