"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Check } from "lucide-react";
import { submitCommission } from "./actions";

const labelCls = "mb-1 block text-xs text-muted";
const inputCls =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40";

export default function CommissionForm() {
  const router = useRouter();
  const [ticketName, setTicketName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ticketName.trim()) return setError("Ticket name is required.");
    if (!customerEmail.trim()) return setError("Customer email is required.");
    startTransition(async () => {
      const res = await submitCommission({ ticketName, customerEmail });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setTicketName("");
      setCustomerEmail("");
      setDone(true);
      setTimeout(() => setDone(false), 3000);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="border border-border bg-surface p-4">
      <p className="mb-3 text-sm font-medium">Submit a commission</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ticketName" className={labelCls}>
            Ticket name
          </label>
          <input
            id="ticketName"
            value={ticketName}
            onChange={(e) => setTicketName(e.target.value)}
            placeholder="e.g. Renewal for Acme Co."
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="customerEmail" className={labelCls}>
            Customer email
          </label>
          <input
            id="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="customer@example.com"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {error ? (
          <span className="text-xs text-red-400">{error}</span>
        ) : done ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Check size={13} strokeWidth={2} />
            Submitted for review
          </span>
        ) : (
          <span className="text-xs text-muted">An admin will review and price it.</span>
        )}
        <button
          type="submit"
          disabled={pending || !ticketName.trim() || !customerEmail.trim()}
          className="btn-wipe btn-wipe-dark flex h-9 shrink-0 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          ) : (
            <Plus size={15} strokeWidth={2} />
          )}
          Submit
        </button>
      </div>
    </form>
  );
}
