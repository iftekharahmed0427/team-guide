"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Link2,
  MessageSquare,
} from "lucide-react";
import {
  AUDIT_CRITERIA,
  FIVE_POINT_GUIDE,
  TICKET_TYPES,
  computeTotals,
  percentage,
  type Criterion,
} from "@/app/(app)/audits/criteria";

// The scorecard form from the "new-audit-form" Figma frame (node 159:4): the
// ticket's details, the six 5-point quality criteria, the six 1-point compliance
// checks, a ticket link, overall feedback, and a sticky footer that keeps the
// running score.
//
// Serves both /v2/audits/new and the edit page behind a review. There is no
// separate frame for editing, and none is needed: the live app reuses one form
// too, and the only differences are the title, the back target and the save
// label, all passed in.
//
// Client-side only. Nothing saves - createAudit and updateAudit belong to the
// live pages, and they are admin-gated - but the score in the footer is live, so
// the rubric can be exercised properly.

export type Member = { id: string; name: string };

type Entry = { na: boolean; score: number; comment: string };

/** An audit being edited, already split into the shape the form holds. */
export type InitialAudit = {
  memberId: string;
  ticketNumber: string;
  ticketType: string;
  ticketDate: string;
  ticketLink: string;
  summary: string;
  scores: { key: string; na: boolean; score: number; comment: string }[];
};

const EMPTY: Entry = { na: false, score: 0, comment: "" };

function buildEntries(initial?: InitialAudit): Record<string, Entry> {
  const entries = Object.fromEntries(
    AUDIT_CRITERIA.map((c) => [c.key, { ...EMPTY }]),
  ) as Record<string, Entry>;
  for (const s of initial?.scores ?? []) {
    if (entries[s.key])
      entries[s.key] = { na: s.na, score: s.score, comment: s.comment };
  }
  return entries;
}

// The frame splits the rubric in two: the 5-pointers are cards, the 1-pointers
// are rows in a single table. criteria.ts already orders them that way.
const QUALITY = AUDIT_CRITERIA.filter((c) => c.maxPoints === 5);
const COMPLIANCE = AUDIT_CRITERIA.filter((c) => c.maxPoints === 1);

const field = "flex min-w-0 flex-1 flex-col gap-[8px]";
const fieldLabel = "text-[13px] font-semibold text-[#94a3b8]";
const input =
  "w-full rounded-[8px] border border-[#243033]! bg-[#0f141a] px-[16px] py-[12px] text-[14px] font-normal text-[#e2e8f0] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#8fb0a7]!";
const card = "rounded-[12px] border border-[#243033]! bg-[#171e24]";
const chip =
  "flex cursor-pointer items-center justify-center rounded-[6px] border px-[12px] py-[8px] text-[13px] font-semibold transition-colors";

// The frame quotes each rubric example and tints the quote; criteria.ts stores
// it unquoted.
function Example({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <>
      <span className={muted ? "text-[#64748b]" : "text-[#94a3b8]"}>e.g. </span>
      <span className="text-[#a3b18a]">{`'${text}'`}</span>
    </>
  );
}

