"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Check, X } from "lucide-react";
import { deleteReportPeriod } from "./actions";

// Delete an archived period, with an inline confirm step (it is destructive and
// irreversible).
export default function DeletePeriodButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      await deleteReportPeriod(id);
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
          onClick={remove}
          aria-label="Confirm delete period"
          className="inline-flex h-7 w-7 items-center justify-center border border-red-500/40 text-red-400 transition-colors hover:border-red-500/70"
        >
          <Check size={14} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label="Cancel delete"
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
      aria-label="Delete period"
      title="Delete this period"
      className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
    >
      <Trash2 size={14} strokeWidth={1.75} />
    </button>
  );
}
