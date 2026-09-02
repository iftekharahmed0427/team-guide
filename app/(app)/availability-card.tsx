"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toggleUnavailability } from "@/lib/availability-actions";

// The dashboard's availability card. Drawn from the "dashboard-main-page" Figma
// frame, and doing what the old calendar did: page between months, click a day
// to mark yourself unavailable, and see who else is off on the day you picked.
//
// A client component because all three of those are interactions. The month it
// opens on and the toggle are local state, so a click paints immediately and the
// server catches up on the refresh.

type Entry = { date: string; userId: string; userName: string };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

// Dates are plain YYYY-MM-DD strings end to end. Going through a Date would
// shift them by the viewer's offset and land the mark on the wrong day.
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const ICON_BADGE =
  "flex size-[20px] items-center justify-center rounded-[6px] border border-[#243033]! bg-[#0e1217] transition-colors hover:border-[#2f3d42]!";

export default function AvailabilityCard({
  entries,
  currentUserId,
}: {
  entries: Entry[];
  currentUserId: string;
}) {
  const router = useRouter();
  const now = new Date();
  const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate());

  const [view, setView] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  // Your own days are held locally so a click lands at once; everyone else's
  // come from the server and only change on a refresh.
  const [myDates, setMyDates] = useState<Set<string>>(
    () =>
      new Set(
        entries.filter((e) => e.userId === currentUserId).map((e) => e.date),
      ),
  );
  const [selected, setSelected] = useState<string>(todayStr);
  const [pending, startTransition] = useTransition();

  const othersByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of entries) {
      if (entry.userId === currentUserId) continue;
      map.set(entry.date, [...(map.get(entry.date) ?? []), entry.userName]);
    }
    return map;
  }, [entries, currentUserId]);

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    weeks.push([...week, ...Array<null>(7 - week.length).fill(null)]);
  }

  function changeMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function toggle(dateStr: string) {
    setSelected(dateStr);
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

  const selectedOthers = othersByDate.get(selected) ?? [];
  const selectedMine = myDates.has(selected);
  const [sy, sm, sd] = selected.split("-").map(Number);
  const selectedLabel = `${MONTHS[sm - 1]} ${sd}, ${sy}`;

  const away = [...(selectedMine ? ["You"] : []), ...selectedOthers];

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[12px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]">
      <div className="flex flex-col gap-[4px] pl-[12px]">
        <p className="text-[15px] font-bold text-[#e2e8f0]">Team availability</p>
        <p className="text-[12px] font-normal text-[#94a3b8]">
          Select a day to set your unavailability
        </p>
      </div>

      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-[8px] text-[14px] font-bold text-[#e2e8f0]">
            {MONTHS[view.month]} {view.year}
            {pending ? (
              <Loader2
                size={12}
                strokeWidth={2}
                className="animate-spin text-[#64748b]"
              />
            ) : null}
          </p>
          <div className="flex items-start gap-[8px]">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
              className={`cursor-pointer ${ICON_BADGE}`}
            >
              <ChevronLeft
                size={12}
                strokeWidth={2}
                className="block text-[#e2e8f0]"
              />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
              className={`cursor-pointer ${ICON_BADGE}`}
            >
              <ChevronRight
                size={12}
                strokeWidth={2}
                className="block text-[#e2e8f0]"
              />
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between text-center text-[11px] font-semibold text-[#64748b]">
          {WEEKDAYS.map((d, i) => (
            <span key={`${d}-${i}`} className="w-[28px]">
              {d}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-[6px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex items-start justify-between">
              {week.map((day, ci) => {
                if (day === null) {
                  return <span key={`${wi}-${ci}`} className="size-[28px]" />;
                }
                const dateStr = ymd(view.year, view.month, day);
                const isSelected = dateStr === selected;
                const mine = myDates.has(dateStr);
                const others = othersByDate.has(dateStr);
                return (
                  <button
                    key={`${wi}-${ci}`}
                    type="button"
                    onClick={() => toggle(dateStr)}
                    aria-label={`${MONTHS[view.month]} ${day}${mine ? ", you are unavailable" : ""}`}
                    aria-pressed={mine}
                    className={`flex size-[28px] cursor-pointer items-center justify-center rounded-full text-[12px] transition-colors ${
                      isSelected
                        ? "bg-[#8fb0a7] font-bold text-[#0f141a]"
                        : mine
                          ? "bg-[#8fb0a7]/[0.18] font-semibold text-[#8fb0a7]"
                          : others
                            ? "bg-[#ef4444]/[0.12] font-medium text-[#94a3b8]"
                            : "font-medium text-[#e2e8f0] hover:bg-white/[0.06]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-[12px]">
        <div className="h-px w-full bg-[#243033]" />
        <div className="flex items-center justify-between gap-[12px]">
          <div className="flex min-w-0 flex-col gap-[2px]">
            <p className="truncate text-[13px] font-semibold text-[#e2e8f0]">
              {selectedLabel}
            </p>
            {away.length === 0 ? (
              <p className="text-[11px] font-normal text-[#10b981]">
                Everyone available
              </p>
            ) : (
              <p
                title={away.join(", ")}
                className="truncate text-[11px] font-normal text-[#94a3b8]"
              >
                {away.join(", ")} away
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => toggle(selected)}
            disabled={pending}
            className="shrink-0 cursor-pointer rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[12px] py-[8px] text-[12px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]! disabled:cursor-default disabled:opacity-60"
          >
            {selectedMine ? "Mark me available" : "Mark me unavailable"}
          </button>
        </div>
        {/* The legend is typographic: the dots are gone and the two states are
            carried by the label styling itself. */}
        <div className="flex items-center gap-[16px]">
          <span className="text-[11px] font-semibold text-[#8fb0a7] underline decoration-solid">
            You
          </span>
          <span className="text-[11px] font-medium text-[#64748b] line-through decoration-solid">
            Others off
          </span>
        </div>
      </div>
    </div>
  );
}
