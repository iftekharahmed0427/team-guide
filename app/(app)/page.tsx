import Link from "next/link";
import { count, desc, eq, isNull } from "drizzle-orm";
import {
  Search,
  Bell,
  Plus,
  CheckCheck,
  UserCheck,
  Newspaper,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { newsPost, unavailability, shift, note, ticketCount } from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import AvailabilityCalendar from "@/app/components/availability-calendar";
import ShiftCheckin from "@/app/components/shift-checkin";

type Stat = {
  label: string;
  value: string;
  delta: string;
  trend?: "up" | "down";
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(d: Date | string) {
  const x = new Date(d);
  return `${SHORT_MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}`;
}

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  const TrendIcon =
    stat.trend === "up" ? ArrowUpRight : stat.trend === "down" ? ArrowDownRight : null;
  return (
    <div className="border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{stat.label}</span>
        <div className="flex h-9 w-9 items-center justify-center border border-border bg-surface-2 text-muted">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-3xl font-semibold tracking-tight">{stat.value}</span>
        <span
          className={`flex items-center gap-1 text-xs ${
            stat.trend === "up"
              ? "text-emerald-400"
              : stat.trend === "down"
                ? "text-sky-400"
                : "text-muted"
          }`}
        >
          {TrendIcon ? <TrendIcon size={14} strokeWidth={2} /> : null}
          {stat.delta}
        </span>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await getSession();
  const currentUserId = session?.user.id ?? "";

  const [latestNews, availabilityRows, activeShifts, memberCount, recentNotes, ticketRows] =
    await Promise.all([
      db.select().from(newsPost).orderBy(desc(newsPost.createdAt)).limit(5),
      db
        .select({
          date: unavailability.date,
          userId: unavailability.userId,
          userName: user.name,
        })
        .from(unavailability)
        .innerJoin(user, eq(unavailability.userId, user.id)),
      db
        .select({
          userId: shift.userId,
          userName: user.name,
          checkedInAt: shift.checkedInAt,
        })
        .from(shift)
        .innerJoin(user, eq(shift.userId, user.id))
        .where(isNull(shift.checkedOutAt))
        .orderBy(shift.checkedInAt),
      db.select({ value: count() }).from(user),
      db.select().from(note).orderBy(desc(note.createdAt)).limit(5),
      db.select().from(ticketCount).where(eq(ticketCount.id, "singleton")).limit(1),
    ]);

  const totalMembers = memberCount[0]?.value ?? 0;

  // Live ticket total kept fresh by the bot (see bot/src/index.ts countTick). The
  // "% vs last period" delta is only meaningful once a prior period exists.
  const tickets = ticketRows[0]?.total ?? 0;
  const previousTickets = ticketRows[0]?.previousTotal ?? 0;
  let ticketDelta = "this period";
  let ticketTrend: "up" | "down" | undefined;
  if (previousTickets > 0) {
    const pct = Math.round(((tickets - previousTickets) / previousTickets) * 100);
    ticketTrend = pct >= 0 ? "up" : "down";
    ticketDelta = `${pct >= 0 ? "+" : ""}${pct}% vs last period`;
  }

  const stats: Stat[] = [
    {
      label: "Tickets solved",
      value: tickets.toLocaleString(),
      delta: ticketDelta,
      trend: ticketTrend,
      icon: CheckCheck,
    },
    {
      label: "On shift now",
      value: `${activeShifts.length} / ${totalMembers}`,
      delta: "checked in",
      icon: UserCheck,
    },
  ];

  return (
    <>
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted">Overview of your team workspace</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 border border-border bg-surface-2 px-3 md:flex">
            <Search size={16} strokeWidth={1.75} className="text-muted" />
            <input
              type="text"
              placeholder="Search guides, people, projects"
              className="h-9 w-64 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            />
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center border border-border bg-surface-2 text-muted transition-colors hover:text-foreground"
          >
            <Bell size={18} strokeWidth={1.75} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 bg-foreground" />
          </button>
          <button
            type="button"
            className="btn-wipe btn-wipe-dark flex h-9 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background"
          >
            <Plus size={16} strokeWidth={2} />
            New project
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
          {/* Left column: stats + latest news */}
          <div className="fx-rise flex flex-col gap-4 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard stat={stats[0]} />
              <StatCard stat={stats[1]} />
            </div>

            {/* Latest news */}
            <div className="border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Latest news</h2>
                  <p className="text-xs text-muted">Announcements and updates from the team</p>
                </div>
                <Link
                  href="/news"
                  className="flex items-center gap-1 border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
                >
                  View all
                  <ChevronRight size={14} strokeWidth={1.75} />
                </Link>
              </div>

              {latestNews.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-muted">No news yet.</div>
              ) : (
                <div className="flex flex-col">
                  {latestNews.map((post) => (
                    <Link
                      key={post.id}
                      href={`/news/${post.slug}`}
                      className="btn-wipe flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-surface-2 text-muted">
                        <Newspaper size={15} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDate(post.createdAt)} · {post.authorName || "Member"}
                        </p>
                      </div>
                      {post.tags[0] ? (
                        <span className="hidden shrink-0 border border-border px-2 py-0.5 text-[11px] text-muted sm:inline-block">
                          {post.tags[0]}
                        </span>
                      ) : null}
                      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-muted" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: availability + shift check-in + quick actions */}
          <div className="fx-rise flex flex-col gap-4" style={{ animationDelay: "80ms" }}>
            {/* Team availability */}
            <div className="border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold tracking-tight">Team availability</h2>
                <p className="text-xs text-muted">Select a day to set your unavailability</p>
              </div>
              <AvailabilityCalendar entries={availabilityRows} currentUserId={currentUserId} />
            </div>

            {/* Shift check-in */}
            <div className="border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold tracking-tight">Shift check-in</h2>
                <p className="text-xs text-muted">Who is on shift right now</p>
              </div>
              <ShiftCheckin active={activeShifts} currentUserId={currentUserId} />
            </div>

            {/* Notes */}
            <div className="border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Notes</h2>
                  <p className="text-xs text-muted">Shared notes from the team</p>
                </div>
                <Link
                  href="/notes"
                  className="flex items-center gap-1 border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
                >
                  View all
                  <ChevronRight size={14} strokeWidth={1.75} />
                </Link>
              </div>

              {recentNotes.length === 0 ? (
                <Link
                  href="/notes"
                  className="block px-5 py-8 text-center text-sm text-muted transition-colors hover:text-foreground"
                >
                  No notes yet. Write the first one.
                </Link>
              ) : (
                <div className="flex flex-col">
                  {recentNotes.map((n) => (
                    <div
                      key={n.id}
                      className="border-b border-border px-5 py-3 last:border-0"
                    >
                      <p className="line-clamp-2 text-sm leading-snug text-foreground">
                        {n.body}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {n.authorName || "Member"} · {formatDate(n.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
