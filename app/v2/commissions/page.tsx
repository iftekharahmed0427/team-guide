import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { initialsOf, tintFor } from "../member";
import CommissionsHeader from "./commissions-header";
import SubmitCommission from "./submit-commission";
import { commissionMembers } from "./commissions-data";
import { money, statusTone } from "./commissions-shape";

// /v2/commissions - the renewal commission tool. No Figma frame draws it, so it
// is composed from the v2 design system: the audits directory for the member
// grid, the reviews log card for the submit form, and the audit scorecard's
// badge tones for the statuses.
//
// Reads the real commission table. The frames' admin view is what this renders -
// every submitter, not just your own - the way the audits grid does; the live
// page is the one that gates on the session.

// One row for as long as it fits. The grid takes a column per submitter so a
// fifth joining fills the row rather than starting a second one, capped at five
// before the cards get too narrow for a name and its status pills, and floored
// at three so a near-empty tool does not draw one card across the page.
//
// Spelled out rather than interpolated: Tailwind scans the source for class
// names, so `grid-cols-${n}` would never be generated.
const COLUMNS: Record<number, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

export default async function V2CommissionsPage() {
  // A member sees only their own payouts, so the grid of everyone is admin
  // only; a member is sent straight to their own page.
  const session = await getSession();
  if (session?.user.role !== "admin") {
    redirect(`/v2/commissions/${encodeURIComponent(session?.user.id ?? "")}`);
  }

  const { members, total, pending } = await commissionMembers();

  const card = "rounded-[12px] border border-[#243033]! bg-[#171e24]";
  const columns = COLUMNS[Math.min(5, Math.max(3, members.length))];

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <CommissionsHeader total={total} pending={pending} />

      <SubmitCommission />

      <div className="flex flex-col gap-[12px]">
        <div className="flex items-start pb-[4px]">
          <p className="text-[12px] font-bold text-[#8fb0a7] uppercase">
            Submitters
          </p>
        </div>

        {members.length === 0 ? (
          <p
            className={`p-[40px] text-center text-[13px] text-[#64748b] ${card}`}
          >
            No commissions submitted yet.
          </p>
        ) : (
          <div className={`grid gap-[16px] ${columns}`}>
            {members.map((member) => {
              const counts = [
                { n: member.pending, label: "pending", status: "pending" },
                { n: member.approved, label: "approved", status: "approved" },
                { n: member.denied, label: "denied", status: "denied" },
              ].filter((c) => c.n > 0);

              return (
                <Link
                  key={member.key}
                  href={`/v2/commissions/${encodeURIComponent(member.key)}`}
                  className={`group flex flex-col gap-[16px] p-[20px] transition-colors hover:border-[#2f3d42]! ${card}`}
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
                        {member.rows.length} commission
                        {member.rows.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ChevronRight
                      size={12}
                      strokeWidth={2}
                      className="shrink-0 text-[#64748b] transition-colors group-hover:text-[#e2e8f0]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-[6px]">
                    {counts.map((c) => (
                      <span
                        key={c.status}
                        className={`rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold ${statusTone(c.status)}`}
                      >
                        {c.n} {c.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-[#243033]! pt-[16px]">
                    <span className="text-[13px] font-normal text-[#94a3b8]">
                      Earnings
                    </span>
                    <span className="text-[16px] font-bold text-[#8fb0a7]">
                      {money(member.earnings)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
