"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAudit } from "@/app/(app)/audits/actions";
import V2ConfirmDialog from "../confirm-dialog";

// Delete on an audit's review page. Admin-only, matching the action, and it
// takes the scores and any screenshots with it, so the confirmation says so.

export default function DeleteAudit({
  id,
  ticketNumber,
  memberName,
  backHref,
}: {
  id: string;
  ticketNumber: string;
  memberName: string;
  /** Where to land once it is gone: the member's list of audits. */
  backHref: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    setConfirming(false);
    setError("");
    startTransition(async () => {
      try {
        await deleteAudit(id);
      } catch {
        setError("Could not delete that audit.");
        return;
      }
      router.push(backHref);
      router.refresh();
    });
  }

  return (
    <>
      {error ? (
        <p className="self-center text-[13px] font-medium text-[#ef4444]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#ef4444]! bg-[#ef4444]/15 px-[20px] py-[10px] text-[14px] font-semibold text-[#ef4444] transition-colors hover:bg-[#ef4444]/25 disabled:cursor-default disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        ) : (
          <Trash2 size={14} strokeWidth={2} />
        )}
        Delete Audit
      </button>

      <V2ConfirmDialog
        open={confirming}
        title="Delete this audit?"
        description={`The audit of ticket #${ticketNumber} for ${memberName} will be permanently deleted, along with its scores and any screenshots. It also leaves ${memberName}'s average. This cannot be undone.`}
        confirmLabel="Delete audit"
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </>
  );
}
