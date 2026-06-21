"use client";

import { useEffect, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { setTicketOverride } from "./actions";

// Admin-editable ticket count for one member. Shows the live Reports count by
// default; typing a number stores a fixed override (which the server persists and
// the page re-renders from). A blank value or the revert button clears the
// override so the count tracks Reports again. Rendered as a text input with
// inputMode numeric so there are no up/down spinner arrows.
export default function TicketCell({
  userId,
  live,
  override,
}: {
  userId: string;
  live: number;
  override: number | null;
}) {
  const [value, setValue] = useState(String(override ?? live));
  const [pending, startTransition] = useTransition();

  // Re-sync when the server sends fresh data (live count or override changed).
  useEffect(() => {
    setValue(String(override ?? live));
  }, [override, live]);

  function clear() {
    startTransition(async () => {
      await setTicketOverride(userId, null);
    });
  }

  function commit() {
    const trimmed = value.trim();
    // Blank reverts to live tracking.
    if (trimmed === "") {
      if (override === null) return setValue(String(live));
      return clear();
    }
    const n = parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n < 0) return setValue(String(override ?? live));
    // No change from what's already stored / shown.
    if (override === null ? n === live : n === override) return setValue(String(n));
    startTransition(async () => {
      const res = await setTicketOverride(userId, n);
      if ("error" in res) setValue(String(override ?? live));
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {override !== null ? (
        <button
          type="button"
          title="Reset to live count"
          onClick={clear}
          disabled={pending}
          className="text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RotateCcw size={13} strokeWidth={1.75} />
        </button>
      ) : null}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        title={override !== null ? `Override (live: ${live})` : "Tracking live count"}
        className={`h-8 w-16 border bg-surface-2 px-2 text-right text-sm tabular-nums text-foreground outline-none focus:border-foreground/40 ${
          override !== null ? "border-foreground/40" : "border-border"
        }`}
      />
    </div>
  );
}
