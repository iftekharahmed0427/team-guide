import type { Settings } from "./db.ts";

const DAY_MS = 86_400_000;

// The `periodDays`-long window that just ended at `end` (the run-now time):
// (start, end]. Used only for the report's range label + commissions window.
export function periodWindow(end: Date, cfg: Settings): { start: number; end: number } {
  const endMs = end.getTime();
  return { start: endMs - cfg.periodDays * DAY_MS, end: endMs };
}

export function formatRange(startMs: number, endMs: number): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(startMs)} – ${fmt(endMs)} (ET)`;
}
