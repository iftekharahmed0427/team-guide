"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Check } from "lucide-react";
import { setEnabled, requestRunNow } from "./actions";

export default function BotControls({
  enabled,
  hasToken,
}: {
  enabled: boolean;
  hasToken: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [togglePending, startToggle] = useTransition();
  const [runPending, startRun] = useTransition();
  const [ran, setRan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    const next = !on;
    setOn(next); // optimistic
    startToggle(async () => {
      const res = await setEnabled(next);
      if ("error" in res) {
        setOn(!next);
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

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
          <p className="text-sm font-medium">Posting enabled</p>
          <p className="text-xs text-muted">
            When off, the bot stays online but won&apos;t post reports.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          disabled={togglePending}
          className={`relative h-6 w-11 shrink-0 border transition-colors disabled:opacity-60 ${
            on ? "border-emerald-500/60 bg-emerald-500/30" : "border-border bg-surface-2"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 bg-foreground transition-all ${
              on ? "left-[1.5rem]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="text-sm font-medium">Run now</p>
          <p className="text-xs text-muted">
            Count the last period and post immediately (for testing).
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
