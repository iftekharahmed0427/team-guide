"use client";

import { useMemo, useState } from "react";
import { ScrollText, Search } from "lucide-react";

// The log, with the two filters the live one lacks. Two hundred rows of "someone
// did something" is unreadable when you are looking for one change, so this
// filters by section and by free text over the actor, the phrase and the target.

export type Entry = {
  id: string;
  actor: string;
  phrase: string;
  target: string | null;
  group: string;
  when: string;
};

// The section labels, keyed by the part of an action key before the dot.
const GROUP_LABELS: Record<string, string> = {
  auth: "Sign-ins",
  audit: "Audits",
  news: "News",
  guide: "Guides",
  specialty: "Specialties",
  board: "Board",
  note: "Notes",
  commission: "Commissions",
  dispute: "Disputes",
  payment: "Payments",
  comp: "Pay periods",
  review: "Reviews",
  report_period: "Report periods",
  bot: "Discord bot",
  invite: "Invites",
  member: "Members",
};

const groupLabel = (group: string) => GROUP_LABELS[group] ?? group;

export default function ActivityList({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);

  // Only the sections that actually appear, most active first, so the filter row
  // never offers a chip that matches nothing.
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.group, (counts.get(e.group) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (group && e.group !== group) return false;
      if (!q) return true;
      return (
        e.actor.toLowerCase().includes(q) ||
        e.phrase.toLowerCase().includes(q) ||
        (e.target ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, query, group]);

  const chip =
    "cursor-pointer rounded-[6px] px-[10px] py-[5px] text-[12px] font-semibold transition-colors";

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center gap-[10px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[12px] transition-colors focus-within:border-[#8fb0a7]!">
        <Search size={16} strokeWidth={2} className="shrink-0 text-[#64748b]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the activity log"
          placeholder="Search by member, action or what was changed"
          className="min-w-0 flex-1 bg-transparent text-[14px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-[6px]">
        <button
          type="button"
          onClick={() => setGroup(null)}
          className={`${chip} ${
            group === null
              ? "bg-[#8fb0a7]/15 text-[#8fb0a7]"
              : "bg-[#171e24] text-[#94a3b8] hover:text-[#e2e8f0]"
          }`}
        >
          Everything
        </button>
        {groups.map(([key, n]) => (
          <button
            key={key}
            type="button"
            onClick={() => setGroup(key === group ? null : key)}
            className={`${chip} ${
              group === key
                ? "bg-[#8fb0a7]/15 text-[#8fb0a7]"
                : "bg-[#171e24] text-[#94a3b8] hover:text-[#e2e8f0]"
            }`}
          >
            {groupLabel(key)} {n}
          </button>
        ))}
      </div>

      <div className="flex flex-col rounded-[12px] border border-[#243033]! bg-[#171e24]">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-[16px] p-[48px]">
            <span className="rounded-full bg-[#0e1217] p-[16px]">
              <ScrollText
                size={24}
                strokeWidth={2}
                className="text-[#64748b]"
              />
            </span>
            <p className="text-[13px] font-normal text-[#64748b]">
              {entries.length === 0
                ? "No activity yet."
                : "Nothing here matches those filters."}
            </p>
          </div>
        ) : (
          shown.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-[16px] border-b border-[#243033]! px-[20px] py-[13px] last:border-0"
            >
              <p className="min-w-0 truncate text-[14px] font-normal text-[#94a3b8]">
                <span className="font-semibold text-[#e2e8f0]">
                  {entry.actor}
                </span>{" "}
                {entry.phrase}
                {entry.target ? (
                  <span className="text-[#e2e8f0]"> {entry.target}</span>
                ) : null}
              </p>
              <p className="shrink-0 text-[12px] font-normal text-[#64748b] tabular-nums">
                {entry.when}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
