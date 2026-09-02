"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Loader2,
  MessageSquare,
  Pencil,
  X,
} from "lucide-react";
import { reviewCommission } from "@/app/(app)/commissions/actions";
import { money, type CommissionRow as Row } from "../commissions-shape";

// One commission, three to a row. At that width the stats sit two by two rather
// than in a single strip, and the card spans the whole row while it is being
// reviewed so the pricing controls keep the space they need - the Edit-in-place
// pattern the payment history cards use, widened.
//
// Approve and Deny call the live reviewCommission, which is admin-gated. The
// payout recomputes as the price and rate are typed, so the arithmetic is
// visible before the decision is made.

type Props = {
  row: Row & { renewalLabel: string | null };
  /** Pricing and the decision are an admin job; a member only reads. */
  isAdmin: boolean;
  statusClass: string;
  statusText: string;
};

export default function CommissionRow({
  row,
  isAdmin,
  statusClass,
  statusText,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Approve and Deny are the same write with a different decision: the action
  // stores the pricing either way, so a denied commission keeps the numbers it
  // was judged on.
  function decide(decision: "approved" | "denied") {
    setError("");
    startTransition(async () => {
      const res = await reviewCommission({
        id: row.id,
        renewalDate: renewal || null,
        productPrice: num(price),
        commissionRate: num(rate),
        decision,
        note,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }
  const [price, setPrice] = useState(
    row.price === null ? "" : String(row.price),
  );
  const [rate, setRate] = useState(String(row.rate));
  const [renewal, setRenewal] = useState(row.renewal ?? "");
  const [note, setNote] = useState(row.note);

  const num = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;
  const payout = editing ? (num(price) * num(rate)) / 100 : row.payout;

  const statLabel = "text-[11px] font-semibold text-[#64748b] uppercase";
  const statValue = "text-[14px] font-semibold text-[#e2e8f0]";
  const input =
    "w-full rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[12px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] outline-none transition-colors focus:border-[#8fb0a7]!";

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div
      className={`flex flex-col gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] ${
        editing ? "col-span-3 p-[24px]" : "p-[20px]"
      }`}
    >
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[10px]">
          <p
            title={row.ticketName}
            className="min-w-0 flex-1 truncate text-[16px] font-bold text-[#e2e8f0]"
          >
            {row.ticketName}
          </p>
          <span
            className={`shrink-0 rounded-[6px] px-[10px] py-[4px] text-[13px] font-semibold ${statusClass}`}
          >
            {statusText}
          </span>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              aria-label={editing ? "Stop editing" : `Edit ${row.ticketName}`}
              className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[#243033]! bg-[#0e1217] text-[#94a3b8] transition-colors hover:border-[#2f3d42]! hover:text-[#e2e8f0]"
            >
              {editing ? (
                <X size={14} strokeWidth={2} />
              ) : (
                <Pencil size={14} strokeWidth={2} />
              )}
            </button>
          ) : null}
        </div>
        <p
          title={row.customerEmail}
          className="truncate text-[13px] font-normal text-[#64748b]"
        >
          {row.customerEmail}
        </p>
      </div>

      <div className="h-px w-full bg-[#243033]" />

      {editing ? (
        <div className="flex flex-col gap-[16px]">
          <div className="flex items-start gap-[12px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
              <label htmlFor={`price-${row.id}`} className={statLabel}>
                Product price
              </label>
              <div className="flex items-center gap-[4px] rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[12px] py-[8px] transition-colors focus-within:border-[#8fb0a7]!">
                <span className="shrink-0 text-[13px] font-normal text-[#64748b]">
                  $
                </span>
                <input
                  id={`price-${row.id}`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
              <label htmlFor={`rate-${row.id}`} className={statLabel}>
                Commission rate
              </label>
              <div className="flex items-center gap-[4px] rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[12px] py-[8px] transition-colors focus-within:border-[#8fb0a7]!">
                <input
                  id={`rate-${row.id}`}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  inputMode="decimal"
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#e2e8f0] outline-none"
                />
                <span className="shrink-0 text-[13px] font-normal text-[#64748b]">
                  %
                </span>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
              <label htmlFor={`renewal-${row.id}`} className={statLabel}>
                Renewal date
              </label>
              <input
                id={`renewal-${row.id}`}
                type="date"
                value={renewal}
                onChange={(e) => setRenewal(e.target.value)}
                className={input}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
              <p className={statLabel}>Payout</p>
              <p className="rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[12px] py-[8px] text-[13px] font-bold text-[#8fb0a7]">
                {money(payout)}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-[8px] rounded-[6px] border border-[#243033]! bg-[#0e1217] px-[16px] py-[10px] transition-colors focus-within:border-[#8fb0a7]!">
            <MessageSquare
              size={14}
              strokeWidth={2}
              className="shrink-0 text-[#64748b]"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label={`${row.ticketName} review note`}
              placeholder="Note for the submitter (optional)"
              className="min-w-0 flex-1 bg-transparent text-[12px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
            />
          </div>

          <div className="flex items-center justify-end gap-[12px]">
            {error ? (
              <p className="mr-auto flex min-w-0 items-center gap-[6px] text-[12px] font-medium text-[#ef4444]">
                <AlertCircle size={13} strokeWidth={2} className="shrink-0" />
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => decide("denied")}
              disabled={pending}
              className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#ef4444]! bg-[#ef4444]/15 px-[20px] py-[10px] text-[14px] font-semibold text-[#ef4444] transition-colors hover:bg-[#ef4444]/25 disabled:cursor-default disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : (
                <X size={14} strokeWidth={2.5} />
              )}
              Deny
            </button>
            <button
              type="button"
              onClick={() => decide("approved")}
              disabled={pending}
              className="flex cursor-pointer items-center gap-[8px] rounded-[8px] bg-[#10b981] px-[20px] py-[10px] text-[14px] font-bold text-[#0e1217] transition-colors hover:bg-[#34d399] disabled:cursor-default disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : (
                <Check size={14} strokeWidth={2.5} />
              )}
              Approve
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-[16px] gap-y-[12px]">
            <div className="flex min-w-0 flex-col gap-[4px]">
              <p className={statLabel}>Renewal</p>
              <p className={statValue}>{row.renewalLabel ?? "—"}</p>
            </div>
            <div className="flex min-w-0 flex-col gap-[4px]">
              <p className={statLabel}>Product price</p>
              <p className={statValue}>
                {row.price === null ? "—" : money(row.price)}
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-[4px]">
              <p className={statLabel}>Rate</p>
              <p className={statValue}>{row.rate}%</p>
            </div>
            <div className="flex min-w-0 flex-col gap-[4px]">
              <p className={statLabel}>Payout</p>
              <p className="text-[14px] font-bold text-[#8fb0a7]">
                {money(row.payout)}
              </p>
            </div>
          </div>

          {row.note ? (
            <div className="flex items-start gap-[8px]">
              <MessageSquare
                size={14}
                strokeWidth={2}
                className="mt-[2px] shrink-0 text-[#64748b]"
              />
              <p className="min-w-0 flex-1 text-[13px] leading-[1.5] font-normal text-[#94a3b8]">
                {row.note}
              </p>
            </div>
          ) : null}

          <p className="mt-auto text-[12px] font-normal text-[#64748b]">
            Submitted {row.when}
            {row.reviewedByName ? ` · reviewed by ${row.reviewedByName}` : ""}
          </p>
        </>
      )}
    </div>
  );
}
