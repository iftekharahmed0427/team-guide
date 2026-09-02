import { desc } from "drizzle-orm";
import { ScrollText } from "lucide-react";
import { db } from "@/db";
import { activityLog } from "@/db/app-schema";
import { formatDateTime } from "@/lib/datetime";
import { ACTION_LABELS } from "@/lib/activity-labels";

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
