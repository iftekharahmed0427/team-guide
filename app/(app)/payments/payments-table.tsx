"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Pencil } from "lucide-react";
import { savePayments } from "@/lib/actions/payments";
import { PER_TICKET, type Row } from "./payments-data";
import PayrollTable, { type PayrollRow } from "./payroll-table";
import PayrollEditTable, {
  type EditMember,
  type EditValues,
} from "./payroll-edit-table";

// The live payroll card: the read table from the "payments-page" frame
// (node 56:61) with the Edit button that swaps in the edit table from
// "payments-table-edit-state" (node 60:504).
//
// Edits are staged by the edit table and committed here in one savePayments
// call, which is how the live sheet works: nothing is written until Save.
//
// The Amount shown while editing is the same arithmetic the server will apply,
// so the figure does not jump when the sheet reloads. Ticket pay is only earned
// by roles that are paid per ticket.

const amountOf = (v: EditValues, member: { paidPerTicket: boolean }) =>
  (member.paidPerTicket ? v.tickets * PER_TICKET : 0) +
  v.base +
  v.bonus +
  v.commissions +
  v.adjustment;

export default function PaymentsTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const display: PayrollRow[] = rows.map((r) => ({
    key: r.key,
    name: r.name,
    image: r.image,
    role: r.role,
    base: r.base,
    tickets: r.tickets,
    bonus: r.bonus,
    commissions: r.commissions,
    adjustment: r.adjustment,
    amount: r.amount,
  }));

  const editable: EditMember[] = rows.map((r) => ({
    key: r.key,
    name: r.name,
    image: r.image,
    role: r.role,
    paidPerTicket: r.paidPerTicket,
    values: {
      // The manual bonus is the only editable part: the dispute and review
      // bonuses are computed from those tools and would be overwritten.
      base: r.base,
      tickets: r.tickets,
      bonus: r.manualBonus,
      commissions: r.commissions,
      adjustment: r.adjustment,
    },
  }));

  function save(next: Record<string, EditValues>) {
    setError("");
    setSaved(false);

    const changes = rows
      .filter((r) => r.userId && next[r.key])
      .map((r) => {
        const v = next[r.key];
        return {
          userId: r.userId as string,
          // A count equal to the live one goes back to tracking Reports rather
          // than being frozen as an override.
          ticketOverride:
            v.tickets === r.tickets && r.override === null ? null : v.tickets,
          roleId: r.roleId,
          baseCompensation: v.base,
          bonus: v.bonus,
          commissionOverride:
            v.commissions === r.commissions && r.commissionOverride === null
              ? null
              : v.commissions,
          adjustment: v.adjustment,
        };
      });

    startTransition(async () => {
      const res = await savePayments(changes);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setEditing(false);
      setSaved(true);
      router.refresh();
    });
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
      {editing ? (
        <PayrollEditTable
          title="Edit Payroll"
          subtitle="Editing active run performance incentives &amp; payouts"
          members={editable}
          amountOf={amountOf}
          onCancel={() => setEditing(false)}
          onSave={save}
        />
      ) : (
        <>
          <div className="flex items-center justify-end gap-[12px]">
            {error ? (
              <p className="flex items-center gap-[6px] text-[13px] font-medium text-[#ef4444]">
                <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
                {error}
              </p>
            ) : saved ? (
              <p className="flex items-center gap-[6px] text-[13px] font-semibold text-[#10b981]">
                <Check size={14} strokeWidth={2} className="shrink-0" />
                Saved.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[16px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]! disabled:cursor-default disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : (
                <Pencil size={14} strokeWidth={2} className="text-[#94a3b8]" />
              )}
              Edit
            </button>
          </div>
          <PayrollTable rows={display} />
        </>
      )}
    </div>
  );
}
