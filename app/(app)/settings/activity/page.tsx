import { desc } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/app-schema";
import { actionGroup, describeAction } from "@/lib/activity-labels";
import { formatDateTime } from "@/lib/datetime";
import { plainName } from "../../member";
import { SettingsHeader } from "../settings-ui";
import ActivityList, { type Entry } from "./activity-list";

// /settings/activity - the audit log, with filters.
//
// The live page renders the same two hundred rows as one flat list, which is
// fine as a record and useless as a lookup. The rows are labelled here and the
// filtering happens in the client component next door.

const LIMIT = 200;

export default async function SettingsActivityPage() {
  const rows = await db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(LIMIT);

  const entries: Entry[] = rows.map((r) => ({
    id: r.id,
    actor: plainName(r.actorName || "Someone"),
    phrase: describeAction(r.action),
    target: r.targetLabel || null,
    group: actionGroup(r.action),
    when: formatDateTime(r.createdAt),
  }));

  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <SettingsHeader
        title="Activity log"
        subtitle={`Every action taken on the portal. Showing the latest ${entries.length}, newest first.`}
      />

      <ActivityList entries={entries} />
    </div>
  );
}
