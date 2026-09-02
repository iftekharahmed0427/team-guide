import Link from "next/link";
import V2Notifications from "./v2-notifications";
import type { DashboardData } from "./dashboard-data";
import V2SearchTrigger from "./search-trigger";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileText,
  Star,
  Users,
} from "lucide-react";

// v2 dashboard main area, built from the "dashboard-main-page" Figma frame
// (node 15:4): a top bar, four stat cards, then a two-column body - news and
// notes on the left, availability and shift check-in on the right.
//
// Reads the real tables the live dashboard reads, so the two agree. The
// calendar follows the current month rather than the frame's fixed August,
// and marks the days someone has said they are unavailable.

type Stat = {
  label: string;
  value: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  delta?: string;
  note?: string;
  /** Per-source counts, shown as pills instead of a note line. */
  sources?: { count: string; label: string }[];
};

type DayCell = { day: number; inMonth: boolean };

// The frame's grid is drawn by hand and does not line up with real weekdays
// (it puts Aug 13 2026 on a Tuesday; it is a Thursday), so the cells are
// generated instead. A month can need six rows, which the frame's five do not.
function monthGrid({
  year,
  month,
}: {
  year: number;
  month: number;
}): DayCell[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrev = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: DayCell[] = [];
  for (let i = lead - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
  for (let d = 1; cells.length % 7 !== 0; d++)
    cells.push({ day: d, inMonth: false });

  const rows: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const SELECTED_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const CARD = "rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]";
const ICON_BADGE = "rounded-[8px] bg-white/[0.03] p-[6px]";

// The frame writes these as a literal ">" glyph; lucide keeps it consistent
// with the rest of the iconography.
function ViewAll({
  href,
  className = "",
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 cursor-pointer items-center gap-[2px] font-semibold text-[#8fb0a7] transition-opacity hover:opacity-80 ${className}`}
    >
      View all
      <ChevronRight size={14} strokeWidth={2} />
    </Link>
  );
}

export default function V2Dashboard({ data }: { data: DashboardData }) {
  const weeks = monthGrid(data.month);
  const monthLabel = MONTH_FORMAT.format(
    new Date(Date.UTC(data.month.year, data.month.month, 1)),
  );
  const todayLabel = SELECTED_FORMAT.format(
    new Date(Date.UTC(data.month.year, data.month.month, data.today)),
  );

  const stats: Stat[] = [
    {
      label: "Tickets solved",
      value: data.ticketsSolved.toLocaleString("en-US"),
      icon: CircleCheck,
      // Only shown when there is a previous period to compare against.
      delta: data.ticketDelta ?? undefined,
      note: data.ticketDelta ? "vs last period" : "this period",
    },
    {
      label: "On shift now",
      value: `${data.onShift.length} / ${data.memberCount}`,
      icon: Users,
      note: "Active operators checked in",
    },
    {
      label: "Reviews",
      value: String(data.reviewTotal),
      icon: Star,
      sources: data.reviewsBySource.map((s) => ({
        count: String(s.count),
        label: s.label,
      })),
    },
    {
      label: "Team members",
      value: String(data.memberCount),
      icon: Users,
      note: "With workspace access",
    },
  ];

  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Dashboard</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Overview of your team workspace
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-[16px]">
          <V2SearchTrigger />
          <V2Notifications />
        </div>
      </div>

      <div className="flex items-start gap-[16px]">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`flex min-h-[146px] flex-1 flex-col gap-[12px] ${CARD}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-[0.44px] text-[#94a3b8] uppercase">
                  {stat.label}
                </p>
                <span className={ICON_BADGE}>
                  <Icon
                    size={14}
                    strokeWidth={2}
                    className="block text-[#e2e8f0]"
                  />
                </span>
              </div>
              <div className="flex flex-col gap-[6px]">
                <p className="text-[28px] font-bold text-[#e2e8f0]">
                  {stat.value}
                </p>
                {stat.delta ? (
                  <div className="flex items-center gap-[6px]">
                    {/* The frame only draws the rising case; a real delta can
                        fall, and showing that in green under an up arrow would
                        read as good news. */}
                    {(() => {
                      const down = stat.delta.startsWith("-");
                      const Arrow = down ? ArrowDown : ArrowUp;
                      const tone = down ? "#ef4444" : "#10b981";
                      return (
                        <span
                          className="flex items-center gap-[4px] rounded-[4px] px-[6px] py-[2px]"
                          style={{ backgroundColor: `${tone}1c` }}
                        >
                          <Arrow
                            size={10}
                            strokeWidth={2}
                            style={{ color: tone }}
                          />
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: tone }}
                          >
                            {stat.delta}
                          </span>
                        </span>
                      );
                    })()}
                    <span className="text-[12px] font-normal text-[#94a3b8]">
                      {stat.note}
                    </span>
                  </div>
                ) : stat.sources ? (
                  <div className="flex items-center gap-[8px] text-[11px]">
                    {stat.sources.map((s) => (
                      <span
                        key={s.label}
                        className="flex items-center gap-[6px] rounded-[4px] bg-white/[0.03] px-[6px] py-[2px]"
                      >
                        <span className="font-bold text-[#e2e8f0]">
                          {s.count}
                        </span>
                        <span className="font-medium text-[#94a3b8]">
                          {s.label}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] font-normal text-[#94a3b8]">
                    {stat.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-[24px]">
        {/* Left column: news over notes. */}
        <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
          <div className={`flex flex-col gap-[12px] ${CARD}`}>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-[4px]">
                <p className="text-[16px] font-bold text-[#e2e8f0]">
                  Latest news
                </p>
                <p className="text-[13px] font-normal text-[#94a3b8]">
                  Announcements and updates from the team
                </p>
              </div>
              <ViewAll href="/v2/news" className="text-[13px]" />
            </div>
            <div className="flex flex-col">
              {data.news.length === 0 ? (
                <p className="py-[10px] text-[13px] font-normal text-[#64748b]">
                  No posts yet.
                </p>
              ) : null}
              {data.news.map((item, i) => (
                <div key={item.slug} className="flex flex-col">
                  <Link
                    href={`/v2/news/${item.slug}`}
                    className="flex w-full cursor-pointer items-center gap-[12px] py-[10px] text-left"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-[10px]">
                      <span className="shrink-0 rounded-[6px] bg-white/[0.03] p-[6px]">
                        <FileText
                          size={16}
                          strokeWidth={2}
                          className="block text-[#8fb0a7]"
                        />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                        <span className="truncate text-[13px] font-semibold text-[#e2e8f0]">
                          {item.title}
                        </span>
                        <span className="text-[12px] font-normal text-[#64748b]">
                          {item.meta}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-[10px]">
                      {item.tag ? (
                        <span className="rounded-full bg-[#8fb0a7]/[0.12] px-[8px] py-[3px] text-[10px] font-bold text-[#8fb0a7]">
                          {item.tag}
                        </span>
                      ) : null}
                      <ChevronRight
                        size={14}
                        strokeWidth={2}
                        className="text-[#64748b]"
                      />
                    </span>
                  </Link>
                  {i < data.news.length - 1 ? (
                    <div className="h-px w-full bg-[#243033]" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* The frame fixes this card to the news card's height and clips the
              thread rather than letting it grow. */}
          <div
            className={`flex h-[351px] flex-col gap-[12px] overflow-hidden ${CARD}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-[4px]">
                <p className="text-[15px] font-bold text-[#e2e8f0]">Notes</p>
                <p className="text-[12px] font-normal text-[#94a3b8]">
                  Shared notes from the team
                </p>
              </div>
              <ViewAll href="/v2/notes" className="text-[12px]" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-hidden">
              {data.notes.length === 0 ? (
                <p className="text-[13px] font-normal text-[#64748b]">
                  No notes yet.
                </p>
              ) : null}
              {data.notes.map((note, i) => (
                <div key={note.id} className="flex flex-col gap-[12px]">
                  <div className="flex items-start gap-[12px]">
                    <span
                      className="flex size-[32px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-[#0f141a]"
                      style={{ background: note.tint }}
                    >
                      {note.initials}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
                      <span className="flex items-center justify-between gap-[8px]">
                        <span className="truncate text-[13px] font-semibold text-[#e2e8f0]">
                          {note.name}
                        </span>
                        <span className="shrink-0 text-[12px] font-normal text-[#94a3b8]">
                          {note.at}
                        </span>
                      </span>
                      <span className="text-[13px] leading-[1.4] font-normal text-[#e2e8f0]">
                        {note.body}
                      </span>
                    </span>
                  </div>
                  {i < data.notes.length - 1 ? (
                    <div className="h-px w-full bg-[#243033]" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: availability over shift check-in. */}
        <div className="flex w-[332px] shrink-0 flex-col gap-[16px]">
          <div className={`flex flex-col gap-[12px] ${CARD}`}>
            <div className="flex flex-col gap-[4px] pl-[12px]">
              <p className="text-[15px] font-bold text-[#e2e8f0]">
                Team availability
              </p>
              <p className="text-[12px] font-normal text-[#94a3b8]">
                Select a day to set your unavailability
              </p>
            </div>

            <div className="flex flex-col gap-[10px]">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold text-[#e2e8f0]">
                  {monthLabel}
                </p>
                <div className="flex items-start gap-[8px]">
                  <button
                    type="button"
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
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={`${d}-${i}`} className="w-[28px]">
                    {d}
                  </span>
                ))}
              </div>

              <div className="flex flex-col gap-[6px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex items-start justify-between">
                    {week.map((cell, ci) => {
                      const isSelected =
                        cell.inMonth && cell.day === data.today;
                      const isOff = cell.inMonth && !!data.daysOff[cell.day];
                      return (
                        <button
                          key={`${wi}-${ci}`}
                          type="button"
                          className={`flex size-[28px] cursor-pointer items-center justify-center rounded-full text-[12px] ${
                            isSelected
                              ? "bg-[#8fb0a7] font-bold text-[#0f141a]"
                              : isOff
                                ? "bg-[#ef4444]/[0.12] font-medium text-[#94a3b8]"
                                : cell.inMonth
                                  ? "font-medium text-[#e2e8f0]"
                                  : "font-medium text-[#64748b]"
                          }`}
                        >
                          {cell.day}
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
                <div className="flex flex-col gap-[2px]">
                  <p className="text-[13px] font-semibold text-[#e2e8f0]">
                    {todayLabel}
                  </p>
                  <p className="text-[11px] font-normal text-[#10b981]">
                    Everyone available
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 cursor-pointer rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[12px] py-[8px] text-[12px] font-semibold text-[#e2e8f0]"
                >
                  Mark me unavailable
                </button>
              </div>
              {/* The legend is typographic now: the dots are gone and the two
                  states are carried by the label styling itself. */}
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

          <div className={`flex flex-col gap-[12px] overflow-hidden ${CARD}`}>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-[4px]">
                <p className="text-[15px] font-bold text-[#e2e8f0]">
                  Shift check-in
                </p>
                <p className="text-[12px] font-normal text-[#94a3b8]">
                  Who is on shift right now
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-[6px] rounded-full bg-[#10b981]/[0.11] px-[10px] py-[4px]">
                <span className="size-[6px] rounded-full bg-[#10b981]" />
                <span className="text-[11px] font-bold text-[#10b981]">
                  LIVE
                </span>
              </span>
            </div>

            <div className="flex h-[120px] flex-col gap-[10px] overflow-hidden">
              {data.onShift.map((m) => (
                <div key={m.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-[8px]">
                    <span className="size-[6px] rounded-full bg-[#10b981]" />
                    <span className="text-[13px] font-semibold text-[#e2e8f0]">
                      {m.name}
                    </span>
                  </span>
                  <span className="text-[12px] font-normal text-[#64748b]">
                    {m.at}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="flex cursor-pointer items-center gap-[6px] text-[13px] font-semibold text-[#8fb0a7] transition-opacity hover:opacity-80"
            >
              Check in
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
