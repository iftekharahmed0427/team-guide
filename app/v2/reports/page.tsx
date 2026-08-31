import Image from "next/image";
import Link from "next/link";
import { Award, Crown, History, List, Minus, TrendingDown, TrendingUp } from "lucide-react";

// /v2/reports - the redesign's ticket leaderboard, built from the
// "reports-leaderboard-page" Figma frame (node 45:4): a hero counter, a
// three-place podium and the roster standings. Shell comes from
// app/v2/layout.tsx.
//
// Content is the frame's placeholder copy - this is still the redesign canvas,
// so nothing here reads from the report tables. Note this page uses a 24px
// gutter, where the other v2 pages use 32.

type Trend = "up" | "down" | "flat";

type Leader = {
  place: 1 | 2 | 3;
  name: string;
  initials: string;
  count: string;
  avg: string;
  trend: Trend;
};

type Entry = {
  rank: number;
  name: string;
  initials: string;
  count: string;
  avg: string;
  trend: Trend;
  you?: boolean;
};

const RESET = "Reset Jul 31, 2026, 1:29 AM EDT";
const TEAM_TOTAL = "1,003";

// Ordered for display: runner-up, champion, third.
const PODIUM: Leader[] = [
  { place: 2, name: "Siren Vampy", initials: "SV", count: "334", avg: "25.7/day avg", trend: "up" },
  { place: 1, name: "OrewSegs", initials: "OS", count: "383", avg: "29.5/day avg", trend: "up" },
  { place: 3, name: "iiYoyo", initials: "IY", count: "121", avg: "9.3/day avg", trend: "down" },
];

const ROSTER: Entry[] = [
  { rank: 4, name: "Trinity™", initials: "TR", count: "90", avg: "6.9/day avg", trend: "up" },
  { rank: 5, name: "Farah", initials: "FA", count: "42", avg: "3.2/day avg", trend: "up" },
  { rank: 6, name: "Petrino", initials: "PE", count: "25", avg: "1.9/day avg", trend: "down" },
  { rank: 7, name: "Angeline", initials: "AN", count: "8", avg: "0.6/day avg", trend: "up" },
  {
    rank: 8,
    // The frame also suffixes the name with "(YOU)"; the badge says it already.
    name: "Conscience",
    initials: "CO",
    count: "0",
    avg: "0/day avg",
    trend: "flat",
    you: true,
  },
  { rank: 9, name: "FxMoon", initials: "FX", count: "0", avg: "0/day avg", trend: "flat" },
];

function TrendIcon({ trend }: { trend: Trend }) {
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return <Icon size={12} strokeWidth={2} className="shrink-0" />;
}

// The podium and roster badges use different fills for the same states.
const PODIUM_TREND: Record<Trend, string> = {
  up: "border-[#10b981]/20! bg-[#10b981]/[0.08] text-[#10b981]",
  down: "border-[#ef4444]/20! bg-[#ef4444]/[0.08] text-[#ef4444]",
  flat: "border-[#243033]! bg-[#243033] text-[#94a3b8]",
};

const ROSTER_TREND: Record<Trend, string> = {
  up: "bg-[#10b981]/[0.11] text-[#10b981]",
  down: "bg-[#ef4444]/[0.12] text-[#ef4444]",
  flat: "bg-[#243033] text-[#94a3b8]",
};