function Comment({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  return (
    <div className="flex w-full items-center gap-[8px] rounded-[6px] border border-[#243033]! bg-[#0f141a] px-[16px] py-[10px] transition-colors focus-within:border-[#8fb0a7]!">
      <MessageSquare
        size={14}
        strokeWidth={2}
        className="shrink-0 text-[#64748b]"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} comment`}
        placeholder="Comments / feedback (optional)"
        className="min-w-0 flex-1 bg-transparent text-[12px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
      />
    </div>
  );
}

export default function V2AuditForm({
  members,
  backHref,
  initial,
}: {
  members: Member[];
  /** Where Back goes: the grid when new, the review when editing. */
  backHref: string;
  initial?: InitialAudit;
}) {
  const [memberId, setMemberId] = useState(initial?.memberId ?? "");
  const [ticketNumber, setTicketNumber] = useState(initial?.ticketNumber ?? "");
  const [ticketType, setTicketType] = useState(initial?.ticketType ?? "");
  const [ticketDate, setTicketDate] = useState(initial?.ticketDate ?? "");
  const [ticketLink, setTicketLink] = useState(initial?.ticketLink ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    buildEntries(initial),
  );

  const set = (key: string, patch: Partial<Entry>) =>
    setEntries((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const { total, possible } = computeTotals(
    AUDIT_CRITERIA.map((c) => ({ key: c.key, ...entries[c.key] })),
  );
  const pct = percentage(total, possible);

  // The frame only draws the empty form, where the percentage is green at 0%.
  // Banded instead, so a half-scored audit does not read as a good one at the
  // moment it is about to be saved.
  const pctColour =
    pct >= 90
      ? "text-[#10b981]"
      : pct >= 70
        ? "text-[#a3b18a]"
        : "text-[#ef4444]";

  // A chip is on when its value is the criterion's current answer. The frame
  // draws the default state, which is a plain 0 - so 0 and No start selected.
  const chosen = (c: Criterion, value: "na" | number) =>
    value === "na"
      ? entries[c.key].na
      : !entries[c.key].na && entries[c.key].score === value;

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-[28px] p-[32px]">
        <div className="flex items-center justify-between gap-[24px]">
          <div className="flex min-w-0 flex-col gap-[6px]">
            <h1 className="text-[28px] font-bold text-[#e2e8f0]">
              {initial ? "Edit audit" : "New audit"}
            </h1>
            <p className="truncate text-[14px] font-normal text-[#94a3b8]">
              {initial
                ? `Ticket #${initial.ticketNumber}`
                : "Score a support ticket against the QA rubric"}
            </p>
          </div>
          {/* The frame's label reads "← Back"; the icon carries the arrow. */}
          <Link
            href={backHref}
            className="flex shrink-0 items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back
          </Link>
        </div>

        <div className="h-px w-full bg-[#243033]" />

        <div className={`flex flex-col gap-[20px] p-[24px] ${card}`}>
          <div className="flex items-start gap-[20px]">
            <div className={field}>
              <label htmlFor="member" className={fieldLabel}>
                Team member
              </label>
              <div className="relative">
                <select
                  id="member"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className={`appearance-none pr-[44px] ${input} ${memberId ? "" : "text-[#94a3b8]!"}`}
                >
                  <option value="">Select a member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 right-[16px] -translate-y-1/2 text-[#94a3b8]"
                />
              </div>
            </div>

            <div className={field}>
              <label htmlFor="ticket" className={fieldLabel}>
                Ticket #
              </label>
              <input
                id="ticket"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="e.g. 48213"
                className={input}
              />
            </div>
          </div>

          <div className="flex items-start gap-[20px]">
            <div className={field}>
              <label htmlFor="type" className={fieldLabel}>
                Ticket type
              </label>
              <div className="relative">
                <select
                  id="type"
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className={`appearance-none pr-[44px] ${input} ${ticketType ? "" : "text-[#94a3b8]!"}`}
                >
                  <option value="">Select a type...</option>
                  {TICKET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 right-[16px] -translate-y-1/2 text-[#94a3b8]"
                />
              </div>
            </div>

            <div className={field}>
              <label htmlFor="date" className={fieldLabel}>
                Ticket date
              </label>
              <input
                id="date"
                type="date"
                value={ticketDate}
                onChange={(e) => setTicketDate(e.target.value)}
                className={input}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[20px]">
          <div className="flex flex-col gap-[4px]">
            <p className="text-[18px] font-bold text-[#8fb0a7]">
              Quality Criteria
            </p>
            <p className="text-[13px] font-normal text-[#94a3b8]">
              Core support standards scored on a granular 5-point scale
            </p>
          </div>

          <div className="flex flex-col gap-[16px]">
            {QUALITY.map((criterion, i) => (
              <div
                key={criterion.key}
                className={`flex flex-col gap-[16px] p-[20px] ${card}`}
              >
                <div className="flex items-start justify-between gap-[24px]">
                  <div className="flex min-w-0 max-w-[560px] flex-1 flex-col gap-[6px]">
                    <p className="text-[14px] font-medium text-[#e2e8f0]">
                      {i + 1}. {criterion.label}{" "}
                      <span className="text-[12px] text-[#64748b]">
                        (5 pts)
                      </span>
                    </p>
                    {criterion.example ? (
                      <p className="w-full rounded-[4px] bg-[#0f141a] px-[10px] py-[6px] text-[12px] font-normal italic">
                        <Example text={criterion.example} />
                      </p>
                    ) : null}
                  </div>

                  <div
                    className="flex shrink-0 items-center gap-[4px]"
                    role="group"
                  >
                    {(["na", 0, 1, 2, 3, 4, 5] as const).map((value) => {
                      const on = chosen(criterion, value);
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            set(
                              criterion.key,
                              value === "na"
                                ? { na: true }
                                : { na: false, score: value },
                            )
                          }
                          className={`min-w-[42px] ${chip} ${
                            on
                              ? "border-[#8fb0a7]! bg-[#8fb0a7] text-[#0e1217]"
                              : "border-[#243033]! bg-[#0f141a] text-[#e2e8f0] hover:border-[#2f3d42]!"
                          }`}
                        >
                          {value === "na" ? "N/A" : value}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[12px] font-normal text-[#64748b]">
                  {FIVE_POINT_GUIDE}
                </p>

                <Comment
                  label={criterion.label}
                  value={entries[criterion.key].comment}
                  onChange={(comment) => set(criterion.key, { comment })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[20px] pt-[12px]">
          <div className="flex flex-col gap-[4px]">
            <p className="text-[18px] font-bold text-[#8fb0a7]">
              Compliance Checks
            </p>
            <p className="text-[13px] font-normal text-[#94a3b8]">
              Essential protocol verification scored as binary Yes/No
            </p>
          </div>

          <div className={`flex flex-col px-[24px] py-[8px] ${card}`}>
            {COMPLIANCE.map((criterion, i) => (
              <div
                key={criterion.key}
                className="flex flex-col gap-[12px] border-b border-[#243033]! p-[16px]"
              >
                <div className="flex items-center justify-between gap-[24px]">
                  <div className="flex min-w-0 max-w-[620px] flex-1 flex-col gap-[4px]">
                    <p className="text-[14px] font-medium text-[#e2e8f0]">
                      {QUALITY.length + i + 1}. {criterion.label}{" "}
                      <span className="text-[12px] text-[#64748b]">(1 pt)</span>
                    </p>
                    {criterion.example ? (
                      <p className="text-[12px] font-normal italic">
                        <Example text={criterion.example} muted />
                      </p>
                    ) : null}
                  </div>

                  <div
                    className="flex shrink-0 items-center gap-[4px]"
                    role="group"
                  >
                    {(
                      [
                        // Only No is drawn selected in the frame; Yes and N/A
                        // take the same tinted-outline treatment in their own
                        // colours.
                        {
                          value: "na",
                          label: "N/A",
                          on: "border-[#94a3b8]! bg-[#94a3b8]/10 text-[#94a3b8]",
                        },
                        {
                          value: 0,
                          label: "No",
                          on: "border-[#ef4444]! bg-[#ef4444]/10 text-[#ef4444]",
                        },
                        {
                          value: 1,
                          label: "Yes",
                          on: "border-[#10b981]! bg-[#10b981]/10 text-[#10b981]",
                        },
                      ] as const
                    ).map(({ value, label, on }) => {
                      const active = chosen(criterion, value);
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            set(
                              criterion.key,
                              value === "na"
                                ? { na: true }
                                : { na: false, score: value },
                            )
                          }
                          className={`min-w-[54px] px-[16px]! ${chip} ${
                            active
                              ? on
                              : "border-[#243033]! bg-[#0f141a] text-[#e2e8f0] hover:border-[#2f3d42]!"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Comment
                  label={criterion.label}
                  value={entries[criterion.key].comment}
                  onChange={(comment) => set(criterion.key, { comment })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[12px]">
          <p className="text-[15px] font-bold text-[#e2e8f0]">Ticket link</p>
          <div className={`p-[20px] ${card}`}>
            <div className="flex w-full items-center gap-[10px] rounded-[8px] border border-[#243033]! bg-[#0f141a] px-[16px] py-[12px] transition-colors focus-within:border-[#8fb0a7]!">
              <Link2
                size={16}
                strokeWidth={2}
                className="shrink-0 text-[#94a3b8]"
              />
              <input
                value={ticketLink}
                onChange={(e) => setTicketLink(e.target.value)}
                aria-label="Ticket link"
                placeholder="https://dashboard.tickets.bot/manage/..."
                className="min-w-0 flex-1 bg-transparent text-[14px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#94a3b8]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[12px]">
          <p className="text-[15px] font-bold text-[#e2e8f0]">
            Overall feedback (optional)
          </p>
          <div className={`p-[20px] ${card}`}>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              aria-label="Overall feedback"
              placeholder="Summary feedback for the member..."
              className="h-[140px] w-full resize-none rounded-[8px] border border-[#243033]! bg-[#0f141a] p-[16px] text-[14px] font-normal text-[#e2e8f0] outline-none transition-colors placeholder:text-[#64748b] focus:border-[#8fb0a7]!"
            />
          </div>
        </div>
      </div>

      {/* Full-bleed, so it sits outside the page padding and sticks to the
          bottom of the workspace while the form scrolls under it. */}
      <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-[24px] border-t border-[#243033]! bg-[#171e24] px-[32px] py-[20px]">
        <div className="flex items-center gap-[16px]">
          <p className="text-[14px] font-medium text-[#94a3b8]">Score</p>
          <p className="rounded-[6px] border border-[#243033]! bg-[#0f141a] px-[14px] py-[8px] text-[14px] font-semibold text-[#e2e8f0]">
            {total} / {possible}{" "}
            <span className={`font-bold ${pctColour}`}>· {pct}%</span>
          </p>
        </div>
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] bg-[#10b981] px-[24px] py-[12px] text-[14px] font-bold text-[#0e1217] transition-colors hover:bg-[#34d399]"
        >
          <Check size={16} strokeWidth={2.5} />
          {initial ? "Save changes" : "Save audit"}
        </button>
      </div>
    </div>
  );
}
