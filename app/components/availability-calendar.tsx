"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toggleUnavailability } from "@/lib/availability-actions";

type Entry = { date: string; userId: string; userName: string | null };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function AvailabilityCalendar({
  entries,
  currentUserId,
}: {
  entries: Entry[];
  currentUserId: string;
}) {
  const router = useRouter();
  const now = new Date();
  const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate());

  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [myDates, setMyDates] = useState<Set<string>>(
    () =>
      new Set(
        entries.filter((e) => e.userId === currentUserId).map((e) => e.date),
      ),
  );
  const [selected, setSelected] = useState<string | null>(todayStr);
  const [pending, startTransition] = useTransition();

  const othersByDate = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of entries) {
      if (e.userId === currentUserId) continue;
      const list = m.get(e.date) ?? [];
      list.push(e.userName || "Member");
      m.set(e.date, list);
    }
    return m;
  }, [entries, currentUserId]);

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function changeMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function toggle(dateStr: string) {
    setMyDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
    startTransition(async () => {
      await toggleUnavailability(dateStr);
      router.refresh();
    });
  }

  function formatLong(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${MONTHS[m - 1]} ${d}, ${y}`;
  }

  const selectedNames = selected
    ? [
        ...(myDates.has(selected) ? ["You"] : []),
        ...(othersByDate.get(selected) ?? []),
      ]
    : [];

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">
          {MONTHS[view.month]} {view.year}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
            className="flex h-6 w-6 items-center justify-center border border-border text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
            className="flex h-6 w-6 items-center justify-center border border-border text-muted transition-colors hover:text-foreground"
          >
            <ChevronRight size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="pb-1 text-center text-[10px] font-medium uppercase text-muted">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = ymd(view.year, view.month, day);
          const mine = myDates.has(dateStr);
          const others = othersByDate.get(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(dateStr)}
              className={`relative flex h-7 items-center justify-center border text-[11px] transition-colors ${
                mine
                  ? "border-foreground bg-foreground font-medium text-background"
                  : isSelected
                    ? "border-foreground text-foreground"
                    : "border-border text-foreground hover:bg-surface-2"
              }`}
            >
              <span className={isToday ? "underline decoration-1 underline-offset-2" : undefined}>
                {day}
              </span>
              {!mine && others && others.length ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-400" />
              ) : null}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-3 border-t border-border pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">{formatLong(selected)}</span>
            <button
              type="button"
              onClick={() => toggle(selected)}
              disabled={pending}
              className="btn-wipe flex items-center gap-1 border border-border px-2 py-1 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-60"
            >
              {pending ? <Loader2 size={12} strokeWidth={2} className="animate-spin" /> : null}
              {myDates.has(selected) ? "Mark me available" : "Mark me unavailable"}
            </button>
          </div>
          <div className="mt-2 text-xs text-muted">
            {selectedNames.length ? (
              <span>
                Unavailable: <span className="text-foreground">{selectedNames.join(", ")}</span>
              </span>
            ) : (
              <span>Everyone available</span>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border border-foreground bg-foreground" /> You
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Others off
        </span>
      </div>
    </div>
  );
}
