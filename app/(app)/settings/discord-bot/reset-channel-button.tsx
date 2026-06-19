"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2, Check, X } from "lucide-react";
import { resetReportChannel } from "./actions";

// Per-channel "reset count" control. Clicking arms a small confirm step (this is
// destructive: it zeroes the channel's tally and makes the bot start counting
// from now), then runs the server action.
export default function ResetChannelButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      await resetReportChannel(id);
      setConfirming(false);
      router.refresh();
    });
  }

  if (pending) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted">
        <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={reset}
          aria-label={`Confirm reset of ${name || "this channel"}'s count`}
          className="inline-flex h-7 w-7 items-center justify-center border border-amber-500/40 text-amber-400 transition-colors hover:border-amber-500/70"
        >
          <Check size={14} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label="Cancel reset"
          className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted transition-colors hover:text-foreground"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Reset channel count"
      title="Reset this channel's count"
      className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted transition-colors hover:border-amber-500/50 hover:text-amber-400"
    >
      <RotateCcw size={14} strokeWidth={1.75} />
    </button>
  );
}
