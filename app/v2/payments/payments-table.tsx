"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  EDITABLE,
  type EditableKey,
  type Row,
  ROWS,
  amountOf,
  money,
  signed,
  sum,
} from "./payments-data";

// The payroll card, in both of its states: the read table from the
// "payments-page" frame (node 56:61) and the edit table from
// "payments-table-edit-state" (node 60:504), which the Edit button swaps in.
//
// The two frames were drawn against different palettes - the read state uses
// the v2 tokens (#e2e8f0 text, #243033 hairlines) while the edit state uses
// slate (#f8fafc, #334155, #1e293b) - so the class lists below deliberately
// diverge rather than sharing one set.
//
// Edits are staged: typing only moves the draft, Cancel throws it away and Save
// commits it to the table. Nothing persists - this is still the redesign canvas.

type Draft = Record<EditableKey, string>;

// Column widths are each frame's. Both leave slack past the last column at the
// 1440 canvas; here Member absorbs it, so the money columns stay flush with the
// table's right padding at any window width.
const READ_COL = {
  member: "min-w-[220px] flex-1",
  role: "w-[110px]",
  base: "w-[110px] text-right",
  tickets: "w-[90px] text-right",
  bonus: "w-[100px] text-right",
  commissions: "w-[120px] text-right",
  adjustment: "w-[120px] text-right",
  amount: "w-[110px] text-right",
};

const EDIT_COL: Record<"member" | "role" | "amount" | EditableKey, string> = {
  member: "min-w-[180px] flex-1",
  role: "w-[90px]",
  base: "w-[105px]",
  tickets: "w-[85px]",
  bonus: "w-[105px]",
  commissions: "w-[110px]",
  adjustment: "w-[110px]",
  amount: "w-[110px] text-right",
};

const EDIT_HEADS: [keyof typeof EDIT_COL, string][] = [
  ["member", "Member"],
  ["role", "Role"],
  ["base", "Base Comp"],
  ["tickets", "Tickets"],
  ["bonus", "Bonus"],
  ["commissions", "Commissions"],
  ["adjustment", "Adjustment"],
  ["amount", "Amount"],
];

const readTone = (n: number) =>
  n > 0 ? "text-[#10b981]" : n < 0 ? "text-[#ef4444]" : "text-[#94a3b8]";

const editTone = (n: number) =>
  n > 0 ? "text-[#10b981]" : n < 0 ? "text-[#ef4444]" : "text-[#f8fafc]";

/** Drafts hold what is typed, so they stay strings until they are committed. */
function toDraft(row: Row): Draft {
  return {
    base: money(row.base),
    tickets: String(row.tickets),
    bonus: money(row.bonus),
    commissions: money(row.commissions),
    adjustment: signed(row.adjustment),
  };
}

// Anything that is not part of a number is punctuation the member typed or the
// currency formatting we put there, so drop it.
const parse = (value: string) => Number(value.replace(/[^0-9.-]/g, "")) || 0;

const parseDraft = (draft: Draft) =>
  Object.fromEntries(EDITABLE.map((key) => [key, parse(draft[key])])) as Record<
    EditableKey,
    number
  >;

function Avatar({
  initials,
  tint,
  square,
}: {
  initials: string;
  tint: string;
  square?: boolean;
}) {
  return (
    <span
      style={{ backgroundColor: tint }}
      className={
        square
          ? "flex h-[28px] w-[26px] shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold text-[#0f172a]"
          : "flex size-[28px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#0e1217]"
      }
    >
      {initials}
    </span>
  );
}

