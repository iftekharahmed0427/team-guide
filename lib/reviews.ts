import { asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { review, reviewSetting, reviewBonusMember, reviewSource } from "@/db/app-schema";

export type ReviewSource = { id: string; name: string };

// The default sources seeded the first time the catalog is read. The ids are the
// legacy source keys already stored on existing reviews, so no data migration is
// needed. Managed at /settings/review-sources.
const REVIEW_SOURCE_SEED = [
  { id: "trustpilot", name: "Trustpilot", sortOrder: 0 },
  { id: "google", name: "Google", sortOrder: 1 },
];

// The admin-managed review-source catalog, in display order. Seeded on first read
// (mirrors the review-bonus + dispute-category seed-on-read). `review.source`
// stores the source id; look names up through this list.
export async function getReviewSources(): Promise<ReviewSource[]> {
  const read = () =>
    db
      .select({ id: reviewSource.id, name: reviewSource.name })
      .from(reviewSource)
      .orderBy(asc(reviewSource.sortOrder), asc(reviewSource.name));

  let rows = await read();
  if (rows.length === 0) {
    await db.insert(reviewSource).values(REVIEW_SOURCE_SEED).onConflictDoNothing();
    rows = await read();
  }
  return rows;
}

export type ReviewBonusSetting = { threshold: number; amount: number };

// Defaults the singleton is seeded with: when the team logs 50 OR MORE reviews in
// the current period, each eligible member earns a flat $50. Both editable on
// /reviews.
export const REVIEW_BONUS_DEFAULTS: ReviewBonusSetting = { threshold: 50, amount: 50 };

// The singleton review-bonus config, seeded with the defaults the first time it
// is read (mirrors the dispute_category seed-on-read). Edited inline on /reviews.
// `threshold` = team total reviews required; `amount` = $ per eligible member.
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

// The number of reviews logged in the current period (periodId null) — the count
// the bonus gate is measured against.
export async function getCurrentReviewCount(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(review).where(isNull(review.periodId));
  return row?.n ?? 0;
}

// The set of member ids an admin has marked eligible for the review bonus.
export async function getEligibleMemberIds(): Promise<Set<string>> {
  const rows = await db.select({ userId: reviewBonusMember.userId }).from(reviewBonusMember);
  return new Set(rows.map((r) => r.userId));
}

// Per-member review bonus for the CURRENT period, keyed by user id. The bonus
// only applies when the team's total reviews this period reach the threshold; if
// met, every eligible member earns `amount`, otherwise nobody does. /payments
// adds this to each member's Amount, on top of the manual + disputes bonuses.
export async function getReviewBonusByUser(): Promise<Map<string, number>> {
  const { threshold, amount } = await getReviewBonusSetting();
  const total = await getCurrentReviewCount();
  const byUser = new Map<string, number>();
  if (total < threshold) return byUser;

  const eligible = await getEligibleMemberIds();
  for (const userId of eligible) byUser.set(userId, amount);
  return byUser;
}
