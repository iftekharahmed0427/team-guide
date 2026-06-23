import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { review, reviewSetting } from "@/db/app-schema";

export type ReviewBonusSetting = { threshold: number; amount: number };

// Defaults the singleton is seeded with: a member assigned 50 OR MORE reviews in
// the current period earns a flat $50, both editable on /reviews.
export const REVIEW_BONUS_DEFAULTS: ReviewBonusSetting = { threshold: 50, amount: 50 };

// The singleton review-bonus config, seeded with the defaults the first time it
// is read (mirrors the dispute_category seed-on-read). Edited inline on /reviews.
export async function getReviewBonusSetting(): Promise<ReviewBonusSetting> {
  const read = () =>
    db
      .select({ threshold: reviewSetting.threshold, amount: reviewSetting.amount })
      .from(reviewSetting)
      .where(eq(reviewSetting.id, "singleton"))
      .limit(1);

  let rows = await read();
  if (rows.length === 0) {
    await db
      .insert(reviewSetting)
      .values({ id: "singleton", ...REVIEW_BONUS_DEFAULTS })
      .onConflictDoNothing();
    rows = await read();
  }
  return rows[0] ?? REVIEW_BONUS_DEFAULTS;
}

export type ReviewBonus = { count: number; bonus: number };

// Per-member assigned-review counts for the CURRENT period (periodId null),
// keyed by the assigned user id, with the flat bonus each earns: `amount` when
// the count is `threshold` or more, else 0. /payments adds `bonus` to each
// member's Amount, on top of the manual + disputes bonuses.
export async function getReviewBonusByUser(): Promise<Map<string, ReviewBonus>> {
  const { threshold, amount } = await getReviewBonusSetting();
  const rows = await db
    .select({ userId: review.assignedToId })
    .from(review)
    .where(isNull(review.periodId));

  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.userId) continue;
    counts.set(r.userId, (counts.get(r.userId) ?? 0) + 1);
  }
  const byUser = new Map<string, ReviewBonus>();
  for (const [userId, count] of counts) {
    byUser.set(userId, { count, bonus: count >= threshold ? amount : 0 });
  }
  return byUser;
}
