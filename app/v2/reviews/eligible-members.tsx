"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { initialsOf, tintFor } from "../member";

// The eligible-members panel from the "reviews-page" frame (node 163:110). A
// tick marks a member as earning the bonus when the period hits its threshold.
//
// Toggling is local: the live /reviews page owns toggleBonusMember, which
// inserts or deletes the review_bonus_member row and is admin-gated.

export type StaffMember = { id: string; name: string; eligible: boolean };

export default function EligibleMembers({
  members,
}: {
  members: StaffMember[];
}) {
  const [ticked, setTicked] = useState(
    () => new Set(members.filter((m) => m.eligible).map((m) => m.id)),
  );

  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
              onClick={() => toggle(member.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-[12px] border-b border-[#243033]! px-[14px] py-[10px] text-left transition-colors hover:bg-[#0e1217]/40"
            >
              <span className="flex min-w-0 items-center gap-[12px]">
                <span
                  style={{ backgroundColor: tintFor(member.name) }}
                  className="flex size-[32px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-[#0e1217]"
                >
                  {initialsOf(member.name)}
                </span>
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
                {on ? <Check size={10} strokeWidth={3} /> : null}
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
    </div>
  );
}
