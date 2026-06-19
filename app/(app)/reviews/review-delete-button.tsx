"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Check, X } from "lucide-react";
import { deleteReview } from "./actions";

// Delete a review (admin), with an inline confirm step.
export default function ReviewDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      await deleteReview(id);
      setConfirming(false);
      router.refresh();
    });
  }

  if (pending) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center border border-border bg-surface text-muted">
        <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={remove}
          aria-label="Confirm delete review"
          className="inline-flex h-7 w-7 items-center justify-center border border-red-500/40 bg-surface text-red-400 transition-colors hover:border-red-500/70"
        >
          <Check size={13} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label="Cancel delete"
          className="inline-flex h-7 w-7 items-center justify-center border border-border bg-surface text-muted transition-colors hover:text-foreground"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Delete review"
      className="inline-flex h-7 w-7 items-center justify-center border border-border bg-surface text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
    >
      <Trash2 size={13} strokeWidth={1.75} />
    </button>
  );
}
