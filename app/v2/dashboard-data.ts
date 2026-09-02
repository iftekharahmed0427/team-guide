import { count, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  newsPost,
  note,
  review,
  reviewSource,
  shift,
  ticketCount,
  unavailability,
} from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import { formatDate } from "@/lib/datetime";
import { initialsOf, plainName, tintFor } from "./member";

// Everything the v2 dashboard renders, gathered in one place. The same tables
// the live dashboard reads, so the two cards agree.
//
// Deliberately never selects newsPost.content: the dashboard shows five titles
// and that column runs to kilobytes a row.

export type DashboardData = {
  ticketsSolved: number;
  ticketDelta: string | null;
  onShift: { id: string; name: string; at: string }[];
  memberCount: number;
  reviewTotal: number;
  reviewsBySource: { label: string; count: number }[];
  news: { slug: string; title: string; meta: string; tag: string | null }[];
  notes: {
    id: string;
    name: string;
    initials: string;
    tint: string;
    at: string;
    body: string;
  }[];
  /** Day of month -> whoever is off, for the calendar. */
  daysOff: Record<number, string[]>;
  month: { year: number; month: number };
  today: number;
};

const time = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** "2h ago" for anything recent, a date once it is older than a week. */
function ago(from: Date, now: number): string {
  const mins = Math.round((now - from.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(from);
}

export async function getDashboard(): Promise<DashboardData> {
  const now = Date.now();
  const today = new Date(now);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    newsRows,
    offRows,
    shiftRows,
    memberRows,
    noteRows,
    counts,
    reviewRows,
    sources,
  ] = await Promise.all([
    db
      .select({
        slug: newsPost.slug,
        title: newsPost.title,
        authorName: newsPost.authorName,
        createdAt: newsPost.createdAt,
        tags: newsPost.tags,
      })
      .from(newsPost)
      .orderBy(desc(newsPost.createdAt))
      .limit(5),
    db
      .select({
        date: unavailability.date,
        userName: user.name,
        email: user.email,
      })
      .from(unavailability)
      .innerJoin(user, eq(unavailability.userId, user.id))
      .where(gte(unavailability.date, monthStart.toISOString().slice(0, 10))),
    db
      .select({
        userId: shift.userId,
        userName: user.name,
        email: user.email,
        checkedInAt: shift.checkedInAt,
      })
      .from(shift)
      .innerJoin(user, eq(shift.userId, user.id))
      .where(isNull(shift.checkedOutAt))
      .orderBy(shift.checkedInAt),
    db.select({ value: count() }).from(user),
    db
      .select({
        id: note.id,
        title: note.title,
        body: note.body,
        authorName: note.authorName,
        createdAt: note.createdAt,
      })
      .from(note)
      // Pinned first, the way /v2/notes orders them, so what the team has been
      // asked to read is what the dashboard shows.
      .orderBy(desc(note.pinned), desc(note.createdAt))
      .limit(5),
    db.select().from(ticketCount).where(eq(ticketCount.id, "singleton")).limit(1),
    db
      .select({ source: review.source, n: count() })
      .from(review)
      .where(isNull(review.periodId))
      .groupBy(review.source),
    db.select({ id: reviewSource.id, name: reviewSource.name }).from(reviewSource),
  ]);

  const tickets = counts[0];
  const solved = tickets?.total ?? 0;
  const previous = tickets?.previousTotal ?? 0;
  // Only claim a delta when there is a previous period to compare against.
  const ticketDelta =
    previous > 0
      ? `${solved >= previous ? "+" : ""}${Math.round(((solved - previous) / previous) * 100)}%`
      : null;

  const sourceName = new Map(sources.map((s) => [s.id, s.name]));

  const daysOff: Record<number, string[]> = {};
  for (const row of offRows) {
    // `date` is a plain YYYY-MM-DD string, so the day is read off it directly
    // rather than through a Date, which would shift it by the timezone.
    const [year, month, day] = row.date.split("-").map(Number);
    if (year !== today.getFullYear() || month !== today.getMonth() + 1) continue;
    const name = plainName(row.userName || row.email || "Member");
    daysOff[day] = [...(daysOff[day] ?? []), name];
  }

  return {
    ticketsSolved: solved,
    ticketDelta,
    onShift: shiftRows.map((s) => ({
      id: s.userId,
      name: plainName(s.userName || s.email || "Member"),
      at: time(s.checkedInAt),
    })),
    memberCount: memberRows[0]?.value ?? 0,
    reviewTotal: reviewRows.reduce((sum, r) => sum + Number(r.n), 0),
    reviewsBySource: reviewRows.map((r) => ({
      // The card has room for a short label, so the source name is abbreviated
      // to its initials the way the frame draws TP / HA / GH.
      label: (sourceName.get(r.source) ?? r.source)
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      count: Number(r.n),
    })),
    news: newsRows.map((n) => ({
      slug: n.slug,
      title: n.title,
      meta: `${formatDate(n.createdAt)} · By ${plainName(n.authorName || "Member")}`,
      tag: n.tags[0] ?? null,
    })),
    notes: noteRows.map((n) => {
      const name = plainName(n.authorName || "Member");
      return {
        id: n.id,
        name,
        initials: initialsOf(name),
        tint: tintFor(name),
        at: ago(n.createdAt, now),
        // A titled note is a document, and its first line is a poor preview of
        // one, so the name stands in for it here.
        body: n.title || n.body,
      };
    }),
    daysOff,
    month: { year: today.getFullYear(), month: today.getMonth() },
    today: today.getDate(),
  };
}
