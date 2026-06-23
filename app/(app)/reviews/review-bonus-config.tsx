"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check, Award } from "lucide-react";
import Avatar from "@/app/components/avatar";
import { formatUSD } from "@/app/(app)/payments/constants";
import { updateReviewBonus, setReviewEligibility } from "./actions";

type Member = { id: string; name: string; image: string | null; eligible: boolean };

const labelCls = "mb-1 block text-xs text-muted";
const inputCls =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40";

// Admin-only inline config for the review bonus: the team-total threshold and the
// per-member amount (editable), a live gate status, and the eligibility checklist
// of non-admin members. A ticked member earns the amount once the period's total
// reviews reach the threshold (see lib/reviews + lib/payments).
export default function ReviewBonusConfig({
  threshold,
  amount,
  totalReviews,
  members,
}: {
  threshold: number;
  amount: number;
  totalReviews: number;
  members: Member[];
}) {
  const router = useRouter();
  const [thresholdText, setThresholdText] = useState(String(threshold));
  const [amountText, setAmountText] = useState(String(amount));
  const [done, setDone] = useState(false);
  const [savePending, startSave] = useTransition();
  const [togglePending, startToggle] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const draftThreshold = Math.max(0, Math.floor(Number(thresholdText) || 0));
  const draftAmount = Math.max(0, Math.round((Number(amountText) || 0) * 100) / 100);
  const dirty = draftThreshold !== threshold || draftAmount !== amount;

  // Preview against the draft (unsaved) threshold so the admin sees the effect.
  const met = totalReviews >= draftThreshold;
  const remaining = Math.max(0, draftThreshold - totalReviews);
  const eligibleCount = members.filter((m) => m.eligible).length;

  function save() {
    setDone(false);
    startSave(async () => {
      await updateReviewBonus({ threshold: draftThreshold, amount: draftAmount });
      setDone(true);
      setTimeout(() => setDone(false), 3000);
      router.refresh();
    });
  }

  function toggle(m: Member) {
    setBusyId(m.id);
    startToggle(async () => {
      await setReviewEligibility(m.id, !m.eligible);
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <div className="border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Award size={15} strokeWidth={1.75} />
        Review bonus
      </div>
      <p className="mt-1 text-xs text-muted">
        When the team logs {draftThreshold} or more reviews this period, each ticked member earns{" "}
        {formatUSD(draftAmount)}.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className={labelCls}>Reviews required (team)</label>
          <input
            type="text"
            inputMode="numeric"
            value={thresholdText}
            onChange={(e) => setThresholdText(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="50"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Bonus per member (USD)</label>
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
          disabled={!dirty || savePending}
          className="btn-wipe flex h-9 shrink-0 items-center gap-2 border border-border px-4 text-sm text-foreground transition-colors disabled:cursor-not-allowed disabled:text-muted disabled:opacity-50"
        >
          {savePending ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          ) : done ? (
            <Check size={15} strokeWidth={2} />
          ) : (
            <Save size={15} strokeWidth={1.75} />
          )}
          {done ? "Saved" : "Save"}
        </button>
      </div>

      <div className="mt-3 border border-border bg-surface-2 px-3 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Team reviews this period</span>
          <span className="tabular-nums">
            {totalReviews} / {draftThreshold}
          </span>
        </div>
        <p className={`mt-1 text-xs ${met ? "text-emerald-400" : "text-muted"}`}>
          {met
            ? `Unlocked - ${eligibleCount} eligible member${eligibleCount === 1 ? "" : "s"} earn ${formatUSD(draftAmount)} each`
            : `${remaining} more review${remaining === 1 ? "" : "s"} to unlock the bonus`}
        </p>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
          Eligible members
        </p>
        {members.length === 0 ? (
          <p className="text-sm text-muted">No team members to show.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {members.map((m) => {
              const busy = togglePending && busyId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m)}
                  disabled={busy}
                  aria-pressed={m.eligible}
                  aria-label={`Toggle ${m.name} eligibility`}
                  className="flex items-center justify-between gap-3 border border-border bg-surface-2 px-3 py-1.5 text-left transition-colors hover:border-muted disabled:opacity-60"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} image={m.image} size={22} />
                    <span className="text-sm">{m.name}</span>
                  </div>
                  <span
                    className={`flex h-5 w-5 items-center justify-center border ${
                      m.eligible
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                        : "border-border text-transparent"
                    }`}
                  >
                    {busy ? (
                      <Loader2 size={12} strokeWidth={2} className="animate-spin text-muted" />
                    ) : (
                      <Check size={13} strokeWidth={2.5} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
