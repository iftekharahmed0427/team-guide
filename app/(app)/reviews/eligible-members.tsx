"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { setReviewEligibility } from "@/lib/actions/reviews";
import Avatar from "../avatar";

// The eligible-members panel from the "reviews-page" frame (node 163:110). A
// tick marks a member as earning the bonus when the period hits its threshold.
//
// Toggling calls the live setReviewEligibility, which inserts or deletes the
// review_bonus_member row and is admin-gated. The tick moves straight away and
// is put back if the write fails, so a mis-click is visible rather than silent.

export type StaffMember = {
  id: string;
  name: string;
  image: string | null;
  eligible: boolean;
};

export default function EligibleMembers({
  members,
}: {
  members: StaffMember[];
}) {
  const router = useRouter();
  const [ticked, setTicked] = useState(
    () => new Set(members.filter((m) => m.eligible).map((m) => m.id)),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const flip = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function toggle(id: string) {
    const next = !ticked.has(id);
    setError("");
    setBusy(id);
    flip(id);
    startTransition(async () => {
      const res = await setReviewEligibility(id, next);
      setBusy(null);
      if ("error" in res) {
        flip(id);
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
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-start pb-[4px]">
        <p className="text-[12px] font-bold text-[#8fb0a7] uppercase">
          Eligible members
        </p>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#243033]! bg-[#171e24]">
        <div className="border-b border-[#243033]! bg-[#0e1217] p-[14px]">
          <p className="text-[13px] font-bold text-[#94a3b8]">
            Staff Members ({members.length})
          </p>
        </div>

        {members.map((member) => {
          const on = ticked.has(member.id);
          return (
            <button
              key={member.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={busy === member.id}
              onClick={() => toggle(member.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-[12px] border-b border-[#243033]! px-[14px] py-[10px] text-left transition-colors hover:bg-[#0e1217]/40 disabled:cursor-default"
            >
              <span className="flex min-w-0 items-center gap-[12px]">
                <Avatar
                  name={member.name}
                  image={member.image}
                  size={32}
                  textClassName="text-[12px]"
                />
                <span className="truncate text-[14px] font-medium text-[#e2e8f0]">
                  {member.name}
                </span>
              </span>

              <span
                className={`flex size-[18px] shrink-0 items-center justify-center rounded-[4px] transition-colors ${
                  on
                    ? "bg-[#10b981] text-[#0e1217]"
                    : "border-[1.5px] border-[#64748b]! bg-transparent"
                }`}
              >
                {busy === member.id ? (
                  <Loader2
                    size={11}
                    strokeWidth={2.5}
                    className="animate-spin text-[#8fb0a7]"
                  />
                ) : on ? (
                  <Check size={10} strokeWidth={3} />
                ) : null}
              </span>
            </button>
          );
        })}

        {members.length === 0 ? (
          <p className="p-[24px] text-center text-[13px] text-[#64748b]">
            No staff members yet.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="px-[14px] pb-[12px] text-[12px] font-medium text-[#ef4444]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
