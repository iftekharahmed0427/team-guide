import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { initialsOf, tintFor } from "../member";
import AuditsHeader from "./audits-header";
import { auditMembers, scoreColour } from "./audits-data";

// /v2/audits - the QA scorecard directory from the "audits-page" Figma frame
// (node 146:6): the title bar with the audit count, and a three-column grid of
// member cards, each with their audit count and average score. The card's
// chevron opens that member's audits, drawn in "audit-member-detail".
//
// Reads the real audit table, like the rest of v2 now does. The frames draw the
// admin view - every member, not just your own - so that is what this renders;
// the live /audits page is the one that gates on the session.

export default async function V2AuditsPage() {
  const { members, total } = await auditMembers();

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <AuditsHeader total={total} />

      {members.length === 0 ? (
        <p className="rounded-[12px] border border-[#243033]! bg-[#171e24] p-[40px] text-center text-[13px] text-[#64748b]">
          No audits yet.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-[16px]">
          {members.map((member) => (
            <Link
              key={member.key}
              href={`/v2/audits/${encodeURIComponent(member.key)}`}
              className="group flex flex-col gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px] transition-colors hover:border-[#2f3d42]!"
            >
              <div className="flex items-center gap-[12px]">
                <span
                  style={{ backgroundColor: tintFor(member.name) }}
                  className="flex size-[36px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[#0f141a]"
                >
                  {initialsOf(member.name)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <p className="truncate text-[15px] font-semibold text-[#e2e8f0]">
                    {member.name}
                  </p>
                  <p className="text-[13px] font-normal text-[#94a3b8]">
                    {member.count} audit{member.count === 1 ? "" : "s"}
                  </p>
                </div>
                <ChevronRight
                  size={12}
                  strokeWidth={2}
                  className="shrink-0 text-[#64748b] transition-colors group-hover:text-[#e2e8f0]"
                />
              </div>

              <div className="flex items-center justify-between border-t border-[#243033]! pt-[16px]">
                <span className="text-[13px] font-normal text-[#94a3b8]">
                  Average score
                </span>
                <span
                  className={`text-[16px] font-bold ${scoreColour(member.avgPct)}`}
                >
                  {member.avgPct}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
