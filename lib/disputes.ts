import { randomUUID } from "node:crypto";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dispute, disputeCategory, paymentOverride, paymentRole, reportPeriod } from "@/db/app-schema";

// 5% of each member's current-period dispute amounts is added to their /payments
// bonus, on top of the manual bonus (see lib/payments + the payments table).
export const DISPUTE_BONUS_RATE = 0.05;

export type DisputeCategory = { id: string; name: string };

// The admin-managed category catalog, in display order. Seeded with "Fraudulent"
// the first time it is read (mirrors game_category's seed-on-read). The catalog
// is managed at /settings/dispute-categories.
export async function getDisputeCategories(): Promise<DisputeCategory[]> {
  const select = () =>
    db
      .select({ id: disputeCategory.id, name: disputeCategory.name })
      .from(disputeCategory)
      .orderBy(asc(disputeCategory.sortOrder), asc(disputeCategory.name));

  let rows = await select();
  if (rows.length === 0) {
    await db
      .insert(disputeCategory)
      .values({ id: randomUUID(), name: "Fraudulent", sortOrder: 0 })
      .onConflictDoNothing();
    rows = await select();
  }
  return rows;
}

// The current period's disputes (not yet archived), newest first.
export async function getCurrentDisputes() {
  return db.select().from(dispute).where(isNull(dispute.periodId)).orderBy(desc(dispute.createdAt));
}

// Archived disputes joined with the report_period each was closed into (a
// "Reset all" stamps the current disputes with the period it archives). The
// inner join naturally excludes still-current rows (periodId null). Newest
// period first, then newest dispute. Powers /disputes/history.
export async function getArchivedDisputes() {
  return db
    .select({
      id: dispute.id,
      email: dispute.email,
      category: dispute.category,
      amount: dispute.amount,
      imageUrl: dispute.imageUrl,
      submittedByName: dispute.submittedByName,
      createdAt: dispute.createdAt,
      periodId: dispute.periodId,
      startedAt: reportPeriod.startedAt,
      endedAt: reportPeriod.endedAt,
    })
    .from(dispute)
    .innerJoin(reportPeriod, eq(dispute.periodId, reportPeriod.id))
    .orderBy(desc(reportPeriod.endedAt), desc(dispute.createdAt));
}

export type DisputeTotals = { amount: number; bonus: number };

// Per-member totals for the CURRENT period (periodId null), keyed by the
// submitter's user id: the summed disputed amount (the recovered total) and the
// 5% bonus it earns. /payments adds `bonus` on top of each member's manual bonus.
export async function getDisputeTotalsByUser(): Promise<Map<string, DisputeTotals>> {
  const rows = await db
    .select({ userId: dispute.submittedById, amount: dispute.amount })
    .from(dispute)
    .where(isNull(dispute.periodId));

  const byUser = new Map<string, DisputeTotals>();
  for (const r of rows) {
    if (!r.userId) continue;
    const cur = byUser.get(r.userId) ?? { amount: 0, bonus: 0 };
    cur.amount += r.amount ?? 0;
    cur.bonus = Math.round(cur.amount * DISPUTE_BONUS_RATE * 100) / 100;
    byUser.set(r.userId, cur);
  }
  return byUser;
}

type SessionLike = { user: { id: string; role?: string | null } } | null;

// Who can use the /disputes tool: admins, and members assigned the Disputes
// payment role (matched by the seeded role id "disputes" or its name, so a rename
// of the role's display text still resolves while the seed id is intact).
export async function canAccessDisputes(session: SessionLike): Promise<boolean> {
  if (!session) return false;
  if (session.user.role === "admin") return true;

  const row = (
    await db
      .select({ roleId: paymentOverride.roleId, roleName: paymentRole.name })
      .from(paymentOverride)
      .leftJoin(paymentRole, eq(paymentRole.id, paymentOverride.roleId))
      .where(eq(paymentOverride.userId, session.user.id))
      .limit(1)
  )[0];
  if (!row) return false;
  return row.roleId === "disputes" || (row.roleName ?? "").trim().toLowerCase() === "disputes";
}
