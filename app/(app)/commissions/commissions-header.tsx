// The title bar both commissions pages share, in the shape every other v2
// header uses: the 28px title over a 14px caption, with a badge on the right.
// The badge counts what is waiting on an admin, the way the reviews header
// counts the period.
export default function CommissionsHeader({
  total,
  pending,
}: {
  total: number;
  pending: number;
}) {
  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex items-center justify-between gap-[24px]">
      <div className="flex min-w-0 flex-col gap-[6px]">
        <h1 className="text-[28px] font-bold text-[#e2e8f0]">Commissions</h1>
        <p className="text-[14px] font-normal text-[#94a3b8]">
          Renewal commissions submitted by the team
          {total ? ` · ${total}` : ""}
        </p>
      </div>
      <p
        className={`shrink-0 rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold ${
          pending ? "text-[#f59e0b]" : "text-[#8fb0a7]"
        }`}
      >
        {pending ? `${pending} awaiting review` : "All reviewed"}
      </p>
    </div>
  );
}
