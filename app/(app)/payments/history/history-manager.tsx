"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X, Save, AlertCircle, History } from "lucide-react";
import Avatar from "@/app/components/avatar";
import { formatUSD, historyRowAmount } from "../constants";
import { savePeriod, deletePeriod, type PeriodRowInput } from "./actions";

// ── Types (plain data passed from the server page) ───────────────────────────
type Row = {
  id: string;
  memberId: string | null;
  memberName: string;
  memberImage: string | null;
  roleName: string;
  paidPerTicket: boolean;
  tickets: number;
  baseCompensation: number;
  bonus: number;
  commission: number;
  amountOverride: number | null;
};
type Period = {
  id: string;
  label: string;
  startDate: string | null;
  endDate: string | null;
  ticketRate: number;
  source: string;
  rows: Row[];
};
type RoleOption = { name: string; paidPerTicket: boolean };

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function fmtDate(s: string | null): string {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}, ${y}` : s;
}
function rangeLabel(p: Period): string {
  const a = fmtDate(p.startDate);
  const b = fmtDate(p.endDate);
  if (a && b) return `${a} - ${b}`;
  return a || b || "Undated period";
}

const intText = (n: number) => (n ? String(n) : "");
const moneyText = (n: number) => (n ? String(n) : "");
const parseInt0 = (t: string) => {
  const n = parseInt(t.trim() || "0", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const parseMoney0 = (t: string) => {
  const n = Math.round((Number(t.trim()) || 0) * 100) / 100;
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const parseMoneyOrNull = (t: string): number | null => {
  const s = t.trim();
  if (s === "") return null;
  const n = Math.round((Number(s) || 0) * 100) / 100;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const amountOf = (r: {
  paidPerTicket: boolean;
  tickets: number;
  baseCompensation: number;
  bonus: number;
  commission: number;
  amountOverride: number | null;
}, rate: number) => historyRowAmount(r, rate);

// ── Read-only period table (matches the live payments columns) ───────────────
function PeriodTable({ period }: { period: Period }) {
  const totals = period.rows.reduce(
    (acc, r) => {
      acc.base += r.baseCompensation;
      acc.tickets += r.tickets;
      acc.bonus += r.bonus;
      acc.commission += r.commission;
      acc.amount += amountOf(r, period.ticketRate);
      return acc;
    },
    { base: 0, tickets: 0, bonus: 0, commission: 0, amount: 0 },
  );

  if (period.rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted">No rows in this period.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full caption-bottom text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
            <th className="h-11 px-4 text-left align-middle font-medium">Member</th>
            <th className="h-11 px-4 text-left align-middle font-medium">Role</th>
            <th className="h-11 px-4 text-right align-middle font-medium">Base comp</th>
            <th className="h-11 px-4 text-right align-middle font-medium">Tickets</th>
            <th className="h-11 px-4 text-right align-middle font-medium">Bonus</th>
            <th className="h-11 px-4 text-right align-middle font-medium">Commissions</th>
            <th className="h-11 px-4 text-right align-middle font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {period.rows.map((r) => (
            <tr key={r.id} className="border-b border-border">
              <td className="h-12 px-4 align-middle">
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.memberName} image={r.memberImage} size={26} />
                  <span className="font-medium">{r.memberName}</span>
                </div>
              </td>
              <td className="h-12 px-4 align-middle">
                <span className={r.roleName ? "text-foreground" : "text-muted"}>
                  {r.roleName || "Unassigned"}
                </span>
              </td>
              <td className="h-12 px-4 text-right align-middle tabular-nums">{formatUSD(r.baseCompensation)}</td>
              <td className="h-12 px-4 text-right align-middle tabular-nums">{r.tickets}</td>
              <td className="h-12 px-4 text-right align-middle tabular-nums">{formatUSD(r.bonus)}</td>
              <td className="h-12 px-4 text-right align-middle tabular-nums">
                <span className={r.commission > 0 ? "text-foreground" : "text-muted"}>
                  {formatUSD(r.commission)}
                </span>
              </td>
              <td className="h-12 px-4 text-right align-middle font-medium tabular-nums">
                {formatUSD(amountOf(r, period.ticketRate))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-semibold">
            <td className="h-12 px-4 align-middle">Total</td>
            <td className="h-12 px-4 align-middle" />
            <td className="h-12 px-4 text-right align-middle tabular-nums">{formatUSD(totals.base)}</td>
            <td className="h-12 px-4 text-right align-middle tabular-nums">{totals.tickets}</td>
            <td className="h-12 px-4 text-right align-middle tabular-nums">{formatUSD(totals.bonus)}</td>
            <td className="h-12 px-4 text-right align-middle tabular-nums">{formatUSD(totals.commission)}</td>
            <td className="h-12 px-4 text-right align-middle tabular-nums">{formatUSD(totals.amount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Add / edit editor ────────────────────────────────────────────────────────
type Draft = {
  key: string;
  memberName: string;
  memberId: string | null;
  roleName: string;
  paidPerTicket: boolean;
  ticketsText: string;
  baseText: string;
  bonusText: string;
  commissionText: string;
  overrideText: string;
};

let keySeq = 0;
const newKey = () => `r${keySeq++}`;
const emptyDraft = (): Draft => ({
  key: newKey(),
  memberName: "",
  memberId: null,
  roleName: "",
  paidPerTicket: true,
  ticketsText: "",
  baseText: "",
  bonusText: "",
  commissionText: "",
  overrideText: "",
});
const draftFromRow = (r: Row): Draft => ({
  key: r.id || newKey(),
  memberName: r.memberName,
  memberId: r.memberId,
  roleName: r.roleName,
  paidPerTicket: r.paidPerTicket,
  ticketsText: intText(r.tickets),
  baseText: moneyText(r.baseCompensation),
  bonusText: moneyText(r.bonus),
  commissionText: moneyText(r.commission),
  overrideText: r.amountOverride === null ? "" : String(r.amountOverride),
});

const draftAmount = (d: Draft, rate: number) =>
  amountOf(
    {
      paidPerTicket: d.paidPerTicket,
      tickets: parseInt0(d.ticketsText),
      baseCompensation: parseMoney0(d.baseText),
      bonus: parseMoney0(d.bonusText),
      commission: parseMoney0(d.commissionText),
      amountOverride: parseMoneyOrNull(d.overrideText),
    },
    rate,
  );

const inp =
  "h-8 border border-border bg-surface-2 px-2 text-sm text-foreground outline-none focus:border-foreground/40 disabled:opacity-60";

function PeriodEditor({
  period,
  roles,
  onClose,
  onSaved,
}: {
  period: Period | null;
  roles: RoleOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(period?.label ?? "");
  const [startDate, setStartDate] = useState(period?.startDate ?? "");
  const [endDate, setEndDate] = useState(period?.endDate ?? "");
  const [rateText, setRateText] = useState(period ? String(period.ticketRate) : "1");
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    period && period.rows.length ? period.rows.map(draftFromRow) : [emptyDraft()],
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const rate = parseMoney0(rateText);
  const total = drafts.reduce((s, d) => s + draftAmount(d, rate), 0);

  const patch = (key: string, p: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...p } : d)));
  const addRow = () => setDrafts((ds) => [...ds, emptyDraft()]);
  const removeRow = (key: string) => setDrafts((ds) => ds.filter((d) => d.key !== key));
  const onRole = (key: string, name: string) => {
    const match = roles.find((r) => r.name.toLowerCase() === name.trim().toLowerCase());
    patch(key, { roleName: name, ...(match ? { paidPerTicket: match.paidPerTicket } : {}) });
  };

  function save() {
    setError("");
    const rows: PeriodRowInput[] = drafts
      .filter((d) => d.memberName.trim() !== "")
      .map((d) => ({
        memberName: d.memberName.trim(),
        memberId: d.memberId,
        roleName: d.roleName.trim(),
        paidPerTicket: d.paidPerTicket,
        tickets: parseInt0(d.ticketsText),
        baseCompensation: parseMoney0(d.baseText),
        bonus: parseMoney0(d.bonusText),
        commission: parseMoney0(d.commissionText),
        amountOverride: parseMoneyOrNull(d.overrideText),
      }));
    if (rows.length === 0) {
      setError("Add at least one member with a name.");
      return;
    }
    startTransition(async () => {
      const res = await savePeriod({
        id: period?.id,
        label,
        startDate: startDate || null,
        endDate: endDate || null,
        ticketRate: rate,
        rows,
      });
      if ("error" in res) setError(res.error);
      else onSaved();
    });
  }

  return (
    <div className="flex flex-col gap-3 border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          {period ? "Edit period" : "New period"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="flex h-7 w-7 items-center justify-center border border-transparent text-muted transition-colors hover:text-foreground disabled:opacity-50"
          aria-label="Close"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
          Label
          <input
            value={label}
            disabled={pending}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Period 12 or Feb 1-14"
            maxLength={120}
            className={inp}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          From
          <input
            type="date"
            value={startDate}
            disabled={pending}
            onChange={(e) => setStartDate(e.target.value)}
            className={`${inp} [color-scheme:dark]`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          To
          <input
            type="date"
            value={endDate}
            disabled={pending}
            onChange={(e) => setEndDate(e.target.value)}
            className={`${inp} [color-scheme:dark]`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          $ / ticket
          <input
            inputMode="decimal"
            value={rateText}
            disabled={pending}
            onChange={(e) => setRateText(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="1"
            className={`${inp} text-right tabular-nums`}
          />
        </label>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
              <th className="h-9 px-2 text-left font-medium">Member</th>
              <th className="h-9 px-2 text-left font-medium">Role</th>
              <th className="h-9 px-2 text-right font-medium">Tickets</th>
              <th className="h-9 px-2 text-right font-medium">Base</th>
              <th className="h-9 px-2 text-right font-medium">Bonus</th>
              <th className="h-9 px-2 text-right font-medium">Commissions</th>
              <th className="h-9 px-2 text-right font-medium">Amount</th>
              <th className="h-9 w-8 px-2" />
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d.key} className="border-b border-border last:border-0 align-top">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={d.memberName || "?"} image={null} size={22} />
                    <input
                      list="ph-members"
                      value={d.memberName}
                      disabled={pending}
                      onChange={(e) => patch(d.key, { memberName: e.target.value, memberId: null })}
                      placeholder="Name"
                      maxLength={80}
                      className={`${inp} w-40`}
                    />
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-col gap-1">
                    <input
                      list="ph-roles"
                      value={d.roleName}
                      disabled={pending}
                      onChange={(e) => onRole(d.key, e.target.value)}
                      placeholder="Role"
                      maxLength={60}
                      className={`${inp} w-36`}
                    />
                    <label className="flex items-center gap-1 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={d.paidPerTicket}
                        disabled={pending}
                        onChange={(e) => patch(d.key, { paidPerTicket: e.target.checked })}
                      />
                      Paid per ticket
                    </label>
                  </div>
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    inputMode="numeric"
                    value={d.ticketsText}
                    disabled={pending}
                    onChange={(e) => patch(d.key, { ticketsText: e.target.value.replace(/[^\d]/g, "") })}
                    placeholder="0"
                    className={`${inp} w-16 text-right tabular-nums`}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    inputMode="decimal"
                    value={d.baseText}
                    disabled={pending}
                    onChange={(e) => patch(d.key, { baseText: e.target.value.replace(/[^\d.]/g, "") })}
                    placeholder="0"
                    className={`${inp} w-20 text-right tabular-nums`}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    inputMode="decimal"
                    value={d.bonusText}
                    disabled={pending}
                    onChange={(e) => patch(d.key, { bonusText: e.target.value.replace(/[^\d.]/g, "") })}
                    placeholder="0"
                    className={`${inp} w-20 text-right tabular-nums`}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    inputMode="decimal"
                    value={d.commissionText}
                    disabled={pending}
                    onChange={(e) => patch(d.key, { commissionText: e.target.value.replace(/[^\d.]/g, "") })}
                    placeholder="0"
                    className={`${inp} w-20 text-right tabular-nums`}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-medium tabular-nums">{formatUSD(draftAmount(d, rate))}</span>
                    <input
                      inputMode="decimal"
                      value={d.overrideText}
                      disabled={pending}
                      onChange={(e) => patch(d.key, { overrideText: e.target.value.replace(/[^\d.]/g, "") })}
                      placeholder="override"
                      title="Override the computed amount"
                      className={`${inp} w-20 text-right tabular-nums`}
                    />
                  </div>
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(d.key)}
                    disabled={pending}
                    aria-label="Remove row"
                    className="flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-semibold">
              <td className="px-2 py-2" colSpan={6}>
                Total
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{formatUSD(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          disabled={pending}
          className="btn-wipe flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Plus size={15} strokeWidth={1.75} />
          Add member
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn-wipe flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn-wipe flex h-9 items-center gap-2 border border-border px-3 text-sm text-foreground transition-colors disabled:opacity-50"
          >
            <Save size={15} strokeWidth={1.75} />
            {period ? "Save period" : "Create period"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 border border-border bg-surface-2 px-4 py-2.5 text-xs text-red-400">
          <AlertCircle size={13} strokeWidth={2} />
          {error}
        </div>
      ) : null}
    </div>
  );
}

// ── Orchestrator ─────────────────────────────────────────────────────────────
export default function HistoryManager({
  periods,
  memberNames,
  roles,
}: {
  periods: Period[];
  memberNames: string[];
  roles: RoleOption[];
}) {
  const router = useRouter();
  // null = list view; { period: null } = creating; { period } = editing that one.
  const [editing, setEditing] = useState<{ period: Period | null } | null>(null);

  const onSaved = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <datalist id="ph-members">
        {memberNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="ph-roles">
        {roles.map((r) => (
          <option key={r.name} value={r.name} />
        ))}
      </datalist>

      {editing ? (
        <PeriodEditor
          period={editing.period}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEditing({ period: null })}
            className="btn-wipe flex h-9 items-center gap-2 border border-border px-3 text-sm text-foreground transition-colors"
          >
            <Plus size={15} strokeWidth={1.75} />
            Add period
          </button>
        </div>
      )}

      {periods.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border border-border bg-surface px-5 py-16 text-center">
          <History size={22} strokeWidth={1.5} className="text-muted" />
          <p className="text-sm text-muted">
            No periods yet. Add one above, or they will appear here automatically each time
            you run Reset all.
          </p>
        </div>
      ) : (
        periods.map((p) => (
          <section key={p.id} className="border border-border bg-surface">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight">
                    {p.label || rangeLabel(p)}
                  </h2>
                  <span className="border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                    {p.source === "reset" ? "Auto" : "Manual"}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {p.label ? rangeLabel(p) : `${formatUSD(p.ticketRate)} per ticket`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing({ period: p })}
                  className="btn-wipe flex h-8 items-center gap-1.5 border border-border px-2.5 text-xs text-muted transition-colors hover:text-foreground"
                >
                  <Pencil size={13} strokeWidth={1.75} />
                  Edit
                </button>
                <form
                  action={deletePeriod}
                  onSubmit={(e) => {
                    if (!window.confirm("Delete this period and all its rows?")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    aria-label="Delete period"
                    className="flex h-8 w-8 items-center justify-center border border-border text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </form>
              </div>
            </div>
            <PeriodTable period={p} />
          </section>
        ))
      )}
    </div>
  );
}
