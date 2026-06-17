import { and, asc, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { reportChannel } from "@/db/app-schema";
import { user as userTable, account } from "@/db/auth-schema";
import ReportGrid, { type ReportEntry } from "./report-grid";

// Member-facing leaderboard of screenshot/ticket counts per report channel. The
// counts are kept live by the bot (bot/src/index.ts countTick) and the whole
// page refreshes in real time via the app_event SSE bus, so the odometers roll
// up as new screenshots are posted. Visible to every signed-in member.
export default async function ReportsPage() {
  const session = await getSession();
  const currentUserId = session?.user.id ?? "";

  // Resolve each channel's member (Discord snowflake -> account -> user) for the
  // avatar and canonical name; left join so counts-everyone channels still show.
  const rows = await db
    .select({
      id: reportChannel.id,
      channelName: reportChannel.name,
      current: reportChannel.currentCount,
      userId: userTable.id,
      userName: userTable.name,
      image: userTable.image,
    })
    .from(reportChannel)
    .leftJoin(
      account,
      and(eq(account.accountId, reportChannel.userId), eq(account.providerId, "discord")),
    )
    .leftJoin(userTable, eq(userTable.id, account.userId))
    .orderBy(desc(reportChannel.currentCount), asc(reportChannel.createdAt));

  const entries: ReportEntry[] = rows.map((r) => ({
    id: r.id,
    name: r.userName || r.channelName || "Member",
    image: r.image ?? null,
    count: r.current ?? 0,
    isYou: !!r.userId && r.userId === currentUserId,
  }));

  const total = entries.reduce((sum, e) => sum + e.count, 0);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Reports</h1>
          <p className="text-xs text-muted">Live ticket counts for the current period</p>
        </div>
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-xs text-muted">Team total</p>
          <p className="text-lg font-semibold tabular-nums">{total.toLocaleString()}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise">
          <h1 className="mb-6 text-center text-4xl font-semibold tracking-tight">
            Live ticket count
          </h1>
          <ReportGrid entries={entries} />
        </div>
      </main>
    </>
  );
}
