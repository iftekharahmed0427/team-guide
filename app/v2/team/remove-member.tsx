"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import V2ConfirmDialog from "../confirm-dialog";

// The Team roster's delete control: the frame's trash button plus the
// confirmation dialog it opens. A small client island so app/v2/team/page.tsx
// can stay a server component.
//
// Confirming only closes the dialog - v2 is still a canvas and does not mutate
// anything. The real removal lives in the live /team page's server action.

export default function RemoveMember({ name }: { name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Remove ${name}`}
        className="cursor-pointer rounded-[6px] p-[8px] text-[#64748b] transition-colors hover:bg-white/[0.03] hover:text-[#ef4444]"
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>
      <V2ConfirmDialog
        open={open}
        // The frame's copy says "The member"; naming them is clearer when the
        // dialog is opened from a specific row.
        description={`This action cannot be undone. ${name} will be permanently removed from the team workspace.`}
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}
