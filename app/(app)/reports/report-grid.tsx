"use client";

import { useEffect, useState } from "react";
import Avatar from "@/app/components/avatar";

export type ReportEntry = {
  id: string;
  name: string;
  image: string | null;
  count: number;
  isYou: boolean;
};

// One rolling digit: clips a 0-9 strip and slides it to `d`. It starts at 0 and
// rolls up to its value on mount (the count-up intro), then rolls again whenever
// the value changes (a live update from the bot via the SSE refresh).
function Digit({ d }: { d: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(d);
  }, [d]);
  return (
    <span className="odo-digit">
      <span className="odo-strip" style={{ transform: `translateY(-${shown * 10}%)` }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="odo-cell">
            {i}
          </span>
        ))}
      </span>
    </span>
  );
}

function Odometer({ value }: { value: number }) {
  const digits = String(Math.max(0, Math.floor(value))).split("").map(Number);
  const places = digits.length - 1; // place index of the leftmost digit
  return (
    <span className="odo" aria-label={String(value)}>
      {digits.map((d, i) => (
        // Key by place value (right to left) so each wheel keeps its state when
        // the number grows a digit, instead of remounting and losing the roll.
        <Digit key={places - i} d={d} />
      ))}
    </span>
  );
}

function Card({ entry }: { entry: ReportEntry }) {
  const noun = entry.count === 1 ? "ticket" : "tickets";
  return (
    <div
      className={`relative flex w-62 flex-col items-center gap-2 border bg-surface p-5 ${
        entry.isYou ? "border-foreground" : "border-border"
      }`}
    >
      {entry.isYou ? (
        <span className="absolute right-2 top-2 border border-border px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
          You
        </span>
      ) : null}

      <Avatar name={entry.name} image={entry.image} size={40} />
      <p className="max-w-full truncate text-sm font-medium text-foreground">{entry.name}</p>

      <span className="text-4xl font-semibold tracking-tight tabular-nums">
        <Odometer value={entry.count} />
      </span>

      <span className="text-xs text-muted">{noun} this period</span>
    </div>
  );
}

export default function ReportGrid({ entries }: { entries: ReportEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="border border-border bg-surface px-5 py-16 text-center text-sm text-muted">
        No report channels yet. An admin can add them in Settings.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {entries.map((entry) => (
        <Card key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
