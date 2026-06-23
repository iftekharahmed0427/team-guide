"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check, Award } from "lucide-react";
import Avatar from "@/app/components/avatar";
import { formatUSD } from "@/app/(app)/payments/constants";
import { updateReviewBonus } from "./actions";

type Standing = { id: string; name: string; image: string | null; count: number };

const labelCls = "mb-1 block text-xs text-muted";
const inputCls =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40";

// Admin-only inline config for the review bonus rule, plus a live standings list
// of who is assigned how many reviews this period. The "more than N -> $X" rule
// drives each member's Payments bonus (see lib/reviews.ts + lib/payments.ts).
export default function ReviewBonusConfig({
  threshold,
  amount,
  standings,
}: {
  threshold: number;
  amount: number;
  standings: Standing[];
}) {
  const router = useRouter();
  const [thresholdText, setThresholdText] = useState(String(threshold));
  const [amountText, setAmountText] = useState(String(amount));
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const draftThreshold = Math.max(0, Math.floor(Number(thresholdText) || 0));
  const draftAmount = Math.max(0, Math.round((Number(amountText) || 0) * 100) / 100);
  const dirty = draftThreshold !== threshold || draftAmount !== amount;

  function save() {
    setDone(false);
    startTransition(async () => {
      await updateReviewBonus({ threshold: draftThreshold, amount: draftAmount });
      setDone(true);
      setTimeout(() => setDone(false), 3000);
      router.refresh();
    });
  }

  // Preview against the draft (not the saved) values so the admin sees the effect
  // of an edit before saving.
  const earning = standings.filter((s) => s.count >= draftThreshold).length;

  return (
    <div className="border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Award size={15} strokeWidth={1.75} />
        Review bonus
      </div>
      <p className="mt-1 text-xs text-muted">
        A member assigned {draftThreshold} or more reviews this period earns{" "}
        {formatUSD(draftAmount)}, added to their Payments amount.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className={labelCls}>At least (reviews)</label>
          <input
            type="text"
            inputMode="numeric"
            value={thresholdText}
            onChange={(e) => setThresholdText(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="10"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Bonus (USD)</label>
          <div className="flex items-center gap-1">
            <span className="text-muted">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="50"
              className={inputCls}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="btn-wipe flex h-9 shrink-0 items-center gap-2 border border-border px-4 text-sm text-foreground transition-colors disabled:cursor-not-allowed disabled:text-muted disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          ) : done ? (
            <Check size={15} strokeWidth={2} />
          ) : (
            <Save size={15} strokeWidth={1.75} />
          )}
          {done ? "Saved" : "Save"}
        </button>
      </div>

      {standings.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            This period · {earning} earning the bonus
          </p>
          <div className="flex flex-col gap-1">
            {standings.map((s) => {
              const earns = s.count >= draftThreshold;
              const toGo = Math.max(0, draftThreshold - s.count);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 border border-border bg-surface-2 px-3 py-1.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} image={s.image} size={22} />
                    <span className="text-sm">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-muted">{s.count}</span>
                    {earns ? (
                      <span className="border border-emerald-500/40 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        +{formatUSD(draftAmount)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted">{toGo} to go</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
