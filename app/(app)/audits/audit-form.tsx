"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import CustomSelect from "@/app/components/custom-select";
import { createAudit } from "./actions";
import { AUDIT_CRITERIA, FIVE_POINT_GUIDE, computeTotals, percentage, type Criterion } from "./criteria";

type Member = { id: string; name: string };
type Entry = { na: boolean; score: number; comment: string };

const EMPTY: Entry = { na: false, score: 0, comment: "" };

const labelCls = "mb-1 block text-xs text-muted";
const inputCls =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40";

function pctColor(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-amber-400";
  return "text-red-400";
}

function initialScores(): Record<string, Entry> {
  const m: Record<string, Entry> = {};
  for (const c of AUDIT_CRITERIA) m[c.key] = { ...EMPTY };
  return m;
}

export default function AuditForm({ members }: { members: Member[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [ticketDate, setTicketDate] = useState("");
  const [summary, setSummary] = useState("");
  const [scores, setScores] = useState<Record<string, Entry>>(initialScores);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const memberOptions = useMemo(
    () => [
      { value: "", label: "Select a member…" },
      ...members.map((m) => ({ value: m.id, label: m.name })),
    ],
    [members],
  );

  const { total, possible } = useMemo(
    () => computeTotals(AUDIT_CRITERIA.map((c) => ({ key: c.key, ...(scores[c.key] ?? EMPTY) }))),
    [scores],
  );
  const pct = percentage(total, possible);

  function setEntry(key: string, patch: Partial<Entry>) {
    setScores((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY), ...patch } }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!memberId) return setError("Choose the team member being reviewed.");
    if (!ticketNumber.trim()) return setError("Ticket # is required.");
    const memberName = members.find((m) => m.id === memberId)?.name ?? "";
    startTransition(async () => {
      const res = await createAudit({
        memberId,
        memberName,
        ticketNumber,
        ticketType,
        ticketDate: ticketDate || null,
        summary,
        scores: AUDIT_CRITERIA.map((c) => {
          const e2 = scores[c.key] ?? EMPTY;
          return { key: c.key, na: e2.na, score: e2.score, comment: e2.comment };
        }),
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push("/audits");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <section className="border border-border bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Team member</span>
            <CustomSelect name="member" options={memberOptions} defaultValue="" onChange={setMemberId} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ticketNumber">Ticket #</label>
            <input id="ticketNumber" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} placeholder="e.g. 48213" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ticketType">Ticket type</label>
            <input id="ticketType" value={ticketType} onChange={(e) => setTicketType(e.target.value)} placeholder="e.g. Billing, Technical…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ticketDate">Ticket date</label>
            <input id="ticketDate" type="date" value={ticketDate} onChange={(e) => setTicketDate(e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      <section className="border border-border bg-surface">
        {AUDIT_CRITERIA.map((c, i) => (
          <CriterionRow key={c.key} index={i + 1} c={c} entry={scores[c.key] ?? EMPTY} onChange={(p) => setEntry(c.key, p)} />
        ))}
      </section>

      <section className="border border-border bg-surface p-4">
        <label className={labelCls} htmlFor="summary">Overall feedback (optional)</label>
        <textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Summary feedback for the member…" className="w-full resize-y border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-foreground/40" />
      </section>

      <div className="sticky bottom-0 flex items-center justify-between gap-4 border border-border bg-surface p-4">
        <div className="leading-tight">
          <p className="text-xs text-muted">Score</p>
          <p className="text-lg font-semibold tabular-nums">
            {total} / {possible} <span className={pctColor(pct)}>· {pct}%</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error ? <span className="text-xs text-red-400">{error}</span> : null}
          <button type="submit" disabled={pending} className="btn-wipe btn-wipe-dark flex h-9 shrink-0 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50">
            {pending ? <Loader2 size={15} strokeWidth={2} className="animate-spin" /> : <Check size={15} strokeWidth={2} />}
            Save audit
          </button>
        </div>
      </div>
    </form>
  );
}

function CriterionRow({
  index,
  c,
  entry,
  onChange,
}: {
  index: number;
  c: Criterion;
  entry: Entry;
  onChange: (patch: Partial<Entry>) => void;
}) {
  const options = c.maxPoints === 5 ? [0, 1, 2, 3, 4, 5] : [0, 1];
  return (
    <div className="border-b border-border p-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            <span className="text-muted">{index}.</span> {c.label}{" "}
            <span className="text-[11px] text-muted">({c.maxPoints} pt{c.maxPoints > 1 ? "s" : ""})</span>
          </p>
          {c.example ? <p className="mt-0.5 text-xs italic text-muted">e.g. {c.example}</p> : null}
          {c.maxPoints === 5 ? <p className="mt-0.5 text-[11px] text-muted">{FIVE_POINT_GUIDE}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {c.allowNa ? (
            <ScoreBtn active={entry.na} onClick={() => onChange({ na: true })}>N/A</ScoreBtn>
          ) : null}
          {options.map((n) => (
            <ScoreBtn key={n} active={!entry.na && entry.score === n} onClick={() => onChange({ na: false, score: n })}>
              {c.maxPoints === 1 ? (n === 1 ? "Yes" : "No") : n}
            </ScoreBtn>
          ))}
        </div>
      </div>
      <input
        value={entry.comment}
        onChange={(e) => onChange({ comment: e.target.value })}
        placeholder="Comments / feedback (optional)"
        className="mt-2 h-8 w-full border border-border bg-surface-2 px-3 text-xs text-foreground outline-none placeholder:text-muted focus:border-foreground/40"
      />
    </div>
  );
}

function ScoreBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 min-w-[2rem] items-center justify-center border px-2 text-xs font-medium transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
