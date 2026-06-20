"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Check, X } from "lucide-react";
import { deleteAudit } from "./actions";

// Delete an audit, with an inline confirm step (destructive). On success it
// returns to the audits list.
export default function DeleteAuditButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      await deleteAudit(id);
      router.push("/audits");
      router.refresh();
    });
  }

  if (pending) {
    return (
      <span className="inline-flex h-8 items-center gap-2 border border-border px-3 text-xs text-muted">
        <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
        Deleting
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={remove}
          className="inline-flex h-8 items-center gap-2 border border-red-500/40 px-3 text-xs font-medium text-red-400 transition-colors hover:border-red-500/70"
        >
          <Check size={14} strokeWidth={2} />
          Confirm delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label="Cancel delete"
          className="inline-flex h-8 w-8 items-center justify-center border border-border text-muted transition-colors hover:text-foreground"
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
      className="inline-flex h-8 items-center gap-2 border border-border px-3 text-xs text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
    >
      <Trash2 size={14} strokeWidth={1.75} />
      Delete
    </button>
  );
}
