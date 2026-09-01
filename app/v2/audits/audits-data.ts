import { desc } from "drizzle-orm";
import { db } from "@/db";
import { audit } from "@/db/app-schema";
import { formatDateTime } from "@/lib/datetime";
import { plainName } from "../member";

// Shared by the audits grid and the member detail behind it: both frames show
// the same total in the subtitle, and the detail page needs the same per-member
// totals the grid card shows.

export type AuditRow = {
  id: string;
  ticketNumber: string;
  ticketType: string;
  score: number;
  possible: number;
  pct: number;
  when: string;
};

export type AuditMember = {
  /** Route segment, and the grid's React key. */
  key: string;
  name: string;
  count: number;
  /** Over the summed scores, not the mean of each audit's own percentage. */
  avgPct: number;
  audits: AuditRow[];
};

export const pct = (score: number, possible: number): number =>
  possible > 0 ? Math.round((score / possible) * 100) : 0;

// The bands the live /audits page scores by. Only the >= 90 colour is in the
// frames; the other two are the palette's warning and danger tones.
export function scoreColour(value: number): string {
  if (value >= 90) return "text-[#10b981]";
  if (value >= 70) return "text-[#f59e0b]";
  return "text-[#ef4444]";
}

/** Every audit, grouped by member, ordered the way both frames show them. */
export async function auditMembers(): Promise<{
  members: AuditMember[];
  total: number;
}> {
  const rows = await db
    .select({
      id: audit.id,
      ticketNumber: audit.ticketNumber,
      ticketType: audit.ticketType,
      memberId: audit.memberId,
      memberName: audit.memberName,
      totalScore: audit.totalScore,
      possibleScore: audit.possibleScore,
      createdAt: audit.createdAt,
    })
    .from(audit)
    .orderBy(desc(audit.createdAt));

  // An audit can be logged against a name with no account, so fall back to the
  // name as the key the way the live page does.
  const acc = new Map<
    string,
    { name: string; total: number; possible: number; audits: AuditRow[] }
  >();
  for (const row of rows) {
    const name = plainName(row.memberName || "Member");
    const key = row.memberId || `name:${name}`;
    const member = acc.get(key) ?? { name, total: 0, possible: 0, audits: [] };
    member.total += row.totalScore;
    member.possible += row.possibleScore;
    member.audits.push({
      id: row.id,
      ticketNumber: row.ticketNumber,
      ticketType: row.ticketType,
      score: row.totalScore,
      possible: row.possibleScore,
      pct: pct(row.totalScore, row.possibleScore),
      when: formatDateTime(row.createdAt),
    });
    acc.set(key, member);
  }

  const members = [...acc.entries()]
    .map(([key, m]) => ({
      key,
      name: m.name,
      count: m.audits.length,
      avgPct: pct(m.total, m.possible),
      audits: m.audits,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { members, total: rows.length };
}

// The reviewer pastes the Tickets bot transcript link as a last line of the
// summary ("Ticket URL: https://..."). The frame lifts it out into its own
// plate, so split it off here rather than rendering it twice. Only some audits
// carry one; the plate is dropped when there is none.
const TRAILING_URL = /\n*[ \t]*Ticket URL:[ \t]*(\S+)[ \t]*$/i;

export function splitSummary(summary: string): { body: string; url: string | null } {
  const match = summary.match(TRAILING_URL);
  if (!match) return { body: summary.trim(), url: null };
  return { body: summary.slice(0, match.index).trim(), url: match[1] };
}

// A criterion's badge in the review. The frame shows four of the five states -
// full marks and "Yes" in green, a part score in sage, N/A muted, and a zeroed
// one-pointer ("No") in red - so a zeroed five-pointer takes the same red.
export function badgeTone(
  na: boolean,
  score: number,
  maxPoints: number,
): string {
  if (na) return "bg-[#64748b]/10 text-[#64748b]";
  if (score >= maxPoints) return "bg-[#10b981]/15 text-[#10b981]";
  if (score <= 0) return "bg-[#ef4444]/15 text-[#ef4444]";
  return "bg-[#a3b18a]/15 text-[#a3b18a]";
}

// Five-pointers read as a fraction, one-pointers as Yes / No.
export function badgeLabel(
  na: boolean,
  score: number,
  maxPoints: number,
): string {
  if (na) return "N/A";
  if (maxPoints === 1) return score >= 1 ? "Yes" : "No";
  return `${score}/${maxPoints}`;
}
