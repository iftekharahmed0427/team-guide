import Link from "next/link";
import { Plus } from "lucide-react";

// The title bar both audits frames share - "audits-page" (node 146:7) and
// "audit-member-detail" (node 146:119). The count is every audit, not the
// member's, on both. New audit opens the scorecard form.
export default function AuditsHeader({ total }: { total: number }) {
  return (
    <div className="flex items-center justify-between gap-[24px]">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[28px] font-bold text-[#e2e8f0]">Audits</h1>
        <p className="text-[14px] font-normal text-[#94a3b8]">
          Support ticket QA reviews{total ? ` · ${total}` : ""}
        </p>
      </div>
      <Link
        href="/audits/new"
        className="flex shrink-0 items-center gap-[8px] rounded-[8px] bg-[#8fb0a7] px-[16px] py-[10px] text-[14px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8]"
      >
        <Plus size={14} strokeWidth={2} />
        New audit
      </Link>
    </div>
  );
}
