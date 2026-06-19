import { and, asc, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { reportChannel, botSetting } from "@/db/app-schema";
import { user as userTable, account } from "@/db/auth-schema";
import ReportGrid, { type ReportEntry } from "./report-grid";

const DAY_MS = 86_400_000;

// The in-progress reporting period (mirrors the bot's period.ts): the most
// recent boundary at or before now, and the next boundary after it. Boundaries
// sit `periodDays` apart from the anchor Friday.
function currentPeriod(anchor: string, periodDays: number, now: number) {
  const anchorMs = Date.parse(`${anchor}T00:00:00Z`);
  const periodMs = Math.max(1, periodDays) * DAY_MS;
  if (Number.isNaN(anchorMs)) return { startMs: now, endMs: now + periodMs };
  const periodsSince = Math.floor((now - anchorMs) / periodMs);
  const startMs = anchorMs + periodsSince * periodMs;
  return { startMs, endMs: startMs + periodMs };
}

// Dates render in UTC (the period boundaries are defined in UTC), so the output
// is the same for every viewer and matches the bot's reports.
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const fmtDateTime = (ms: number) =>
  new Date(ms).toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) + " UTC";

// Member-facing leaderboard of screenshot/ticket counts per report channel. The
// counts are kept live by the bot (bot/src/index.ts countTick) and the whole
// page refreshes in real time via the app_event SSE bus, so the odometers roll
// up as new screenshots are posted. Visible to every signed-in member.
export default async function ReportsPage() {
  const session = await getSession();
  const currentUserId = session?.user.id ?? "";
  const now = Date.now();

  const setting = (
    await db
      .select({ periodAnchor: botSetting.periodAnchor, periodDays: botSetting.periodDays })
      .from(botSetting)
      .where(eq(botSetting.id, "singleton"))
      .limit(1)
  )[0];
  const periodDays = setting?.periodDays ?? 14;
  const { startMs, endMs } = currentPeriod(setting?.periodAnchor ?? "2026-06-26", periodDays, now);

  // Resolve each channel's member (Discord snowflake -> account -> user) for the
  // avatar and canonical name; left join so counts-everyone channels still show.
  const rows = await db
    .select({
      id: reportChannel.id,
      channelName: reportChannel.name,
      current: reportChannel.currentCount,
      resetAt: reportChannel.countResetAt,
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

  const entries: ReportEntry[] = rows.map((r) => {
    const count = r.current ?? 0;
    const resetMs = r.resetAt ? new Date(r.resetAt).getTime() : null;
    // Average per day over the window the count covers: days since the last
    // manual reset, or the period length when the channel has never been reset.
    const daysTracked = resetMs
      ? Math.max(1, Math.round((now - resetMs) / DAY_MS))
      : Math.max(1, periodDays);
    return {
      id: r.id,
      name: r.userName || r.channelName || "Member",
      image: r.image ?? null,
      count,
      isYou: !!r.userId && r.userId === currentUserId,
      avgPerDay: Math.round((count / daysTracked) * 10) / 10,
      lastReset: resetMs ? fmtDateTime(resetMs) : null,
    };
  });

  const total = entries.reduce((sum, e) => sum + e.count, 0);
  const periodLabel = `${fmtDate(startMs)} – ${fmtDate(endMs)}`;

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
          <h1 className="mb-2 text-center text-4xl font-semibold tracking-tight">
            Live ticket count
          </h1>
          <p className="mb-6 text-center text-xs text-muted">
            Current period: {periodLabel} ({periodDays} {periodDays === 1 ? "day" : "days"})
          </p>
          <ReportGrid entries={entries} />
        </div>
      </main>
    </>
  );
}
