"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { reviewCommission } from "./actions";

const labelCls = "mb-1 block text-xs text-muted";
const inputCls =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40";

function formatUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function CommissionReview({
  c,
}: {
  c: {
    id: string;
    status: string;
    renewalDate: string | null;
    productPrice: number | null;
    commissionRate: number;
    reviewNote: string;
  };
}) {
  const router = useRouter();
  const [renewalDate, setRenewalDate] = useState(c.renewalDate ?? "");
  const [price, setPrice] = useState(c.productPrice != null ? String(c.productPrice) : "");
  const [rate, setRate] = useState(String(c.commissionRate ?? 15));
  const [note, setNote] = useState(c.reviewNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<"approved" | "denied" | null>(null);
  const [pending, startTransition] = useTransition();

  const priceNum = parseFloat(price);
  const rateNum = parseFloat(rate);
  const priceVal = Number.isFinite(priceNum) ? priceNum : 0;
  const rateVal = Number.isFinite(rateNum) ? rateNum : 0;
  const payout = (priceVal * rateVal) / 100;

  function decide(decision: "approved" | "denied") {
    setError(null);
    if (decision === "approved" && !(Number.isFinite(priceNum) && priceNum >= 0)) {
      return setError("Enter a product price before approving.");
    }
    setActive(decision);
    startTransition(async () => {
      const res = await reviewCommission({
        id: c.id,
        renewalDate: renewalDate || null,
        productPrice: Number.isFinite(priceNum) ? priceNum : 0,
        commissionRate: Number.isFinite(rateNum) ? rateNum : 0,
        decision,
        note,
      });
      setActive(null);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="border-t border-border p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Renewal date</label>
          <input
            type="date"
            value={renewalDate}
            onChange={(e) => setRenewalDate(e.target.value)}
            className={`${inputCls} [color-scheme:dark]`}
          />
        </div>
        <div>
          <label className={labelCls}>Product price</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className={`${inputCls} pl-6`}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Commission rate</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="15"
              className={`${inputCls} pr-7`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              %
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <label className={labelCls}>Note to member (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Shown to the member, e.g. the reason for a denial"
          className="w-full resize-none border border-border bg-surface-2 px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Commission:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatUSD(payout)}
          </span>
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            disabled={pending}
            className="btn-wipe flex h-9 w-28 items-center justify-center gap-2 border border-border text-sm font-medium text-foreground transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
          >
            <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center">
              {pending && active === "denied" ? (
                <Loader2 size={15} strokeWidth={2} className="animate-spin" />
              ) : (
                <X size={15} strokeWidth={2} />
              )}
            </span>
            Deny
          </button>
          <button
            type="button"
            onClick={() => decide("approved")}
            disabled={pending}
            className="btn-wipe btn-wipe-dark flex h-9 w-28 items-center justify-center gap-2 border border-border bg-foreground text-sm font-medium text-background disabled:opacity-50"
          >
            <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center">
              {pending && active === "approved" ? (
                <Loader2 size={15} strokeWidth={2} className="animate-spin" />
              ) : (
                <Check size={15} strokeWidth={2} />
              )}
            </span>
            Approve
          </button>
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
