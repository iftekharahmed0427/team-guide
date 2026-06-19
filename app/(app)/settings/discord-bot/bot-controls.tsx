"use client";

import { useState, useTransition } from "react";
import { Loader2, Play, Check } from "lucide-react";
import { requestRunNow } from "./actions";

// "Run now" is the manual trigger for a report. The bot never posts on its own;
// this and "Reset all" are the only ways it posts to Discord.
export default function BotControls({ hasToken }: { hasToken: boolean }) {
  const [runPending, startRun] = useTransition();
  const [ran, setRan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function runNow() {
    setError(null);
    setRan(false);
    startRun(async () => {
      const res = await requestRunNow();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setRan(true);
      setTimeout(() => setRan(false), 4000);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Run now</p>
          <p className="text-xs text-muted">
            Post a report to Discord immediately (for testing).
          </p>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={runPending || !hasToken}
          title={hasToken ? undefined : "Set a token first"}
          className="btn-wipe flex h-9 shrink-0 items-center gap-2 border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          {runPending ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          ) : ran ? (
            <Check size={15} strokeWidth={2} />
          ) : (
            <Play size={15} strokeWidth={2} />
          )}
          {ran ? "Requested" : "Run now"}
        </button>
      </div>

      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
