import V2Notifications from "./v2-notifications";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileText,
  LogIn,
  Search,
  Star,
  Users,
} from "lucide-react";

// v2 dashboard main area, built from the "dashboard-main-page" Figma frame
// (node 15:4): a top bar, four stat cards, the news card, then availability /
// shift check-in / notes.
//
// Content is the frame's placeholder copy - this is still the redesign canvas,
// so nothing here reads from the database yet.

type Stat = {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  delta?: string;
  note: string;
};

const STATS: Stat[] = [
  { label: "Tickets solved", value: "990", icon: CircleCheck, delta: "+3%", note: "vs last period" },
  { label: "On shift now", value: "4 / 11", icon: Users, note: "Active operators checked in" },
  {
    label: "Reviews",
    value: "63",
    icon: Star,
    note: "16 Trustpilot · 46 HostAdvice · 1 Gravel Host",
  },
  {
    label: "Earnings this period",
    value: "$12,480",
    icon: CircleCheck,
    delta: "+8%",
    note: "vs last period",
  },
];

const NEWS = [
  { title: "Gravel Host Review Links", meta: "Aug 12 · By Angeline", tag: "Processes" },
  { title: "Security Verification Requirements", meta: "Aug 12 · By Angeline", tag: "Guidelines" },
  { title: "Services Terminated for Abuse Email.", meta: "Aug 12 · By Angeline", tag: "Guidelines" },
  { title: "DDoss Response", meta: "Aug 11 · By Angeline", tag: "Scripts" },
  {
    title: "Copyright infringement claims Team Response",
    meta: "Jul 18 · By Angeline",
    tag: "Copyright",
  },
];

const ON_SHIFT = [
  { name: "Angeline", at: "9:38 PM" },
  { name: "OrewSegs", at: "8:01 PM" },
  { name: "Trinity™", at: "11:37 PM" },
  { name: "Siren Vampy", at: "2:44 AM" },
];

const NOTES = [
  {
    initials: "A",
    tint: "#8fb0a7",
    name: "Angeline",
    at: "2h ago",
    body: "Hey gemini, Blast off Nahashi's lights",
  },
  {
    initials: "OS",
    tint: "#a78fb0",
    name: "OrewSegs",
    at: "5h ago",
    body: "Server migration scheduled for Friday 3AM UTC, please confirm availability",
  },
  {
    initials: "T",
    tint: "#b08f8f",
    name: "Trinity™",
    at: "Yesterday",
    body: "Updated the abuse response template, check the new version",
  },
  {
    initials: "SV",
    tint: "#8fa7b0",
    name: "Siren Vampy",
    at: "2d ago",
    body: "Backup verification complete, all systems green 🟢",
  },
  {
    initials: "A",
    tint: "#8fb0a7",
    name: "Angeline",
    at: "3d ago",
    body: "Q3 review meeting moved to Thursday",
  },
];

// Fixed so the canvas keeps matching the frame; becomes the real month once the
// calendar reads availability data.
const MONTH = { year: 2026, month: 7 }; // August 2026
const SELECTED_DAY = 13;
const YOU_OFF = [7];
const OTHERS_OFF = [21];

type DayCell = { day: number; inMonth: boolean };

// The frame's grid is drawn by hand and does not line up with real weekdays
// (it puts Aug 13 2026 on a Tuesday; it is a Thursday), so the cells are
// generated instead. A month can need six rows, which the frame's five do not.
function monthGrid({ year, month }: { year: number; month: number }): DayCell[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrev = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: DayCell[] = [];
  for (let i = lead - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
  for (let d = 1; cells.length % 7 !== 0; d++) cells.push({ day: d, inMonth: false });

  const rows: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const MONTH_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(Date.UTC(MONTH.year, MONTH.month, 1)));

const SELECTED_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(Date.UTC(MONTH.year, MONTH.month, SELECTED_DAY)));

const CARD = "rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]";
const ICON_BADGE = "rounded-[8px] bg-white/[0.03] p-[6px]";

