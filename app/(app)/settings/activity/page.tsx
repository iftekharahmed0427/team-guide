import { desc } from "drizzle-orm";
import { ScrollText } from "lucide-react";
import { db } from "@/db";
import { activityLog } from "@/db/app-schema";
import { formatDateTime } from "@/lib/datetime";

// action key -> human phrase. Unknown keys fall back to the raw key.
const ACTION_LABELS: Record<string, string> = {
  "auth.signed_in": "signed in",
  "audit.created": "created an audit",
  "audit.updated": "edited an audit",
  "audit.deleted": "deleted an audit",
  "news.created": "published a news post",
  "news.updated": "edited a news post",
  "news.deleted": "deleted a news post",
  "guide.created": "published a guide",
  "guide.updated": "edited a guide",
  "guide.deleted": "deleted a guide",
  "guide.game_added": "added a game",
  "specialty.added": "assigned a game specialty",
  "specialty.removed": "removed a game specialty",
  "board.task_created": "added a board card",
  "board.task_moved": "moved a board card",
  "board.task_deleted": "deleted a board card",
  "board.comment_added": "commented on a board card",
  "board.comment_deleted": "deleted a board comment",
  "board.member_assigned": "assigned a member to a card",
  "board.member_unassigned": "unassigned a member from a card",
  "note.created": "posted a note",
  "note.deleted": "deleted a note",
  "commission.submitted": "submitted a commission",
  "commission.reviewed": "reviewed a commission",
  "commission.deleted": "deleted a commission",
  "payment.eligible": "marked a member eligible for payment",
  "payment.ineligible": "marked a member ineligible for payment",
  "payment.payout_updated": "updated a member payout",
  "payment.saved": "saved payment changes",
  "payment.tickets_updated": "edited a member's ticket count",
  "payment.tickets_reset": "reset a member's ticket count to live",
  "payment.base_updated": "edited a member's base compensation",
  "payment.role_assigned": "set a member's payment role",
  "payment.role_created": "added a payment role",
  "payment.role_renamed": "renamed a payment role",
  "payment.role_deleted": "deleted a payment role",
  "payment.role_paytype": "changed a role's pay type",
  "payment.role_bonus": "changed a role's bonus eligibility",
  "comp.period_created": "started a pay period",
  "comp.period_updated": "edited a pay period",
  "comp.period_deleted": "deleted a pay period",
  "comp.tickets_synced": "synced ticket counts",
  "review.added": "logged a review",
  "review.deleted": "deleted a review",
  "report_period.deleted": "deleted a report period",
  "bot.token_set": "set the bot token",
  "bot.token_cleared": "cleared the bot token",
  "bot.presence_updated": "updated the bot presence",
  "bot.run_now": "ran the bot report now",
  "bot.announcement_updated": "updated the announcement settings",
  "bot.channel_added": "added a report channel",
  "bot.channel_deleted": "removed a report channel",
  "bot.channel_reset": "reset a report channel",
  "bot.reset_all": "reset all report channels",
  "invite.created": "invited a member",
  "invite.revoked": "revoked an invite",
  "member.role_changed": "changed a member's role",
  "member.removed": "removed a member",
};

// Admin-only (the Settings layout already gates non-admins). Everything that
// happens on the portal is recorded by lib/activity.ts logActivity() and the
// auth sign-in hook; this shows the latest 200, newest first.
export default async function ActivityPage() {
  const rows = await db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(200);

  return (
    <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Activity log</h2>
        <p className="text-xs text-muted">Everything that happens on the portal, newest first.</p>
      </div>

      <section className="border border-border bg-surface">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <ScrollText size={22} strokeWidth={1.5} className="text-muted" />
            <p className="text-sm text-muted">No activity yet.</p>
          </div>
        ) : (
          <ul>
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 text-sm last:border-0"
              >
                <span className="min-w-0">
                  <span className="font-medium">{r.actorName || "Someone"}</span>
                  <span className="text-muted"> {ACTION_LABELS[r.action] ?? r.action}</span>
                  {r.targetLabel ? <span className="text-foreground"> {r.targetLabel}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {formatDateTime(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
