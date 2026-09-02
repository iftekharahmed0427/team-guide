"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Avatar from "@/app/components/avatar";

export type AuditItem = {
  id: string;
  ticketNumber: string;
  ticketType: string;
  totalScore: number;
  possibleScore: number;
  createdAtLabel: string;
};

export type MemberData = {
  id: string;
  name: string;
  image: string | null;
  count: number;
  avgPct: number;
  audits: AuditItem[];
};

function pctColor(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-amber-400";
  return "text-red-400";
}

function rowPct(a: AuditItem): number {
  return a.possibleScore > 0 ? Math.round((a.totalScore / a.possibleScore) * 100) : 0;
}

function MemberCard({ member, onOpen }: { member: MemberData; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full cursor-pointer flex-col gap-3 border border-border bg-surface p-4 text-left transition-colors hover:border-foreground/40 hover:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <Avatar name={member.name} image={member.image} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
          <p className="text-xs text-muted">
            {member.count} audit{member.count === 1 ? "" : "s"}
          </p>
        </div>
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          className="shrink-0 text-muted transition-colors group-hover:text-foreground"
        />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted">Average score</span>
        <span className={`text-sm font-semibold tabular-nums ${pctColor(member.avgPct)}`}>
          {member.avgPct}%
        </span>
      </div>
    </button>
  );
}

function AuditRow({ a }: { a: AuditItem }) {
  const pct = rowPct(a);
  return (
    <Link
      href={`/audits/${a.id}`}
      className="block border border-border bg-surface p-4 transition-colors hover:border-muted"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Ticket #{a.ticketNumber}</p>
          {a.ticketType ? <p className="truncate text-xs text-muted">{a.ticketType}</p> : null}
        </div>
        <div className="shrink-0 text-right leading-tight">
          <p className="text-sm font-semibold tabular-nums">
            {a.totalScore}/{a.possibleScore} <span className={pctColor(pct)}>· {pct}%</span>
          </p>
          <p className="text-[11px] text-muted">{a.createdAtLabel}</p>
        </div>
      </div>
    </Link>
  );
}

export default function AuditDirectory({ members }: { members: MemberData[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const member = members.find((m) => m.id === selectedId) ?? null;

  if (member) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft size={15} strokeWidth={1.75} />
            All members
          </button>
          <div className="flex items-center gap-3">
            <Avatar name={member.name} image={member.image} size={28} />
            <div className="leading-tight">
              <p className="text-sm font-medium text-foreground">{member.name}</p>
              <p className="text-xs text-muted">
                {member.count} audit{member.count === 1 ? "" : "s"} · {member.avgPct}% avg
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {member.audits.map((a) => (
            <AuditRow key={a.id} a={a} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <MemberCard key={m.id} member={m} onOpen={() => setSelectedId(m.id)} />
      ))}
    </div>
  );
}
