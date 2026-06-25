"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { toggleShift } from "@/lib/shift-actions";

type Active = {
  userId: string;
  userName: string | null;
  checkedInAt: Date | string;
};

function formatTime(value: Date | string) {
  const d = new Date(value);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

export default function ShiftCheckin({
  active,
  currentUserId,
}: {
  active: Active[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // No polling here: the dashboard is a "live" page, so the layout's LiveRefresh
  // already re-renders it whenever anyone checks in/out (toggleShift calls
  // notifyChange). A blind setInterval(router.refresh) here re-ran all the
  // dashboard's queries every few seconds on every open tab - ~10.8k Vercel
  // invocations/day per always-open dashboard - which blew through the free tier.

  const meActive = active.some((a) => a.userId === currentUserId);

  function toggle() {
    startTransition(async () => {
      await toggleShift();
      router.refresh();
    });
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
        <span className="text-xs text-muted">{active.length} on shift</span>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`btn-wipe mt-3 flex h-10 w-full items-center justify-center gap-2 border border-border text-sm font-medium disabled:opacity-60 ${
          meActive
            ? "text-foreground"
            : "btn-wipe-dark bg-foreground text-background"
        }`}
      >
        {pending ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : meActive ? (
          <LogOut size={16} strokeWidth={2} />
        ) : (
          <LogIn size={16} strokeWidth={2} />
        )}
        {meActive ? "Check out" : "Check in"}
      </button>

      <div className="mt-3 flex flex-col gap-2">
        {active.length === 0 ? (
          <p className="text-xs text-muted">No one is on shift right now.</p>
        ) : (
          active.map((a) => (
            <div key={a.userId} className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span className="flex-1 truncate text-foreground">
                {a.userId === currentUserId ? "You" : a.userName || "Member"}
              </span>
              <span className="text-xs text-muted">{formatTime(a.checkedInAt)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
