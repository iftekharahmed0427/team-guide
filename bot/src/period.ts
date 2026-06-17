import type { Settings } from "./db.ts";

const DAY_MS = 86_400_000;

function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Is `now`'s UTC date a period boundary (a Friday whose distance from the anchor
// is a whole number of periods)? The anchor is itself a period-end Friday, so
// every date PERIOD_DAYS apart is also a boundary. The Friday guard makes the
// spec explicit and is robust if PERIOD_DAYS is ever changed off a 7-multiple.
export function isPeriodEnd(now: Date, cfg: Settings): boolean {
  const anchor = Date.parse(`${cfg.periodAnchor}T00:00:00Z`);
  const today = utcMidnight(now);
  const diffDays = Math.round((today - anchor) / DAY_MS);
  const onBoundary = ((diffDays % cfg.periodDays) + cfg.periodDays) % cfg.periodDays === 0;
  return onBoundary && new Date(today).getUTCDay() === 5;
}

// The 14-day window that just ended at `end` (the fire time): (start, end].
export function periodWindow(end: Date, cfg: Settings): { start: number; end: number } {
  const endMs = end.getTime();
  return { start: endMs - cfg.periodDays * DAY_MS, end: endMs };
}

export function formatRange(startMs: number, endMs: number): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(startMs)} – ${fmt(endMs)} (UTC)`;
}
