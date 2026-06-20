"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, ImageUp, X } from "lucide-react";
import CustomSelect from "@/app/components/custom-select";
import { imageToDataUrl, imageFilesFrom } from "@/app/components/editor-images";
import { createAudit, updateAudit } from "./actions";
import { AUDIT_CRITERIA, FIVE_POINT_GUIDE, TICKET_TYPES, computeTotals, percentage, type Criterion } from "./criteria";

type Member = { id: string; name: string };
type Entry = { na: boolean; score: number; comment: string };
type ExistingShot = { id: string; src: string };

export type InitialAudit = {
  id: string;
  memberId: string;
  ticketNumber: string;
  ticketType: string;
  ticketDate: string;
  summary: string;
  scores: { key: string; na: boolean; score: number; comment: string }[];
  screenshots: ExistingShot[];
};

const EMPTY: Entry = { na: false, score: 0, comment: "" };
const MAX_SHOTS = 8;

const labelCls = "mb-1 block text-xs text-muted";
const inputCls =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40";

function pctColor(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-amber-400";
  return "text-red-400";
}

function buildScores(initial?: InitialAudit): Record<string, Entry> {
  const m: Record<string, Entry> = {};
  for (const c of AUDIT_CRITERIA) m[c.key] = { ...EMPTY };
  for (const s of initial?.scores ?? []) {
    if (m[s.key]) m[s.key] = { na: s.na, score: s.score, comment: s.comment };
  }
  return m;
}

export default function AuditForm({ members, initial }: { members: Member[]; initial?: InitialAudit }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(initial?.memberId ?? "");
  const [ticketNumber, setTicketNumber] = useState(initial?.ticketNumber ?? "");
  const [ticketType, setTicketType] = useState(initial?.ticketType ?? "");
  const [ticketDate, setTicketDate] = useState(initial?.ticketDate ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [scores, setScores] = useState<Record<string, Entry>>(() => buildScores(initial));
  const [existingShots, setExistingShots] = useState<ExistingShot[]>(initial?.screenshots ?? []);
  const [newShots, setNewShots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const shotCount = existingShots.length + newShots.length;

  async function addFiles(files: File[]) {
    if (files.length === 0) return;
    setError(null);
    const room = Math.max(0, MAX_SHOTS - shotCount);
    const urls: string[] = [];
    for (const f of files.slice(0, room)) {
      try {
        urls.push(await imageToDataUrl(f, 1400));
      } catch {
        // skip an image that fails to decode
      }
    }
    if (urls.length) {
      setNewShots((s) => [...s, ...urls].slice(0, Math.max(0, MAX_SHOTS - existingShots.length)));
    }
  }

  const memberOptions = useMemo(
    () => [
      { value: "", label: "Select a member…" },
      ...members.map((m) => ({ value: m.id, label: m.name })),
    ],
    [members],
  );

  const typeOptions = useMemo(
    () => [{ value: "", label: "Select a type…" }, ...TICKET_TYPES.map((t) => ({ value: t, label: t }))],
    [],
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
    const scoreList = AUDIT_CRITERIA.map((c) => {
      const e2 = scores[c.key] ?? EMPTY;
      return { key: c.key, na: e2.na, score: e2.score, comment: e2.comment };
    });
    startTransition(async () => {
      const res = initial
        ? await updateAudit({
            id: initial.id,
            memberId,
            memberName,
            ticketNumber,
            ticketType,
            ticketDate: ticketDate || null,
            summary,
            scores: scoreList,
            keepScreenshotIds: existingShots.map((s) => s.id),
            newScreenshots: newShots,
          })
        : await createAudit({
            memberId,
            memberName,
            ticketNumber,
            ticketType,
            ticketDate: ticketDate || null,
            summary,
            scores: scoreList,
            screenshots: newShots,
          });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push(initial ? `/audits/${initial.id}` : "/audits");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <section className="border border-border bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Team member</span>
            <CustomSelect name="member" options={memberOptions} defaultValue={memberId} onChange={setMemberId} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ticketNumber">Ticket #</label>
            <input id="ticketNumber" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} placeholder="e.g. 48213" className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>Ticket type</span>
            <CustomSelect name="ticketType" options={typeOptions} defaultValue={ticketType} onChange={setTicketType} />
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

      <section
        className="border border-border bg-surface p-4"
        onPaste={(e) => {
          const files = imageFilesFrom(e.clipboardData);
          if (files.length > 0) {
            e.preventDefault();
            void addFiles(files);
          }
        }}
      >
        <span className={labelCls}>Screenshots (optional)</span>
        <div className="flex flex-wrap gap-2">
          {existingShots.map((shot) => (
            <Thumb
              key={shot.id}
              src={shot.src}
              onRemove={() => setExistingShots((s) => s.filter((x) => x.id !== shot.id))}
            />
          ))}
          {newShots.map((src, i) => (
            <Thumb
              key={`new-${i}`}
              src={src}
              onRemove={() => setNewShots((s) => s.filter((_, j) => j !== i))}
            />
          ))}
          {shotCount < MAX_SHOTS ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 border border-dashed border-border text-[11px] text-muted transition-colors hover:border-muted hover:text-foreground"
            >
              <ImageUp size={16} strokeWidth={1.75} />
              Add
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(Array.from(e.target.files ?? []))}
        />
        <p className="mt-2 text-[11px] text-muted">Up to {MAX_SHOTS}. Choose images or paste a screenshot.</p>
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
            {initial ? "Save changes" : "Save audit"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-20 w-20 border border-border object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove screenshot"
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center border border-border bg-surface text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
      >
        <X size={12} strokeWidth={2} />
      </button>
    </div>
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
