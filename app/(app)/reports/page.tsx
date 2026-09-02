import Image from "next/image";
import Link from "next/link";
import {
  Award,
  Crown,
  History,
  List,
  Minus,
  Ticket,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { getStandings, type Entry, type Trend } from "./reports-data";

// /reports - the ticket leaderboard, built from the
// "reports-leaderboard-page" Figma frame (node 45:4): a hero counter, a
// three-place podium and the roster standings. Shell comes from
// app/layout.tsx.
//
// Reads the live channel counts, the same ones the old page shows, so the two
// agree. The podium is the top three and the roster is everyone after them; a
// team with fewer than three counted members simply has a shorter podium.
//
// Note this page uses a 24px gutter, where the other v2 pages use 32.

function TrendIcon({ trend }: { trend: Trend }) {
  const Icon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
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

export default async function ReportsPage() {
  const session = await getSession();
  const { entries, total, periodLabel, resetLabel } = await getStandings(
    session?.user.id ?? "",
  );

  // The frame draws the podium runner-up first, champion in the middle: the
  // display order is 2, 1, 3 while the ranking is 1, 2, 3.
  const top = entries.slice(0, 3);
  const podium = [top[1], top[0], top[2]]
    .map((entry, i) => (entry ? { entry, place: [2, 1, 3][i] } : null))
    .filter((p): p is { entry: Entry; place: number } => p !== null);
  const roster = entries.slice(3);
  const totalLabel = total.toLocaleString("en-US");

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
            <span className="text-[14px] font-bold text-[#8fb0a7]">
              {totalLabel} Tickets
            </span>
          </div>
          <Link
            href="/reports/history"
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
          <p className="text-[15px] font-normal text-[#94a3b8]">{periodLabel}</p>
        </div>
        <div className="relative flex shrink-0 flex-col items-end">
          <p className="text-[52px] font-black tracking-[-2px] text-[#e2e8f0]">
            {totalLabel}
          </p>
          <p className="text-[12px] font-bold text-[#8fb0a7] uppercase">Total solved</p>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <div className="flex items-center gap-[8px]">
          <Crown size={16} strokeWidth={2} className="text-[#8fb0a7]" />
          <p className="text-[16px] font-bold text-[#e2e8f0]">Current Podium Leads</p>
        </div>

        <div className="flex items-center gap-[16px]">
          {podium.map(({ entry: leader, place }) =>
            place === 1 ? (
              <div
                key={leader.id}
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
                  <p className="text-[32px] font-black text-[#e2e8f0]">{leader.count.toLocaleString("en-US")}</p>
                  <p className="text-[12px] font-bold text-[#8fb0a7] uppercase">tickets solved</p>
                </div>
                <span
                  className={`flex items-center gap-[6px] rounded-full border px-[10px] py-[6px] text-[12px] font-semibold drop-shadow-[0px_2px_4px_rgba(0,0,0,0.15)] ${PODIUM_TREND[leader.trend]}`}
                >
                  <TrendIcon trend={leader.trend} />
                  {leader.avgPerDay}/day avg
                </span>
              </div>
            ) : (
              <div
                key={leader.id}
                className="flex min-w-px flex-1 flex-col items-center justify-center gap-[8px] rounded-[16px] border border-[#243033]! bg-[#171e24] px-[16px] py-[14px] drop-shadow-[0px_2px_4px_rgba(0,0,0,0.2)]"
              >
                <span className="rounded-full border border-[#a3b18a]/40! bg-[#a3b18a]/10 px-[12px] py-[6px] text-[11px] font-extrabold text-[#a3b18a] drop-shadow-[0px_2px_4px_rgba(0,0,0,0.2)]">
                  RANK {place}
                </span>
                <div className="flex flex-col items-center gap-[6px]">
                  <span className="flex size-[40px] items-center justify-center rounded-full border-2 border-[#a3b18a]/40! bg-[#243033] text-[16px] font-bold text-[#e2e8f0]">
                    {leader.initials}
                  </span>
                  <p className="text-[18px] font-bold text-[#e2e8f0]">{leader.name}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[28px] font-extrabold text-[#e2e8f0]">{leader.count.toLocaleString("en-US")}</p>
                  <p className="text-[12px] font-semibold text-[#94a3b8] uppercase">
                    tickets solved
                  </p>
                </div>
                <span
                  className={`flex items-center gap-[6px] rounded-full border px-[10px] py-[6px] text-[12px] font-semibold drop-shadow-[0px_2px_4px_rgba(0,0,0,0.15)] ${PODIUM_TREND[leader.trend]}`}
                >
                  <TrendIcon trend={leader.trend} />
                  {leader.avgPerDay}/day avg
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
          {roster.length === 0 ? (
            <div className="flex flex-col items-center gap-[12px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[32px]">
              <Ticket size={20} strokeWidth={2} className="text-[#64748b]" />
              <p className="text-[13px] font-normal text-[#64748b]">
                {entries.length === 0
                  ? "No report channels yet, so nothing is being counted."
                  : "Everyone counted is on the podium."}
              </p>
            </div>
          ) : null}
          {roster.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between gap-[16px] rounded-[12px] border px-[16px] py-[8px] ${
                entry.isYou ? "border-[#8fb0a7]! bg-[#8fb0a7]/10" : "border-[#243033]! bg-[#171e24]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-[12px]">
                <span className="flex w-[28px] shrink-0 items-center justify-center text-[14px] font-bold text-[#94a3b8]">
                  #{i + 4}
                </span>
                <span
                  className={`flex size-[36px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    entry.isYou ? "bg-[#8fb0a7] text-[#0e1217]" : "bg-[#243033] text-[#e2e8f0]"
                  }`}
                >
                  {entry.initials}
                </span>
                <span className="flex min-w-0 flex-col gap-[2px]">
                  <span className="flex items-center gap-[8px]">
                    <span className="truncate text-[15px] font-semibold text-[#e2e8f0]">
                      {entry.name}
                    </span>
                    {entry.isYou ? (
                      <span className="shrink-0 rounded-[4px] bg-[#8fb0a7] px-[6px] py-px text-[10px] font-extrabold text-[#0e1217]">
                        YOU
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-[12px] font-normal text-[#64748b]">
                    {resetLabel}
                  </span>
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-[12px]">
                <span
                  className={`flex items-center gap-[6px] rounded-[6px] px-[8px] py-[4px] text-[12px] font-semibold ${ROSTER_TREND[entry.trend]}`}
                >
                  <TrendIcon trend={entry.trend} />
                  {entry.avgPerDay}/day avg
                </span>
                <span className="flex flex-col items-end gap-[2px]">
                  <span className="text-[18px] font-bold text-[#e2e8f0]">
                    {entry.count.toLocaleString("en-US")}
                  </span>
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
