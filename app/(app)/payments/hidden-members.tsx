"use client";

import { useState, useTransition } from "react";
import Avatar from "../avatar";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { setMemberHidden } from "@/lib/actions/payments";

// Members an admin has taken off the payroll sheet. They still count in
// Reports; this only excludes them from payments and its totals.

export type HiddenMember = {
  userId: string;
  name: string;
  image: string | null;
  role: string;
};

export default function HiddenMembers({
  members,
}: {
  members: HiddenMember[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function restore(userId: string) {
    setError("");
    setBusy(userId);
    startTransition(async () => {
      const res = await setMemberHidden(userId, false);
      setBusy(null);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]">
      <p className="text-[11px] font-bold tracking-[0.44px] text-[#94a3b8] uppercase">
        Hidden from payments ({members.length})
      </p>

      {members.length === 0 ? (
        <p className="text-[13px] font-normal text-[#64748b]">
          Nobody is hidden. A hidden member stays in Reports but is left out of
          this sheet and its totals.
        </p>
      ) : null}

      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center justify-between gap-[16px]"
        >
          <div className="flex min-w-0 items-center gap-[12px]">
            <Avatar
              name={member.name}
              image={member.image}
              size={28}
              textClassName="text-[11px]"
            />
            <div className="flex min-w-0 flex-col gap-[2px]">
              <p className="truncate text-[14px] font-semibold text-[#94a3b8]">
                {member.name}
              </p>
              <p className="truncate text-[11px] font-normal text-[#64748b]">
                {member.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy === member.userId}
            onClick={() => restore(member.userId)}
            className="flex shrink-0 cursor-pointer items-center gap-[4px] rounded-[6px] border border-[#243033]! bg-white/[0.03] px-[12px] py-[6px] text-[12px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]! disabled:cursor-default disabled:opacity-60"
          >
            {busy === member.userId ? (
              <Loader2 size={12} strokeWidth={2} className="animate-spin" />
            ) : (
              <RotateCcw size={12} strokeWidth={2} className="text-[#94a3b8]" />
            )}
            Restore
          </button>
        </div>
      ))}

      {error ? (
        <p className="text-[12px] font-medium text-[#ef4444]">{error}</p>
      ) : null}
    </div>
  );
}
