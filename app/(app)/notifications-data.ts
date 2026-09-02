import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/app-schema";
import { describeAction } from "@/lib/activity-labels";
import { plainName } from "./member";
import { imagesByUserId } from "@/lib/member-images";

// What the bell shows. There is no notifications table and nothing in the app
// produces one, so this is the activity log filtered down to the events a
// teammate would actually want to hear about.
//
// That means it is a team feed, not a personal one: activity_log records who
// did something, never who it was done to, so "assigned to you" cannot be told
// apart from "assigned to someone else". A real per-person inbox needs a table
// of its own; see the note in v2-notifications.tsx.

export type Notice = {
  id: string;
  actor: string;
  /** Read live, so a notice shows the actor as they look today. */
  image: string | null;
  /** The phrase after the actor's name. */
  action: string;
  target: string | null;
  /** Section label on the right of the row. */
  tag: string;
  /** Epoch millis, so the client can compare against what it has seen. */
  at: number;
  /** Preformatted on the server, so the row needs no clock in the browser. */
  when: string;
};

// The actions worth surfacing. Everything else the log records - saving the
// payroll, editing a catalogue, the bot's channel housekeeping, sign-ins - is
// either routine or noise in a dropdown this size.
const WORTH_TELLING: Record<string, string> = {
  "news.created": "News",
  "news.updated": "News",
  "guide.created": "Guides",
  "guide.updated": "Guides",
  "audit.created": "Audits",
  "commission.submitted": "Commissions",
  "commission.reviewed": "Commissions",
  "dispute.created": "Disputes",
  "review.added": "Reviews",
  "board.task_created": "Board",
  "board.comment_added": "Board",
  "board.member_assigned": "Board",
  "note.created": "Notes",
  "note.pinned": "Notes",
  "specialty.added": "Specialists",
  "specialty.game_added": "Specialists",
  "invite.created": "Team",
  "member.role_changed": "Team",
  "bot.reset_all": "Period",
};

const LIMIT = 20;

/** "2h ago" while it is recent, a date once it is older than a week. */
function ago(at: number, now: number): string {
  const mins = Math.round((now - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export async function getNotices(): Promise<Notice[]> {
  const now = Date.now();
  const rows = await db
    .select()
    .from(activityLog)
    .where(inArray(activityLog.action, Object.keys(WORTH_TELLING)))
    .orderBy(desc(activityLog.createdAt))
    .limit(LIMIT);

  const images = await imagesByUserId(rows.map((r) => r.actorId));

  return rows.map((r) => {
    const actor = plainName(r.actorName || "Someone");
    return {
      id: r.id,
      actor,
      image: r.actorId ? images.get(r.actorId) ?? null : null,
      action: describeAction(r.action),
      target: r.targetLabel || null,
      tag: WORTH_TELLING[r.action] ?? "Activity",
      at: r.createdAt.getTime(),
      when: ago(r.createdAt.getTime(), now),
    };
  });
}