export default function PaymentsTable() {
  const [rows, setRows] = useState(ROWS);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() => ROWS.map(toDraft));

  function startEditing() {
    setDrafts(rows.map(toDraft));
    setEditing(true);
  }

  function save() {
    setRows(rows.map((row, i) => ({ ...row, ...parseDraft(drafts[i]) })));
    setEditing(false);
  }

  function setField(index: number, key: EditableKey, value: string) {
    setDrafts(drafts.map((draft, i) => (i === index ? { ...draft, [key]: value } : draft)));
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  if (editing) {
    const staged = drafts.map(parseDraft);
    const total = (key: EditableKey) => staged.reduce((t, s) => t + s[key], 0);

    return (
      <div className="flex flex-col gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
        <div className="flex items-center justify-between gap-[24px] pb-[4px]">
          <div className="flex flex-col gap-[4px]">
            <p className="text-[18px] font-bold text-[#f8fafc]">Edit Payroll</p>
            <p className="text-[12px] font-normal text-[#94a3b8]">
              Editing active run performance incentives &amp; payouts
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[8px]">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex cursor-pointer items-center justify-center rounded-[6px] border border-[#334155]! px-[16px] py-[8px] text-[13px] font-semibold text-[#94a3b8] transition-colors hover:text-[#e2e8f0]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="flex cursor-pointer items-center justify-center rounded-[6px] bg-[#10b981] px-[16px] py-[8px] text-[13px] font-bold text-[#0f172a] transition-colors hover:bg-[#34d399]"
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex h-[38px] items-center gap-[16px] rounded-[6px] bg-[#0e1217] px-[16px] text-[11px] font-bold text-[#94a3b8]">
            {EDIT_HEADS.map(([key, label]) => (
              <p key={key} className={EDIT_COL[key]}>
                {label}
              </p>
            ))}
          </div>

          {rows.map((row, i) => (
            <div
              key={row.name}
              className="flex h-[52px] items-center gap-[16px] border border-[#1e293b]! px-[16px]"
            >
              <div className={`flex items-center gap-[10px] ${EDIT_COL.member}`}>
                <Avatar initials={row.initials} tint={row.tint} square />
                <p className="truncate text-[13px] font-semibold text-[#f8fafc]">{row.name}</p>
              </div>
              <p className={`truncate text-[13px] font-normal text-[#94a3b8] ${EDIT_COL.role}`}>
                {row.role}
              </p>
              {EDITABLE.map((key) => (
                <input
                  key={key}
                  value={drafts[i][key]}
                  onChange={(e) => setField(i, key, e.target.value)}
                  aria-label={`${row.name} ${key}`}
                  className={`h-[32px] rounded-[6px] border border-[#334155]! bg-[#0e1217] px-[10px] text-[13px] font-medium outline-none focus:border-[#10b981]! ${
                    key === "adjustment" ? editTone(staged[i].adjustment) : "text-[#f8fafc]"
                  } ${EDIT_COL[key]}`}
                />
              ))}
              <p className={`text-[13px] font-semibold text-[#f8fafc] ${EDIT_COL.amount}`}>
                {money(amountOf(staged[i]))}
              </p>
            </div>
          ))}

          <div className="flex h-[52px] items-center gap-[16px] px-[16px] text-[13px] font-bold text-[#f8fafc]">
            <p className={EDIT_COL.member}>Total</p>
            <p className={EDIT_COL.role} />
            <p className={EDIT_COL.base}>{money(total("base"))}</p>
            <p className={EDIT_COL.tickets}>{total("tickets").toLocaleString("en-US")}</p>
            <p className={EDIT_COL.bonus}>{money(total("bonus"))}</p>
            <p className={EDIT_COL.commissions}>{money(total("commissions"))}</p>
            <p className={`${editTone(total("adjustment"))} ${EDIT_COL.adjustment}`}>
              {signed(total("adjustment"))}
            </p>
            <p className={EDIT_COL.amount}>
              {money(staged.reduce((t, s) => t + amountOf(s), 0))}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalTickets = sum(rows, (r) => r.tickets);
  const totalAdjustment = sum(rows, (r) => r.adjustment);

  return (
    <div className="flex flex-col gap-[16px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={startEditing}
          className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[16px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
        >
          <Pencil size={14} strokeWidth={2} className="text-[#94a3b8]" />
          Edit
        </button>
      </div>

      <div className="flex flex-col">
        <div className="flex items-start rounded-[6px] bg-[#0e1217] px-[16px] py-[12px] text-[11px] font-bold text-[#94a3b8] uppercase">
          <p className={READ_COL.member}>Member</p>
          <p className={READ_COL.role}>Role</p>
          <p className={READ_COL.base}>Base Comp</p>
          <p className={READ_COL.tickets}>Tickets</p>
          <p className={READ_COL.bonus}>Bonus</p>
          <p className={READ_COL.commissions}>Commissions</p>
          <p className={READ_COL.adjustment}>Adjustment</p>
          <p className={READ_COL.amount}>Amount</p>
        </div>

        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center border-b border-[#243033]! px-[16px] py-[14px]"
          >
            <div className={`flex items-center gap-[12px] ${READ_COL.member}`}>
              <Avatar initials={row.initials} tint={row.tint} />
              <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">{row.name}</p>
            </div>
            <p className={`text-[13px] font-normal text-[#94a3b8] ${READ_COL.role}`}>{row.role}</p>
            <p className={`text-[13px] font-normal text-[#e2e8f0] ${READ_COL.base}`}>
              {money(row.base)}
            </p>
            <p className={`text-[13px] font-semibold text-white ${READ_COL.tickets}`}>
              {row.tickets}
            </p>
            <p className={`text-[13px] font-normal text-[#e2e8f0] ${READ_COL.bonus}`}>
              {money(row.bonus)}
            </p>
            <p className={`text-[13px] font-normal text-[#e2e8f0] ${READ_COL.commissions}`}>
              {money(row.commissions)}
            </p>
            <p
              className={`text-[13px] font-semibold ${readTone(row.adjustment)} ${READ_COL.adjustment}`}
            >
              {signed(row.adjustment)}
            </p>
            <p className={`text-[14px] font-bold text-[#8fb0a7] ${READ_COL.amount}`}>
              {money(amountOf(row))}
            </p>
          </div>
        ))}

        <div className="flex items-center bg-white/[0.01] p-[16px] text-[13px] font-bold text-white">
          <p className={`text-[#94a3b8] ${READ_COL.member}`}>Total</p>
          <p className={READ_COL.role} />
          <p className={READ_COL.base}>{money(sum(rows, (r) => r.base))}</p>
          <p className={READ_COL.tickets}>{totalTickets.toLocaleString("en-US")}</p>
          <p className={READ_COL.bonus}>{money(sum(rows, (r) => r.bonus))}</p>
          <p className={READ_COL.commissions}>{money(sum(rows, (r) => r.commissions))}</p>
          <p className={`${readTone(totalAdjustment)} ${READ_COL.adjustment}`}>
            {signed(totalAdjustment)}
          </p>
          <p className={`text-[15px] font-extrabold text-[#8fb0a7] ${READ_COL.amount}`}>
            {money(sum(rows, amountOf))}
          </p>
        </div>
      </div>
    </div>
  );
}
