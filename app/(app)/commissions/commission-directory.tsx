"use client";

import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import Avatar from "@/app/components/avatar";
import CommissionReview from "./commission-review";
import { deleteCommission } from "./actions";

export type CommissionItem = {
  id: string;
  ticketName: string;
  customerEmail: string;
  status: string;
  renewalDate: string | null;
  productPrice: number | null;
  commissionRate: number;
  reviewNote: string;
  createdAtLabel: string;
};

export type MemberData = {
  id: string;
  name: string;
  image: string | null;
  approved: number;
  pending: number;
  denied: number;
  earnings: number;
  commissions: CommissionItem[];
};

function formatUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const BADGE: Record<string, string> = {
  approved: "border-emerald-500/40 text-emerald-400",
  denied: "border-red-500/40 text-red-400",
  pending: "border-border text-muted",
};

function StatusBadge({ status }: { status: string }) {
  const label = status === "approved" ? "Approved" : status === "denied" ? "Denied" : "Pending";
  return (
    <span
      className={`shrink-0 border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${BADGE[status] ?? BADGE.pending}`}
    >
      {label}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="leading-tight">
      <p className={`text-base font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function MemberCard({ member, onOpen }: { member: MemberData; onOpen: () => void }) {
  const total = member.commissions.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 border border-border bg-surface p-4 text-left transition-colors hover:border-foreground/40"
    >
      <div className="flex items-center gap-3">
        <Avatar name={member.name} image={member.image} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
          <p className="text-xs text-muted">
            {total} commission{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
        <Stat label="Active" value={member.approved} tone="text-emerald-400" />
        <Stat label="Pending" value={member.pending} tone="text-foreground" />
        <Stat label="Denied" value={member.denied} tone="text-red-400" />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted">Earnings</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatUSD(member.earnings)}
        </span>
      </div>
    </button>
  );
}

function CommissionRow({ c }: { c: CommissionItem }) {
  return (
    <div className="border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{c.ticketName}</p>
          <p className="truncate text-xs text-muted">{c.customerEmail}</p>
          <p className="mt-2 text-xs text-muted">{c.createdAtLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={c.status} />
          <form action={deleteCommission} className="flex">
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              aria-label="Delete commission"
              className="flex h-7 w-7 items-center justify-center border border-transparent text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>
      <CommissionReview
        c={{
          id: c.id,
          status: c.status,
          renewalDate: c.renewalDate,
          productPrice: c.productPrice,
          commissionRate: c.commissionRate,
          reviewNote: c.reviewNote,
        }}
      />
    </div>
  );
}

export default function CommissionDirectory({ members }: { members: MemberData[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const member = members.find((m) => m.id === selectedId) ?? null;

  if (members.length === 0) {
    return (
      <div className="border border-border bg-surface p-10 text-center text-sm text-muted">
        No commissions yet.
      </div>
    );
  }

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
                {member.approved} active · {member.pending} pending · {member.denied} denied ·{" "}
                {formatUSD(member.earnings)} earned
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {member.commissions.map((c) => (
            <CommissionRow key={c.id} c={c} />
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
