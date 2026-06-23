import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { commission } from "@/db/app-schema";

// Per-member commission earnings for the CURRENT period (periodId null), keyed by
// the submitter's user id: the summed payout (productPrice * commissionRate / 100)
// of their APPROVED commissions only. Pending/denied commissions earn nothing.
// /payments adds this to each member's Amount, on top of base, ticket pay, and the
// disputes + review bonuses. Like those, it resets each period on "Reset all".
export async function getCommissionTotalsByUser(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      userId: commission.submittedById,
      productPrice: commission.productPrice,
      commissionRate: commission.commissionRate,
    })
    .from(commission)
    .where(and(isNull(commission.periodId), eq(commission.status, "approved")));

  const byUser = new Map<string, number>();
  for (const r of rows) {
    if (!r.userId) continue;
    const payout =
      r.productPrice != null ? (r.productPrice * (r.commissionRate ?? 0)) / 100 : 0;
    if (payout <= 0) continue;
    byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + payout);
  }
  // Round each total to cents to avoid float drift from the rate math.
  for (const [k, v] of byUser) byUser.set(k, Math.round(v * 100) / 100);
  return byUser;
}
