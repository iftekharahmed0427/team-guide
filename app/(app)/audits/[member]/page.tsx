import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { initialsOf, tintFor } from "../../member";
import AuditsHeader from "../audits-header";
import { auditMembers, scoreColour } from "../audits-data";

// /audits/[member] - one member's audits, from the "audit-member-detail"
// Figma frame (node 146:118). Reached by clicking a card on the grid.
//
// The frame pads the page 40 rather than the 32 every other v2 page uses,
// including the audits grid this opens from. Kept at 32 so the padding does not
// jump when the card is clicked; everything inside is the frame's.

export default async function AuditMemberPage({
  params,
}: {
  params: Promise<{ member: string }>;
}) {
  const { member: segment } = await params;
  const { members, total } = await auditMembers();
  const member = members.find((m) => m.key === decodeURIComponent(segment));
  if (!member) notFound();

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[32px] p-[32px]">
      <AuditsHeader total={total} />

      <div className="h-px w-full bg-[#243033]" />

      <div className="flex items-center justify-between gap-[24px]">
        <Link
          href="/audits"
          className="flex shrink-0 items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] py-[8px] pr-[16px] pl-[12px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          All members
        </Link>

        <div className="flex min-w-0 shrink items-center gap-[12px] rounded-[100px] border border-[#243033]! bg-[#0f141a] px-[12px] py-[6px]">
          <span
            style={{ backgroundColor: tintFor(member.name) }}
            className="flex size-[32px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[#0e1217]"
          >
            {initialsOf(member.name)}
          </span>
          <div className="flex min-w-0 flex-col gap-[2px]">
            <p className="truncate text-[14px] font-bold text-[#e2e8f0]">
              {member.name}
            </p>
            <p className="truncate text-[12px] font-normal text-[#94a3b8]">
              {member.count} audit{member.count === 1 ? "" : "s"} ·{" "}
              {member.avgPct}% avg
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[16px]">
        {member.audits.map((row) => (
          <Link
            key={row.id}
            href={`/audits/${encodeURIComponent(member.key)}/${row.id}`}
            className="flex items-center justify-between gap-[24px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px] transition-colors hover:border-[#2f3d42]!"
          >
            <div className="flex min-w-0 flex-col gap-[6px]">
              <p className="truncate text-[16px] font-bold text-[#e2e8f0]">
                Ticket #{row.ticketNumber}
              </p>
              {row.ticketType ? (
                <p className="truncate text-[13px] font-normal text-[#64748b]">
                  {row.ticketType}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-[6px]">
              <div className="flex items-center gap-[6px]">
                <p className="text-[16px] font-bold text-[#e2e8f0]">
                  {row.score}/{row.possible}
                </p>
                <p className="text-[14px] font-normal text-[#64748b]">·</p>
                <p className={`text-[16px] font-bold ${scoreColour(row.pct)}`}>
                  {row.pct}%
                </p>
              </div>
              <p className="text-[12px] font-normal text-[#64748b]">
                {row.when}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
