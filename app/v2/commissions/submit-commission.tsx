"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Info, Loader2, Plus } from "lucide-react";
import { submitCommission } from "@/app/(app)/commissions/actions";

// The submit card. Built from the reviews "Log a review" card, which is the
// closest thing the design system has to a short inline form: same surface,
// same 12px field captions, same footer with a hint on the left and the accent
// button on the right.
//
// Wired to the live submitCommission. Any signed-in member can submit; the
// pricing and the decision are an admin job, on the member page.

export default function SubmitCommission() {
  const router = useRouter();
  const [ticketName, setTicketName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    setDone(false);
    if (!ticketName.trim()) return setError("Name the ticket.");
    if (!customerEmail.trim()) return setError("Enter the customer email.");

    startTransition(async () => {
      const res = await submitCommission({ ticketName, customerEmail });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setTicketName("");
      setCustomerEmail("");
      setDone(true);
      router.refresh();
    });
  }

  const field = "flex min-w-0 flex-1 flex-col gap-[8px]";
  const label = "text-[12px] font-semibold text-[#94a3b8]";
  const input =
    "w-full rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[14px] py-[11px] text-[14px] font-normal text-[#e2e8f0] outline-none transition-colors placeholder:text-[#64748b] focus:border-[#8fb0a7]!";

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[20px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
      <div className="flex items-center justify-between gap-[16px]">
        <p className="text-[16px] font-bold text-[#e2e8f0]">
          Submit a commission
        </p>
        <Info size={14} strokeWidth={2} className="shrink-0 text-[#64748b]" />
      </div>

      <div className="flex items-start gap-[16px]">
        <div className={field}>
          <label htmlFor="ticket-name" className={label}>
            Ticket name
          </label>
          <input
            id="ticket-name"
            value={ticketName}
            disabled={pending}
            onChange={(e) => setTicketName(e.target.value)}
            placeholder="e.g. Renewal for Acme Co."
            className={input}
          />
        </div>
        <div className={field}>
          <label htmlFor="customer-email" className={label}>
            Customer email
          </label>
          <input
            id="customer-email"
            type="email"
            value={customerEmail}
            disabled={pending}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="customer@example.com"
            className={input}
          />
        </div>
      </div>

      <div className="h-px w-full bg-[#243033]" />

      <div className="flex items-center justify-between gap-[16px]">
        <div className="min-w-0 flex-1">
          {error ? (
            <p className="flex items-center gap-[6px] text-[13px] font-medium text-[#ef4444]">
              <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
              {error}
            </p>
          ) : done ? (
            <p className="flex items-center gap-[6px] text-[13px] font-semibold text-[#10b981]">
              <Check size={14} strokeWidth={2} className="shrink-0" />
              Submitted for review.
            </p>
          ) : (
            <p className="text-[13px] font-normal text-[#64748b]">
              An admin prices it and approves or denies it; you keep the payout.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <Plus size={14} strokeWidth={2} />
          )}
          Submit
        </button>
      </div>
    </div>
  );
}
