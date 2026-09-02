import Link from "next/link";
import Notifications from "./notifications";
import AvailabilityCard from "./availability-card";
import ShiftCard from "./shift-card";
import type { DashboardData } from "./dashboard-data";
import type { Notice } from "./notifications-data";
import SearchTrigger from "./search-trigger";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CircleCheck,
  FileText,
  Star,
  Users,
} from "lucide-react";

// The dashboard main area, built from the "dashboard-main-page" Figma frame
// (node 15:4): a top bar, four stat cards, then a two-column body - news and
// notes on the left, availability and shift check-in on the right.
//
// A server component. The two cards on the right are interactive, so they are
// client islands of their own rather than making this whole page one.

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

export default function Dashboard({
  data,
  notices,
  isAdmin,
  currentUserId,
}: {
  data: DashboardData;
  notices: Notice[];
  isAdmin: boolean;
  currentUserId: string;
}) {
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
          <SearchTrigger />
          <Notifications notices={notices} isAdmin={isAdmin} />
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
              <ViewAll href="/news" className="text-[13px]" />
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
                    href={`/news/${item.slug}`}
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
              <ViewAll href="/notes" className="text-[12px]" />
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

        {/* Right column: availability over shift check-in. Both are client
            components: every control in them is an interaction. */}
        <div className="flex w-[332px] shrink-0 flex-col gap-[16px]">
          <AvailabilityCard
            entries={data.offEntries}
            currentUserId={currentUserId}
          />
          <ShiftCard onShift={data.onShift} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
}