// The frame writes these as a literal ">" glyph; lucide keeps it consistent
// with the rest of the iconography.
function ViewAll({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={`flex shrink-0 cursor-pointer items-center gap-[2px] font-semibold text-[#8fb0a7] transition-opacity hover:opacity-80 ${className}`}
    >
      View all
      <ChevronRight size={14} strokeWidth={2} />
    </button>
  );
}

export default function V2Dashboard() {
  const weeks = monthGrid(MONTH);

  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Dashboard</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">Overview of your team workspace</p>
        </div>
        <div className="flex shrink-0 items-center gap-[16px]">
          <div className="flex w-[280px] items-center gap-[10px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[14px] py-[10px]">
            <Search size={14} strokeWidth={2} className="shrink-0 text-[#94a3b8]" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-normal text-[#94a3b8]">
              Search news and guides
            </span>
          </div>
          <V2Notifications />
        </div>
      </div>

      <div className="flex items-start gap-[16px]">
        {STATS.map((stat) => {
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
                  <Icon size={14} strokeWidth={2} className="block text-[#e2e8f0]" />
                </span>
              </div>
              <div className="flex flex-col gap-[6px]">
                <p className="text-[28px] font-bold text-[#e2e8f0]">{stat.value}</p>
                {stat.delta ? (
                  <div className="flex items-center gap-[6px]">
                    <span className="flex items-center gap-[4px] rounded-[4px] bg-[#10b981]/[0.11] px-[6px] py-[2px]">
                      <ArrowUp size={10} strokeWidth={2} className="text-[#10b981]" />
                      <span className="text-[11px] font-bold text-[#10b981]">{stat.delta}</span>
                    </span>
                    <span className="text-[12px] font-normal text-[#94a3b8]">{stat.note}</span>
                  </div>
                ) : (
                  <p className="text-[12px] font-normal text-[#94a3b8]">{stat.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`flex flex-col gap-[12px] ${CARD}`}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-[4px]">
            <p className="text-[16px] font-bold text-[#e2e8f0]">Latest news</p>
            <p className="text-[13px] font-normal text-[#94a3b8]">
              Announcements and updates from the team
            </p>
          </div>
          <ViewAll className="text-[13px]" />
        </div>
        <div className="flex flex-col">
          {NEWS.map((item, i) => (
            <div key={item.title} className="flex flex-col">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-[12px] py-[10px] text-left"
              >
                <span className="flex min-w-0 flex-1 items-center gap-[10px]">
                  <span className={`shrink-0 rounded-[6px] bg-white/[0.03] p-[6px]`}>
                    <FileText size={16} strokeWidth={2} className="block text-[#8fb0a7]" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="truncate text-[13px] font-semibold text-[#e2e8f0]">
                      {item.title}
                    </span>
                    <span className="text-[12px] font-normal text-[#64748b]">{item.meta}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-[10px]">
                  <span className="rounded-full bg-[#8fb0a7]/[0.12] px-[8px] py-[3px] text-[10px] font-bold text-[#8fb0a7]">
                    {item.tag}
                  </span>
                  <ChevronRight size={14} strokeWidth={2} className="text-[#64748b]" />
                </span>
              </button>
              {i < NEWS.length - 1 ? <div className="h-px w-full bg-[#243033]" /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[370fr_370fr_328fr] items-stretch gap-[24px]">
        <div className={`flex flex-col gap-[12px] ${CARD}`}>
          <div className="flex flex-col gap-[4px] pl-[12px]">
            <p className="text-[15px] font-bold text-[#e2e8f0]">Team availability</p>
            <p className="text-[12px] font-normal text-[#94a3b8]">
              Select a day to set your unavailability
            </p>
          </div>

          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold text-[#e2e8f0]">{MONTH_LABEL}</p>
              <div className="flex items-start gap-[8px]">
                <button type="button" className={`cursor-pointer ${ICON_BADGE}`}>
                  <ChevronLeft size={12} strokeWidth={2} className="block text-[#e2e8f0]" />
                </button>
                <button type="button" className={`cursor-pointer ${ICON_BADGE}`}>
                  <ChevronRight size={12} strokeWidth={2} className="block text-[#e2e8f0]" />
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
                    const isSelected = cell.inMonth && cell.day === SELECTED_DAY;
                    const youOff = cell.inMonth && YOU_OFF.includes(cell.day);
                    const othersOff = cell.inMonth && OTHERS_OFF.includes(cell.day);
                    return (
                      <button
                        key={`${wi}-${ci}`}
                        type="button"
                        className={`relative flex size-[28px] cursor-pointer items-center justify-center rounded-full text-[12px] ${
                          isSelected
                            ? "bg-[#8fb0a7] font-bold text-[#0f141a]"
                            : cell.inMonth
                              ? "font-medium text-[#e2e8f0]"
                              : "font-medium text-[#64748b]"
                        }`}
                      >
                        {cell.day}
                        {youOff || othersOff ? (
                          <span
                            className="absolute bottom-px left-0 size-[3px] rounded-full"
                            style={{ background: youOff ? "#8fb0a7" : "#f59e0b" }}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-[12px]">
            <div className="h-px w-full bg-[#243033]" />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-[2px]">
                <p className="text-[13px] font-semibold text-[#e2e8f0]">{SELECTED_LABEL}</p>
                <p className="text-[11px] font-normal text-[#10b981]">Everyone available</p>
              </div>
              <button
                type="button"
                className="shrink-0 cursor-pointer rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[12px] py-[8px] text-[12px] font-semibold text-[#e2e8f0]"
              >
                Mark me unavailable
              </button>
            </div>
            <div className="flex items-center gap-[16px]">
              <span className="flex items-center gap-[6px]">
                <span className="size-[6px] rounded-full bg-[#64748b]" />
                <span className="text-[11px] font-normal text-[#94a3b8]">You</span>
              </span>
              <span className="flex items-center gap-[6px]">
                <span className="size-[6px] rounded-full bg-[#f59e0b]" />
                <span className="text-[11px] font-normal text-[#94a3b8]">Others off</span>
              </span>
            </div>
          </div>
        </div>

        <div className={`flex flex-col gap-[12px] ${CARD}`}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <p className="text-[15px] font-bold text-[#e2e8f0]">Shift check-in</p>
              <p className="text-[12px] font-normal text-[#94a3b8]">Who is on shift right now</p>
            </div>
            <span className="flex shrink-0 items-center gap-[6px] rounded-full bg-[#10b981]/[0.11] px-[10px] py-[4px]">
              <span className="size-[6px] rounded-full bg-[#10b981]" />
              <span className="text-[11px] font-bold text-[#10b981]">LIVE</span>
            </span>
          </div>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#0e1217] py-[10px]"
          >
            <LogIn size={14} strokeWidth={2} className="text-[#8fb0a7]" />
            <span className="text-[13px] font-semibold text-[#e2e8f0]">Check in</span>
          </button>
          <div className="flex flex-col gap-[10px]">
            {ON_SHIFT.map((m) => (
              <div key={m.name} className="flex items-center justify-between">
                <span className="flex items-center gap-[8px]">
                  <span className="size-[6px] rounded-full bg-[#10b981]" />
                  <span className="text-[13px] font-semibold text-[#e2e8f0]">{m.name}</span>
                </span>
                <span className="text-[12px] font-normal text-[#64748b]">{m.at}</span>
              </div>
            ))}
          </div>
        </div>

        {/* The frame gives notes a fixed-height wrapper and clips the card
            inside it, so a long thread never stretches the row. Absolute
            positioning reproduces that: the wrapper contributes no intrinsic
            height and stretches to whatever the other two cards need. */}
        <div className="relative">
          <div className={`absolute inset-0 flex flex-col gap-[12px] overflow-hidden ${CARD}`}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <p className="text-[15px] font-bold text-[#e2e8f0]">Notes</p>
              <p className="text-[12px] font-normal text-[#94a3b8]">Shared notes from the team</p>
            </div>
            <ViewAll className="text-[12px]" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-hidden">
            {NOTES.map((note, i) => (
              <div key={`${note.name}-${i}`} className="flex flex-col gap-[12px]">
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
                {i < NOTES.length - 1 ? <div className="h-px w-full bg-[#243033]" /> : null}
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
