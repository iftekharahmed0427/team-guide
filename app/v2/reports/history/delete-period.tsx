"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import V2ConfirmDialog from "../../confirm-dialog";

// The trash button on an archived period, plus the confirmation it opens. A
// small client island so the history page can stay a server component.
//
// Confirming only closes the dialog. Deleting a period is real, cascading data
// loss (the period and every entry under it), and v2 does not mutate anything
// yet; the live /reports/history page owns that action.

export default function DeletePeriod({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${label}`}
        title={`Delete ${label}`}
        className="flex shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[#243033]! bg-white/[0.02] p-[8px] text-[#64748b] transition-colors hover:border-[#ef4444]! hover:text-[#ef4444]"
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>
      <V2ConfirmDialog
        open={open}
        description={`This action cannot be undone. The archived period ${label} and every member row in it would be permanently deleted.`}
        confirmLabel="Delete"
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}
