"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Check, X } from "lucide-react";
import { setAutoReset, resetAllReportChannels } from "./actions";

// Auto-reset toggle + "Reset all" action for the Report channels section. Auto
// reset is the periodic (per-period) zeroing of the live counts; turn it off to
// keep counts accumulating and rely on the manual reset buttons instead.
export default function ReportChannelsControls({
  autoReset,
  channelCount,
}: {
  autoReset: boolean;
  channelCount: number;
}) {
  const router = useRouter();
  const [on, setOn] = useState(autoReset);
  const [togglePending, startToggle] = useTransition();
  const [resetPending, startReset] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    const next = !on;
    setOn(next); // optimistic
    startToggle(async () => {
      const res = await setAutoReset(next);
      if ("error" in res) {
        setOn(!next);
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function resetAll() {
    setError(null);
    startReset(async () => {
      const res = await resetAllReportChannels();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Auto-reset each period</p>
          <p className="text-xs text-muted">
            When off, counts keep accumulating until you reset a channel manually.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Auto-reset each period"
          onClick={toggle}
          disabled={togglePending}
          className={`inline-flex h-6 w-11 shrink-0 items-center border transition-colors disabled:opacity-60 ${
            on ? "border-emerald-500/60 bg-emerald-500/30" : "border-border bg-surface-2"
          }`}
        >
          <span
            className={`h-4 w-4 bg-foreground transition-transform ${
              on ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
        <div>
          <p className="text-sm font-medium">Reset all channels</p>
          <p className="text-xs text-muted">
            Zero every channel and start counting from now.
          </p>
        </div>
        {confirming ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetAll}
              disabled={resetPending}
              className="flex h-9 items-center gap-2 border border-amber-500/40 px-3 text-sm font-medium text-amber-400 transition-colors hover:border-amber-500/70 disabled:opacity-60"
            >
              {resetPending ? (
                <Loader2 size={15} strokeWidth={2} className="animate-spin" />
              ) : (
                <Check size={15} strokeWidth={2} />
              )}
              Confirm reset
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={resetPending}
              aria-label="Cancel reset all"
              className="inline-flex h-9 w-9 items-center justify-center border border-border text-muted transition-colors hover:text-foreground disabled:opacity-60"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={channelCount === 0}
            className="btn-wipe flex h-9 shrink-0 items-center gap-2 border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            <RotateCcw size={15} strokeWidth={2} />
            Reset all
          </button>
        )}
      </div>

      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
