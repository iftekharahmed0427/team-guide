"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { deleteReportPeriod } from "@/lib/actions/report-history";
import ConfirmDialog from "../../confirm-dialog";

// The trash button on an archived period, plus the confirmation it opens. A
// small client island so the history page can stay a server component.
//
// Deleting a period is real, cascading data loss: the period and every member
// row under it. The action is admin-only and the dialog names the period, so
// nobody confirms one they cannot see.

export default function DeletePeriod({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    setOpen(false);
    setError("");
    startTransition(async () => {
      const res = await deleteReportPeriod(id);
      if ("error" in res) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        aria-label={`Delete ${label}`}
        title={`Delete ${label}`}
        className="flex shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[#243033]! bg-white/[0.02] p-[8px] text-[#64748b] transition-colors hover:border-[#ef4444]! hover:text-[#ef4444] disabled:cursor-default disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        ) : (
          <Trash2 size={14} strokeWidth={2} />
        )}
      </button>

      {error ? (
        <span
          title={error}
          className="flex shrink-0 items-center gap-[6px] text-[12px] font-medium text-[#ef4444]"
        >
          <AlertCircle size={13} strokeWidth={2} />
          {error}
        </span>
      ) : null}

      <ConfirmDialog
        open={open}
        title="Delete this period?"
        description={`This cannot be undone. The archived period ${label} and every member row in it will be permanently deleted.`}
        confirmLabel="Delete period"
        onCancel={() => setOpen(false)}
        onConfirm={confirm}
      />
    </>
  );
}
