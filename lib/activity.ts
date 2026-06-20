import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { activityLog } from "@/db/app-schema";
import { getSession } from "@/lib/auth";

// Record one portal action in the activity log (/settings/activity). Best-effort:
// it reads the current session for the actor, inserts a single row, and is
// wrapped so it NEVER throws or blocks the action that called it. `action` is a
// stable key (e.g. "audit.created"); `targetLabel` is the human label of the
// affected thing (ticket #, post title, channel/member name).
export async function logActivity(action: string, targetLabel = ""): Promise<void> {
  try {
    const session = await getSession();
    await db.insert(activityLog).values({
      id: randomUUID(),
      actorId: session?.user.id ?? null,
      actorName: session?.user.name || session?.user.email || "Someone",
      action,
      targetLabel: (targetLabel ?? "").slice(0, 200),
    });
  } catch {
    // logging must never break the underlying action
  }
}
