"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, Pencil, X } from "lucide-react";
import Avatar from "@/app/components/avatar";
import CustomSelect from "@/app/components/custom-select";
import {
  formatUSD,
  memberTotal,
  type PayableMember,
  type PaymentRole,
} from "./constants";
import { savePayments, type PaymentChange } from "./actions";

type Draft = {
  roleId: string | null;
  overrideText: string;
  baseText: string;
  bonusText: string;
};

const moneyText = (n: number) => (n ? String(n) : "");
const seedRow = (m: PayableMember): Draft => ({
  roleId: m.roleId,
  overrideText: m.override === null ? "" : String(m.override),
  baseText: moneyText(m.baseCompensation),
  bonusText: moneyText(m.bonus),
});

const parseOverride = (t: string): number | null => {
  const s = t.trim();
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const parseBase = (t: string): number => {
  const n = Math.round((Number(t.trim()) || 0) * 100) / 100;
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export default function PaymentsTable({
  members,
  roles,
  editable,
}: {
  members: PayableMember[];
  roles: PaymentRole[];
  editable: boolean;
}) {
  const router = useRouter();

  const seed = (): Record<string, Draft> =>
    Object.fromEntries(
      members.filter((m) => m.userId).map((m) => [m.userId as string, seedRow(m)]),
    );

  const [draft, setDraft] = useState<Record<string, Draft>>(seed);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // Admins start in read-only view and opt into editing; everyone else is always
  // read-only. Inputs render only while editing.
  const [editing, setEditing] = useState(false);

  const payByRole = useMemo(() => new Map(roles.map((r) => [r.id, r.paidPerTicket])), [roles]);
  const roleOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...roles.map((r) => ({ value: r.id, label: r.name })),
    ],
    [roles],
  );

  // Resolve a row's effective values: the staged draft while editing, else saved.
  function resolved(m: PayableMember) {
    const d = (editing && m.userId && draft[m.userId]) || seedRow(m);
    const override = parseOverride(d.overrideText);
    const base = parseBase(d.baseText);
    const bonus = parseBase(d.bonusText);
    const roleId = d.roleId;
    const paidPerTicket = roleId ? payByRole.get(roleId) ?? false : true;
    // The disputes amount + its 5% bonus and the review bonus are server-computed
    // (from /disputes and /reviews) and not editable here; both add to Amount on
    // top of the manual bonus.
    const disputeAmount = m.disputeAmount || 0;
    const disputeBonus = m.disputeBonus || 0;
    const reviewCount = m.reviewCount || 0;
    const reviewBonus = m.reviewBonus || 0;
    const eff = override ?? m.tickets;
    const amount = memberTotal({
      tickets: m.tickets,
      override,
      paidPerTicket,
      baseCompensation: base,
      bonus,
      disputeBonus,
      reviewBonus,
    });
    return {
      override,
      base,
      bonus,
      roleId,
      paidPerTicket,
      eff,
      amount,
      disputeAmount,
      disputeBonus,
      reviewCount,
      reviewBonus,
    };
  }

  function isChanged(m: PayableMember) {
    if (!m.userId) return false;
    const r = resolved(m);
    return (
      r.roleId !== m.roleId ||
      r.override !== m.override ||
      r.base !== m.baseCompensation ||
      r.bonus !== m.bonus
    );
  }

  const changedMembers = editing ? members.filter(isChanged) : [];
  const dirty = changedMembers.length > 0;

  // Re-seed from the server only when there are no unsaved edits, so a live
  // refresh (or a just-completed save) syncs without clobbering work in progress.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (!dirtyRef.current) setDraft(seed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  function patch(userId: string, p: Partial<Draft>) {
    setError("");
    setDraft((cur) => ({ ...cur, [userId]: { ...seedRowFallback(cur, userId), ...p } }));
  }
  function seedRowFallback(cur: Record<string, Draft>, userId: string): Draft {
    return cur[userId] ?? { roleId: null, overrideText: "", baseText: "", bonusText: "" };
  }

  function cancel() {
    setDraft(seed()); // discard unsaved edits
    setError("");
    setEditing(false);
  }

  function save() {
    const changes: PaymentChange[] = changedMembers.map((m) => {
      const r = resolved(m);
      return {
        userId: m.userId as string,
        ticketOverride: r.override,
        roleId: r.roleId,
        baseCompensation: r.base,
        bonus: r.bonus,
      };
    });
    startTransition(async () => {
      const res = await savePayments(changes);
      if ("error" in res) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  const totals = members.reduce(
    (acc, m) => {
      const r = resolved(m);
      acc.tickets += r.eff;
      acc.base += r.base;
      acc.bonus += r.bonus + r.disputeBonus + r.reviewBonus;
      acc.amount += r.amount;
      return acc;
    },
    { tickets: 0, base: 0, bonus: 0, amount: 0 },
  );

  const cell = "h-8 w-20 border border-border bg-surface-2 px-2 text-right text-sm tabular-nums text-foreground outline-none focus:border-foreground/40 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-3">
      {editable ? (
        <div className="flex items-center justify-between gap-3">
          {editing ? (
            <>
              <p className="text-xs text-muted">
                {dirty
                  ? `${changedMembers.length} unsaved change${changedMembers.length === 1 ? "" : "s"}`
                  : "All changes saved"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  disabled={pending}
                  className="btn-wipe flex h-9 shrink-0 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <X size={15} strokeWidth={1.75} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || pending}
                  className="btn-wipe flex h-9 shrink-0 items-center gap-2 border border-border px-3 text-sm text-foreground transition-colors disabled:cursor-not-allowed disabled:text-muted disabled:opacity-50"
                >
                  <Save size={15} strokeWidth={1.75} />
                  Save changes
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted">View only</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-wipe flex h-9 shrink-0 items-center gap-2 border border-border px-3 text-sm text-foreground transition-colors"
              >
                <Pencil size={15} strokeWidth={1.75} />
                Edit
              </button>
            </>
          )}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-2 border border-border bg-surface px-4 py-2.5 text-xs text-red-400">
          <AlertCircle size={13} strokeWidth={2} />
          {error}
        </div>
      ) : null}

      <div className="w-full border border-border bg-surface">
        {members.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No ticket activity yet. Members appear here once they handle tickets in Reports.
          </p>
        ) : (
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="h-11 px-4 text-left align-middle font-medium">Member</th>
                <th className="h-11 px-4 text-left align-middle font-medium">Role</th>
                <th className="h-11 px-4 text-right align-middle font-medium">Base comp</th>
                <th className="h-11 px-4 text-right align-middle font-medium">Tickets</th>
                <th className="h-11 px-4 text-right align-middle font-medium">Bonus</th>
                <th className="h-11 px-4 text-right align-middle font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const r = resolved(m);
                const linked = editing && !!m.userId;
                const changed = editing && isChanged(m);
                const d = (m.userId && draft[m.userId]) || seedRow(m);
                return (
                  <tr
                    key={m.userId ?? m.channelId}
                    className="border-b border-border transition-colors hover:bg-surface-2"
                  >
                    <td className={`h-12 px-4 align-middle border-l-2 ${changed ? "border-foreground" : "border-transparent"}`}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} image={m.image} size={26} />
                        <span className="font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="h-12 px-4 align-middle">
                      {linked ? (
                        <CustomSelect
                          key={`${m.userId}:${m.roleId ?? "none"}`}
                          name={`role-${m.userId}`}
                          options={roleOptions}
                          defaultValue={d.roleId ?? ""}
                          className="w-44"
                          onChange={(v) => patch(m.userId as string, { roleId: v || null })}
                        />
                      ) : (
                        <span className={m.roleName ? "text-foreground" : "text-muted"}>
                          {m.roleName ?? "Unassigned"}
                        </span>
                      )}
                    </td>
                    <td className="h-12 px-4 text-right align-middle tabular-nums">
                      {linked ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={d.baseText}
                            disabled={pending}
                            placeholder="0"
                            onChange={(e) =>
                              patch(m.userId as string, { baseText: e.target.value.replace(/[^\d.]/g, "") })
                            }
                            className={cell}
                          />
                        </div>
                      ) : (
                        formatUSD(m.baseCompensation)
                      )}
                    </td>
                    <td className="h-12 px-4 text-right align-middle tabular-nums">
                      {linked ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={d.overrideText}
                          disabled={pending}
                          placeholder={String(m.tickets)}
                          title={`Live: ${m.tickets}. Leave blank to track Reports.`}
                          onChange={(e) =>
                            patch(m.userId as string, { overrideText: e.target.value.replace(/[^\d]/g, "") })
                          }
                          className={`${cell} ml-auto`}
                        />
                      ) : (
                        r.eff
                      )}
                    </td>
                    <td className="h-12 px-4 text-right align-middle tabular-nums">
                      {linked ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-muted">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={d.bonusText}
                              disabled={pending}
                              placeholder="0"
                              title="Bonus (adds to pay)"
                              onChange={(e) =>
                                patch(m.userId as string, { bonusText: e.target.value.replace(/[^\d.]/g, "") })
                              }
                              className={cell}
                            />
                          </div>
                          {r.disputeAmount > 0 ? (
                            <span
                              className="text-[10px] text-muted"
                              title="5% of this period's disputes, added to the bonus"
                            >
                              Disputes {formatUSD(r.disputeAmount)} &rarr; +{formatUSD(r.disputeBonus)}
                            </span>
                          ) : null}
                          {r.reviewCount > 0 ? (
                            <span
                              className="text-[10px] text-muted"
                              title="Flat bonus once assigned reviews pass the threshold"
                            >
                              Reviews {r.reviewCount} &rarr; +{formatUSD(r.reviewBonus)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end leading-tight">
                          <span>{formatUSD(m.bonus)}</span>
                          {m.disputeAmount > 0 ? (
                            <span className="text-[11px] text-muted">
                              Disputes {formatUSD(m.disputeAmount)} &rarr; +{formatUSD(m.disputeBonus)}
                            </span>
                          ) : null}
                          {m.reviewCount > 0 ? (
                            <span className="text-[11px] text-muted">
                              Reviews {m.reviewCount} &rarr; +{formatUSD(m.reviewBonus)}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="h-12 px-4 text-right align-middle font-medium tabular-nums">
                      {formatUSD(r.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="h-12 px-4 align-middle border-l-2 border-transparent">Total</td>
                <td className="h-12 px-4 align-middle" />
                <td className="h-12 px-4 text-right align-middle tabular-nums">{formatUSD(totals.base)}</td>
                <td className="h-12 px-4 text-right align-middle tabular-nums">{totals.tickets}</td>
                <td className="h-12 px-4 text-right align-middle tabular-nums">{formatUSD(totals.bonus)}</td>
                <td className="h-12 px-4 text-right align-middle tabular-nums">{formatUSD(totals.amount)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
