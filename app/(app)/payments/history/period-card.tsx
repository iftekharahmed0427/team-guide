"use client";

import { useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import ConfirmDialog from "../../confirm-dialog";
import { money } from "../payments-data";
import PayrollTable, { type PayrollRow } from "../payroll-table";
import PayrollEditTable, { type EditMember, type EditValues } from "../payroll-edit-table";

// One archived pay period on /payments/history: the header from the
// "payment-history-page" frame (node 136:147) over the payroll table, and the
// edit state the Edit button swaps in.
//
// The history frame draws no edit design of its own, so Edit reuses the
// "payments-table-edit-state" treatment the live sheet uses. Edits are staged
// and Save commits them to this card only - nothing is written. The live
// /payments/history page owns savePeriod, and it is admin-gated.

export type PeriodMember = {
  id: string;
  name: string;
  image: string | null;
  role: string;
  paidPerTicket: boolean;
  amountOverride: number | null;
  values: EditValues;
};

type Props = {
  title: string;
  auto: boolean;
  ticketRate: number;
  members: PeriodMember[];
};

export default function PeriodCard({ title, auto, ticketRate, members }: Props) {
  const [rows, setRows] = useState(members);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Mirrors historyRowAmount: an admin override replaces the computed base, and
  // the signed adjustment applies on top either way. Kept here so the edit table
  // stays presentational and the two callers can differ.
  const amountOf = (v: EditValues, member: { paidPerTicket: boolean; amountOverride: number | null }) => {
    const base =
      member.amountOverride !== null
        ? member.amountOverride
        : (member.paidPerTicket ? v.tickets * ticketRate : 0) + v.base + v.bonus + v.commissions;
    return base + v.adjustment;
  };

  const display: PayrollRow[] = rows.map((r) => ({
    key: r.id,
    name: r.name,
    image: r.image,
    role: r.role,
    base: r.values.base,
    tickets: r.values.tickets,
    bonus: r.values.bonus,
    commissions: r.values.commissions,
    adjustment: r.values.adjustment,
    amount: amountOf(r.values, r),
  }));

  const editable: EditMember[] = rows.map((r) => ({
    key: r.id,
    name: r.name,
    image: r.image,
    role: r.role,
    // An archived row carries the pay it was actually given, so the ticket
    // column is always part of its amount whatever the role was at the time.
    paidPerTicket: true,
    values: r.values,
  }));

  const secondary =
    "flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! px-[14px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!";

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[20px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
      {editing ? (
        <PayrollEditTable
          title={`Edit ${title}`}
          subtitle={`${money(ticketRate)} per ticket · changes stay on this page`}
          members={editable}
          amountOf={(values, member) => {
            const row = rows.find((r) => r.id === member.key);
            return amountOf(values, row ?? { paidPerTicket: true, amountOverride: null });
          }}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            setRows(rows.map((r) => (next[r.id] ? { ...r, values: next[r.id] } : r)));
            setEditing(false);
          }}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-[16px]">
            <div className="flex min-w-0 flex-col gap-[6px]">
              <div className="flex items-center gap-[12px]">
                <p className="truncate text-[18px] font-bold text-[#e2e8f0]">{title}</p>
                {/* Periods opened by a Reports "Reset all" rather than by hand;
                    the frame badges only those. */}
                {auto ? (
                  <span className="shrink-0 rounded-[4px] bg-[#243033] px-[8px] py-[2px] text-[10px] font-bold tracking-[0.4px] text-[#94a3b8] uppercase">
                    Auto
                  </span>
                ) : null}
              </div>
              <p className="text-[13px] font-normal text-[#94a3b8]">
                {money(ticketRate)} per ticket
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-[8px]">
              <button type="button" onClick={() => setEditing(true)} className={secondary}>
                <Pencil size={12} strokeWidth={2} className="text-[#94a3b8]" />
                Edit
              </button>
              <button type="button" className={secondary}>
                <Copy size={12} strokeWidth={2} className="text-[#94a3b8]" />
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label={`Delete ${title}`}
                title={`Delete ${title}`}
                className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[#ef4444]/30! bg-[#ef4444]/10 text-[#ef4444] transition-colors hover:border-[#ef4444]! hover:bg-[#ef4444]/20"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          <PayrollTable rows={display} />
        </>
      )}

      <ConfirmDialog
        open={confirming}
        description={`This action cannot be undone. The pay period ${title} and every member row in it would be permanently deleted.`}
        confirmLabel="Delete"
        onCancel={() => setConfirming(false)}
        onConfirm={() => setConfirming(false)}
      />
    </div>
  );
}
