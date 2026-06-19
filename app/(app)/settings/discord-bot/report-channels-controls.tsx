"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Check, X } from "lucide-react";
import { resetAllReportChannels } from "./actions";

// "Reset all" closes the current period: it archives the standings into history,
// zeroes every channel, and (when something was archived) tells the bot to post
// that report. Counts only ever reset when an admin does it here or per channel.
export default function ReportChannelsControls({
  channelCount,
}: {
  channelCount: number;
}) {
  const router = useRouter();
  const [resetPending, startReset] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex items-center justify-between gap-4">
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