export default function V2ReportsPage() {
  return (
    <div className="flex flex-col gap-[16px] p-[24px]">
      <div className="flex items-center justify-between gap-[16px]">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Reports</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Live ticket counts for the current period
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-[16px]">
          <div className="flex items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[8px]">
            <span className="text-[13px] font-semibold text-[#94a3b8]">TEAM TOTAL</span>
            <span className="text-[14px] font-bold text-[#8fb0a7]">{TEAM_TOTAL} Tickets</span>
          </div>
          <Link
            href="/v2/reports/history"
            className="flex cursor-pointer items-center gap-[8px] rounded-[8px] bg-[#8fb0a7] px-[16px] py-[8px] transition-opacity hover:opacity-90"
          >
            <History size={14} strokeWidth={2} className="text-[#0e1217]" />
            <span className="text-[14px] font-semibold text-[#0e1217]">History</span>
          </Link>
        </div>
      </div>

      <div
        className="relative flex items-center justify-between gap-[24px] overflow-hidden rounded-[16px] border border-[#243033]! px-[24px] py-[20px]"
        style={{
          backgroundImage: "linear-gradient(173.2deg, rgb(23, 30, 36) 25%, rgb(15, 20, 26) 75%)",
        }}
      >
        {/* The frame's glow-mesh layer, exported to public/. */}
        <Image
          src="/Rectangle.png"
          alt=""
          fill
          priority
          aria-hidden
          className="pointer-events-none absolute inset-0 object-cover opacity-10"
        />
        <div className="relative flex min-w-0 flex-1 flex-col items-start gap-[8px]">
          <span className="rounded-full bg-[#8fb0a7]/10 px-[10px] py-[4px] text-[11px] font-bold text-[#8fb0a7] uppercase">
            Active Telemetry
          </span>
          <p className="text-[32px] leading-[40px] font-extrabold tracking-[-1px] text-[#e2e8f0]">
            Live Ticket Count
          </p>
          <p className="text-[15px] font-normal text-[#94a3b8]">
            Current period: since Jul 31, 2026 (13 days)
          </p>
        </div>
        <div className="relative flex shrink-0 flex-col items-end">
          <p className="text-[52px] font-black tracking-[-2px] text-[#e2e8f0]">{TEAM_TOTAL}</p>
          <p className="text-[12px] font-bold text-[#8fb0a7] uppercase">Total solved</p>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <div className="flex items-center gap-[8px]">
          <Crown size={16} strokeWidth={2} className="text-[#8fb0a7]" />
          <p className="text-[16px] font-bold text-[#e2e8f0]">Current Podium Leads</p>
        </div>

        <div className="flex items-center gap-[16px]">
          {PODIUM.map((leader) =>
            leader.place === 1 ? (
              <div
                key={leader.name}
                className="flex min-w-px flex-1 flex-col items-center justify-center gap-[8px] rounded-[16px] border-2 border-[#8fb0a7]! bg-[#1a222b] px-[20px] py-[14px] shadow-[0px_2px_10px_0px_rgba(0,0,0,0.25),0px_10px_28px_0px_rgba(0,0,0,0.5),0px_18px_48px_0px_rgba(143,176,167,0.2)]"
              >
                <span className="flex items-center gap-[8px] rounded-full border border-[#8fb0a7]! bg-[#8fb0a7]/10 px-[14px] py-[8px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.2),0px_10px_22px_0px_rgba(143,176,167,0.2)]">
                  <Award size={12} strokeWidth={2} className="text-[#8fb0a7]" />
                  <span className="text-[11px] font-black text-[#8fb0a7]">CHAMPION</span>
                </span>
                <div className="flex flex-col items-center gap-[6px]">
                  <span className="flex size-[48px] items-center justify-center rounded-full border-[3px] border-[#8fb0a7]! bg-[#243033] text-[16px] font-extrabold text-[#e2e8f0] drop-shadow-[0px_10px_12px_rgba(143,176,167,0.2)]">
                    {leader.initials}
                  </span>
                  <p className="text-[22px] font-extrabold text-[#e2e8f0]">{leader.name}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[32px] font-black text-[#e2e8f0]">{leader.count}</p>
                  <p className="text-[12px] font-bold text-[#8fb0a7] uppercase">tickets solved</p>
                </div>
                <span
                  className={`flex items-center gap-[6px] rounded-full border px-[10px] py-[6px] text-[12px] font-semibold drop-shadow-[0px_2px_4px_rgba(0,0,0,0.15)] ${PODIUM_TREND[leader.trend]}`}
                >
                  <TrendIcon trend={leader.trend} />
                  {leader.avg}
                </span>
              </div>
            ) : (
              <div
                key={leader.name}
                className="flex min-w-px flex-1 flex-col items-center justify-center gap-[8px] rounded-[16px] border border-[#243033]! bg-[#171e24] px-[16px] py-[14px] drop-shadow-[0px_2px_4px_rgba(0,0,0,0.2)]"
              >
                <span className="rounded-full border border-[#a3b18a]/40! bg-[#a3b18a]/10 px-[12px] py-[6px] text-[11px] font-extrabold text-[#a3b18a] drop-shadow-[0px_2px_4px_rgba(0,0,0,0.2)]">
                  RANK {leader.place}
                </span>
                <div className="flex flex-col items-center gap-[6px]">
                  <span className="flex size-[40px] items-center justify-center rounded-full border-2 border-[#a3b18a]/40! bg-[#243033] text-[16px] font-bold text-[#e2e8f0]">
                    {leader.initials}
                  </span>
                  <p className="text-[18px] font-bold text-[#e2e8f0]">{leader.name}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[28px] font-extrabold text-[#e2e8f0]">{leader.count}</p>
                  <p className="text-[12px] font-semibold text-[#94a3b8] uppercase">
                    tickets solved
                  </p>
                </div>
                <span
                  className={`flex items-center gap-[6px] rounded-full border px-[10px] py-[6px] text-[12px] font-semibold drop-shadow-[0px_2px_4px_rgba(0,0,0,0.15)] ${PODIUM_TREND[leader.trend]}`}
                >
                  <TrendIcon trend={leader.trend} />
                  {leader.avg}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center gap-[8px]">
          <List size={16} strokeWidth={2} className="text-[#94a3b8]" />
          <p className="text-[16px] font-bold text-[#e2e8f0]">Roster Standings</p>
        </div>

        <div className="flex flex-col gap-[4px]">
          {ROSTER.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center justify-between gap-[16px] rounded-[12px] border px-[16px] py-[8px] ${
                entry.you ? "border-[#8fb0a7]! bg-[#8fb0a7]/10" : "border-[#243033]! bg-[#171e24]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-[12px]">
                <span className="flex w-[28px] shrink-0 items-center justify-center text-[14px] font-bold text-[#94a3b8]">
                  #{entry.rank}
                </span>
                <span
                  className={`flex size-[36px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    entry.you ? "bg-[#8fb0a7] text-[#0e1217]" : "bg-[#243033] text-[#e2e8f0]"
                  }`}
                >
                  {entry.initials}
                </span>
                <span className="flex min-w-0 flex-col gap-[2px]">
                  <span className="flex items-center gap-[8px]">
                    <span className="truncate text-[15px] font-semibold text-[#e2e8f0]">
                      {entry.name}
                    </span>
                    {entry.you ? (
                      <span className="shrink-0 rounded-[4px] bg-[#8fb0a7] px-[6px] py-px text-[10px] font-extrabold text-[#0e1217]">
                        YOU
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-[12px] font-normal text-[#64748b]">{RESET}</span>
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-[12px]">
                <span
                  className={`flex items-center gap-[6px] rounded-[6px] px-[8px] py-[4px] text-[12px] font-semibold ${ROSTER_TREND[entry.trend]}`}
                >
                  <TrendIcon trend={entry.trend} />
                  {entry.avg}
                </span>
                <span className="flex flex-col items-end gap-[2px]">
                  <span className="text-[18px] font-bold text-[#e2e8f0]">{entry.count}</span>
                  <span className="text-[12px] font-normal text-[#94a3b8]">tickets</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
