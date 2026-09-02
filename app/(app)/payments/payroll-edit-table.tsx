"use client";

import { useState } from "react";
import Avatar from "../avatar";
import { money } from "./payments-data";

// The payroll edit table from the "payments-table-edit-state" Figma frame
// (node 60:504), drawn once and used twice: the live sheet on /payments and
// any period card on /payments/history, which has no edit design of its own.
//
// The frame was drawn against a different palette from the read table - slate
// (#f8fafc, #334155, #1e293b) rather than the v2 tokens - so the class lists
// here deliberately diverge from payroll-table.tsx.
//
// Edits are staged inside this component: typing only moves the draft, Cancel
// throws it away, and Save hands the parsed numbers back to the caller. What
// happens then is the caller's business; neither caller persists today.

export const EDITABLE = ["base", "tickets", "bonus", "commissions", "adjustment"] as const;

export type EditableKey = (typeof EDITABLE)[number];

export type EditValues = Record<EditableKey, number>;

export type EditMember = {
  key: string;
  /** Roles that are not paid per ticket earn their base only. */
  paidPerTicket: boolean;
  name: string;
  image: string | null;
  role: string;
  values: EditValues;
};

type Props = {
  title: string;
  subtitle: string;
  members: EditMember[];
  /** How a row's Amount is worked out; the two callers compute it differently. */
  amountOf: (values: EditValues, member: EditMember) => number;
  onCancel: () => void;
  onSave: (next: Record<string, EditValues>) => void;
};

// Column widths are the frame's. It leaves slack past the last column at its
// 1440 canvas; here Member absorbs it, so the money columns stay flush right.
const COL: Record<"member" | "role" | "amount" | EditableKey, string> = {
  member: "min-w-[180px] flex-1",
  role: "w-[90px]",
  base: "w-[105px]",
  tickets: "w-[85px]",
  bonus: "w-[105px]",
  commissions: "w-[110px]",
  adjustment: "w-[110px]",
  amount: "w-[110px] text-right",
};

const HEADS: [keyof typeof COL, string][] = [
  ["member", "Member"],
  ["role", "Role"],
  ["base", "Base Comp"],
  ["tickets", "Tickets"],
  ["bonus", "Bonus"],
  ["commissions", "Commissions"],
  ["adjustment", "Adjustment"],
  ["amount", "Amount"],
];

const tone = (n: number) =>
  n > 0 ? "text-[#10b981]" : n < 0 ? "text-[#ef4444]" : "text-[#f8fafc]";

/** Adjustments carry their sign; a zero stays unsigned. */
const signed = (n: number) => (n > 0 ? `+${money(n)}` : money(n));

type Draft = Record<EditableKey, string>;

/** Drafts hold what is typed, so they stay strings until they are committed. */
function toDraft(values: EditValues): Draft {
  return {
    base: money(values.base),
    tickets: String(values.tickets),
    bonus: money(values.bonus),
    commissions: money(values.commissions),
    adjustment: signed(values.adjustment),
  };
}

// Anything that is not part of a number is punctuation the member typed or the
// currency formatting we put there, so drop it.
const parse = (value: string) => Number(value.replace(/[^0-9.-]/g, "")) || 0;

const parseDraft = (draft: Draft): EditValues =>
  Object.fromEntries(EDITABLE.map((key) => [key, parse(draft[key])])) as EditValues;

export default function PayrollEditTable({
  title,
  subtitle,
  members,
  amountOf,
  onCancel,
  onSave,
}: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(() => members.map((m) => toDraft(m.values)));

  const staged = drafts.map(parseDraft);
  const total = (key: EditableKey) => staged.reduce((t, s) => t + s[key], 0);
  const totalAmount = staged.reduce((t, s, i) => t + amountOf(s, members[i]), 0);

  function setField(index: number, key: EditableKey, value: string) {
    setDrafts(drafts.map((draft, i) => (i === index ? { ...draft, [key]: value } : draft)));
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center justify-between gap-[24px] pb-[4px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="truncate text-[18px] font-bold text-[#f8fafc]">{title}</p>
          <p className="truncate text-[12px] font-normal text-[#94a3b8]">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-[8px]">
          <button
            type="button"
            onClick={onCancel}
            className="flex cursor-pointer items-center justify-center rounded-[6px] border border-[#334155]! px-[16px] py-[8px] text-[13px] font-semibold text-[#94a3b8] transition-colors hover:text-[#e2e8f0]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave(Object.fromEntries(members.map((m, i) => [m.key, staged[i]])))
            }
            className="flex cursor-pointer items-center justify-center rounded-[6px] bg-[#10b981] px-[16px] py-[8px] text-[13px] font-bold text-[#0f172a] transition-colors hover:bg-[#34d399]"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex h-[38px] items-center gap-[16px] rounded-[6px] bg-[#0e1217] px-[16px] text-[11px] font-bold text-[#94a3b8]">
          {HEADS.map(([key, label]) => (
            <p key={key} className={COL[key]}>
              {label}
            </p>
          ))}
        </div>

        {members.map((member, i) => (
          <div
            key={member.key}
            className="flex h-[52px] items-center gap-[16px] border border-[#1e293b]! px-[16px]"
          >
            <div className={`flex items-center gap-[10px] ${COL.member}`}>
              {/* The one square avatar in the app; the frame draws it 26 wide
                  and 28 tall, squared off here so it stays one component. */}
              <Avatar
                name={member.name}
                image={member.image}
                size={28}
                radiusClassName="rounded-[4px]"
                textClassName="text-[10px]"
              />
              <p className="truncate text-[13px] font-semibold text-[#f8fafc]">{member.name}</p>
            </div>
            <p className={`truncate text-[13px] font-normal text-[#94a3b8] ${COL.role}`}>
              {member.role}
            </p>
            {EDITABLE.map((key) => (
              <input
                key={key}
                value={drafts[i][key]}
                onChange={(e) => setField(i, key, e.target.value)}
                aria-label={`${member.name} ${key}`}
                className={`h-[32px] rounded-[6px] border border-[#334155]! bg-[#0e1217] px-[10px] text-[13px] font-medium outline-none focus:border-[#10b981]! ${
                  key === "adjustment" ? tone(staged[i].adjustment) : "text-[#f8fafc]"
                } ${COL[key]}`}
              />
            ))}
            <p className={`text-[13px] font-semibold text-[#f8fafc] ${COL.amount}`}>
              {money(amountOf(staged[i], member))}
            </p>
          </div>
        ))}

        <div className="flex h-[52px] items-center gap-[16px] px-[16px] text-[13px] font-bold text-[#f8fafc]">
          <p className={COL.member}>Total</p>
          <p className={COL.role} />
          <p className={COL.base}>{money(total("base"))}</p>
          <p className={COL.tickets}>{total("tickets").toLocaleString("en-US")}</p>
          <p className={COL.bonus}>{money(total("bonus"))}</p>
          <p className={COL.commissions}>{money(total("commissions"))}</p>
          <p className={`${tone(total("adjustment"))} ${COL.adjustment}`}>
            {signed(total("adjustment"))}
          </p>
          <p className={COL.amount}>{money(totalAmount)}</p>
        </div>
      </div>
    </div>
  );
}
