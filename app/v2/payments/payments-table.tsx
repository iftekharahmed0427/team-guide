"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { PER_TICKET, ROWS } from "./payments-data";
import PayrollTable, { type PayrollRow } from "./payroll-table";
import PayrollEditTable, { type EditMember, type EditValues } from "./payroll-edit-table";

// The live payroll card: the read table from the "payments-page" frame
// (node 56:61) with the Edit button that swaps in the edit table from
// "payments-table-edit-state" (node 60:504). Both tables are shared with the
// archived cards on /v2/payments/history.
//
// Edits are staged by the edit table and committed here on Save. Nothing
// persists - this is still the redesign canvas.

// Tickets pay a flat rate on the live sheet; an archived period carries its own.
const amountOf = (v: EditValues) =>
  v.base + v.tickets * PER_TICKET + v.bonus + v.commissions + v.adjustment;

export default function PaymentsTable() {
  const [rows, setRows] = useState(ROWS);
  const [editing, setEditing] = useState(false);

  const values = (r: (typeof ROWS)[number]): EditValues => ({
    base: r.base,
    tickets: r.tickets,
    bonus: r.bonus,
    commissions: r.commissions,
    adjustment: r.adjustment,
  });

  const display: PayrollRow[] = rows.map((r) => ({
    key: r.name,
    name: r.name,
    initials: r.initials,
    tint: r.tint,
    role: r.role,
    base: r.base,
    tickets: r.tickets,
    bonus: r.bonus,
    commissions: r.commissions,
    adjustment: r.adjustment,
    amount: amountOf(values(r)),
  }));

  const editable: EditMember[] = rows.map((r) => ({
    key: r.name,
    name: r.name,
    initials: r.initials,
    tint: r.tint,
    role: r.role,
    values: values(r),
  }));

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
          onSave={(next) => {
            setRows(rows.map((r) => (next[r.name] ? { ...r, ...next[r.name] } : r)));
            setEditing(false);
          }}
        />
      ) : (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[16px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
            >
              <Pencil size={14} strokeWidth={2} className="text-[#94a3b8]" />
              Edit
            </button>
          </div>
          <PayrollTable rows={display} />
        </>
      )}
    </div>
  );
}
