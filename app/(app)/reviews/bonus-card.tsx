"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Gift, Loader2 } from "lucide-react";
import { updateReviewBonus } from "@/lib/actions/reviews";

// The review bonus card from the "reviews-page" frame (node 163:82): the rule,
// its two settings, and the team's progress toward the threshold.
//
// Wired to the live updateReviewBonus, which is admin-gated. The same rule is
// shown on /settings/pay-rules; this is the copy of it that sits where the
// reviews are actually logged.

export default function BonusCard({
  threshold: savedThreshold,
  amount: savedAmount,
  total,
}: {
  threshold: number;
  amount: number;
  /** Reviews logged in the current period, across every source. */
  total: number;
}) {
  const router = useRouter();
  const [threshold, setThreshold] = useState(String(savedThreshold));
  const [amount, setAmount] = useState(String(savedAmount));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await updateReviewBonus({ threshold: goal, amount: perMember });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const goal = Math.max(0, Number(threshold.replace(/[^0-9.]/g, "")) || 0);
  const perMember = Number(amount.replace(/[^0-9.]/g, "")) || 0;
  const remaining = Math.max(0, goal - total);
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;

  const label = "text-[11px] font-semibold text-[#64748b] uppercase";
  const box =
    "w-full rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[12px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] outline-none transition-colors focus:border-[#8fb0a7]!";

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[20px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
      <div className="flex items-start gap-[12px]">
        <span className="shrink-0 rounded-[8px] bg-[#243033] p-[8px]">
          <Gift size={16} strokeWidth={2} className="text-[#8fb0a7]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <p className="text-[16px] font-bold text-[#e2e8f0]">Review bonus</p>
          <p className="text-[13px] leading-[1.4] font-normal text-[#94a3b8]">
            When the team logs {goal} or more reviews this period, each ticked
            member earns{" "}
            {perMember.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
            .
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <div className="flex items-start gap-[12px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <label htmlFor="bonus-threshold" className={label}>
              Required Reviews
            </label>
            <input
              id="bonus-threshold"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              inputMode="numeric"
              className={box}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <label htmlFor="bonus-amount" className={label}>
              Bonus / Member
            </label>
            {/* The frame prints the $ beside the value rather than inside it. */}
            <div className="flex w-full items-center gap-[4px] rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[12px] py-[8px] transition-colors focus-within:border-[#8fb0a7]!">
              <span className="shrink-0 text-[13px] font-normal text-[#64748b]">
                $
              </span>
              <input
                id="bonus-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#e2e8f0] outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[6px] border border-[#243033]! bg-[#0e1217] py-[10px] text-[13px] font-semibold text-[#94a3b8] transition-colors hover:border-[#2f3d42]! hover:text-[#e2e8f0] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={13} strokeWidth={2} className="animate-spin" />
          ) : null}
          Update settings
        </button>

        {error ? (
          <p className="flex items-center gap-[6px] text-[12px] font-medium text-[#ef4444]">
            <AlertCircle size={12} strokeWidth={2} className="shrink-0" />
            {error}
          </p>
        ) : saved ? (
          <p className="flex items-center gap-[6px] text-[12px] font-semibold text-[#10b981]">
            <Check size={12} strokeWidth={2} className="shrink-0" />
            Saved.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center justify-between gap-[12px] text-[12px]">
          <p className="font-semibold text-[#94a3b8]">
            Team progress this period
          </p>
          <p className="font-bold text-[#e2e8f0]">
            {total} / {goal}
          </p>
        </div>
        {/* The frame leaves a 4px stub at zero rather than an empty track. */}
        <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#0e1217]">
          <div
            style={{ width: total === 0 ? "4px" : `${Math.max(pct, 1)}%` }}
            className="h-full rounded-full bg-[#8fb0a7]"
          />
        </div>
        <p className="text-[11px] font-normal text-[#64748b]">
          {remaining > 0
            ? `${remaining} more review${remaining === 1 ? "" : "s"} to unlock the bonus`
            : "The bonus is unlocked for this period"}
        </p>
      </div>
    </div>
  );
}
