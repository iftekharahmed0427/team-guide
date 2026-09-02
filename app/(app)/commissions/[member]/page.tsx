import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import { initialsOf, tintFor } from "../../member";
import CommissionsHeader from "../commissions-header";
import CommissionCards from "../commission-cards";
import { commissionMembers } from "../commissions-data";
import { money } from "../commissions-shape";

// /commissions/[member] - one submitter's commissions, reached from the grid.
//
// Admin only. A member's own commissions are on /commissions itself, so this
// page never has to answer for a member who has submitted nothing: it used to
// notFound() on them, which is what a member with an empty tool saw.
//
// Laid out like the audit member detail it borrows from: the shared header, a
// divider, a back link beside a member pill, then a card per row.

export default async function CommissionMemberPage({
  params,
}: {
  params: Promise<{ member: string }>;
}) {
  const { member: segment } = await params;
  const key = decodeURIComponent(segment);

  // Payouts are private to the submitter, so the grid and everything behind it
  // is admin only. A member goes to /commissions, which is their own view.
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";
  if (!isAdmin) redirect("/commissions");

  const { members, total, pending } = await commissionMembers();
  const member = members.find((m) => m.key === key);
  if (!member) notFound();

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <CommissionsHeader total={total} pending={pending} />

      <div className="h-px w-full bg-[#243033]" />

      <div className="flex items-center justify-between gap-[24px]">
        <Link
          href="/commissions"
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
              {member.rows.length} commission
              {member.rows.length === 1 ? "" : "s"} · {money(member.earnings)}{" "}
              earned
            </p>
          </div>
        </div>
      </div>

      <CommissionCards
        rows={member.rows}
        isAdmin={isAdmin}
        empty="This member has no commissions."
      />
    </div>
  );
}
