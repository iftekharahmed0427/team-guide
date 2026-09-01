"use client";

import { useState } from "react";
import { updateReviewBonus } from "@/app/(app)/reviews/actions";
import { Field, SaveBar, useAction } from "../settings-controls";

// The review bonus rule, which until now was editable only inline on /reviews.
// The action is that page's, so the write, the log entry and the payments
// revalidation are unchanged.

export default function ReviewBonusForm({
  initial,
  logged,
}: {
  initial: { threshold: number; amount: number };
  logged: number;
}) {
  const { run, pending, error, saved } = useAction();
  const [threshold, setThreshold] = useState(String(initial.threshold));
  const [amount, setAmount] = useState(String(initial.amount));

  const t = Number(threshold);
  const a = Number(amount);
  const valid = Number.isFinite(t) && t >= 0 && Number.isFinite(a) && a >= 0;
  const dirty = t !== initial.threshold || a !== initial.amount;
  const met = logged >= (valid ? t : initial.threshold);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-start gap-[16px]">
        <Field
          id="bonus-threshold"
          label="Target"
          hint="Team total reviews needed in the period"
          value={threshold}
          disabled={pending}
          onChange={(v) => setThreshold(v.replace(/[^\d]/g, ""))}
        />
        <Field
          id="bonus-amount"
          label="Amount per member"
          hint="Paid to each eligible member once the target is met"
          value={amount}
          disabled={pending}
          onChange={(v) => setAmount(v.replace(/[^\d.]/g, ""))}
        />
      </div>

      <div className="flex items-center justify-between gap-[16px] rounded-[8px] bg-[#0e1217] p-[14px]">
        <p className="min-w-0 text-[13px] font-normal text-[#94a3b8]">
          This period so far
        </p>
        <p
          className={`shrink-0 text-[13px] font-bold ${met ? "text-[#10b981]" : "text-[#94a3b8]"}`}
        >
          {logged} logged
          {met
            ? ", target met"
            : valid
              ? `, ${Math.max(0, t - logged)} to go`
              : ""}
        </p>
      </div>

      <SaveBar
        pending={pending}
        error={error}
        saved={saved}
        disabled={!dirty || !valid}
        hint="Eligibility is per member, and stays on the Reviews page."
        onSave={() => run(() => updateReviewBonus({ threshold: t, amount: a }))}
      />
    </div>
  );
}
