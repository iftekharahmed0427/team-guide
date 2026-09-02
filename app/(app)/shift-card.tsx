"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toggleShift } from "@/lib/shift-actions";

// The dashboard's shift card: who is on shift, and the button that puts you on
// or takes you off it.
//
// No polling of its own. The layout's LiveRefresh already re-renders this page
// whenever anyone checks in or out, because toggleShift calls notifyChange. A
// blind interval here would re-run every dashboard query on every open tab.

type OnShift = { id: string; name: string; at: string };

export default function ShiftCard({
  onShift,
  currentUserId,
}: {
  onShift: OnShift[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const meActive = onShift.some((m) => m.id === currentUserId);

  function toggle() {
    startTransition(async () => {
      await toggleShift();
      router.refresh();
    });
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[12px] overflow-hidden rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[4px]">
          <p className="text-[15px] font-bold text-[#e2e8f0]">Shift check-in</p>
          <p className="text-[12px] font-normal text-[#94a3b8]">
            Who is on shift right now
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-[6px] rounded-full bg-[#10b981]/[0.11] px-[10px] py-[4px]">
          <span className="size-[6px] rounded-full bg-[#10b981]" />
          <span className="text-[11px] font-bold text-[#10b981]">LIVE</span>
        </span>
      </div>

      <div className="v2-rail flex h-[120px] flex-col gap-[10px] overflow-y-auto">
        {onShift.length === 0 ? (
          <p className="text-[12px] font-normal text-[#64748b]">
            No one is on shift right now.
          </p>
        ) : (
          onShift.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <span className="flex min-w-0 items-center gap-[8px]">
                <span className="size-[6px] shrink-0 rounded-full bg-[#10b981]" />
                <span className="truncate text-[13px] font-semibold text-[#e2e8f0]">
                  {m.id === currentUserId ? "You" : m.name}
                </span>
              </span>
              <span className="shrink-0 text-[12px] font-normal text-[#64748b]">
                {m.at}
              </span>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="flex w-fit cursor-pointer items-center gap-[6px] text-[13px] font-semibold text-[#8fb0a7] transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        ) : null}
        {meActive ? "Check out" : "Check in"}
        {pending ? null : <ArrowRight size={14} strokeWidth={2} />}
      </button>
    </div>
  );
}
