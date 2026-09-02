"use client";

import { AlertCircle, ExternalLink, Loader2, Search } from "lucide-react";
import {
  formatMB,
  panelServerUrl,
  whmcsServiceUrl,
  type LookupServer,
} from "@/lib/tools-constants";

// Shared chrome for the three v2 panel lookups. No Figma frame draws these, so
// they are composed from the v2 design system - the disputes log card for the
// search form, the payroll table for the server list, and the audit badge set
// for the status pills.
//
// The three tools are the same screen three times over (a search card, then a
// result), so everything that repeats lives here and each page is left holding
// only what is different about it.
//
// constants.ts is the client-safe half of the live tools: shapes, link builders
// and formatters, with no panel credentials and no database import.

// globals.css sets an unlayered `* { border-color: var(--border) }`, which wins
// over Tailwind's layered border utilities, so every border here is marked
// important to opt out of the app-wide default.
export const CARD = "rounded-[12px] border border-[#243033]! bg-[#171e24]";
export const FIELD = "flex min-w-0 flex-1 flex-col gap-[8px]";
export const LABEL = "text-[12px] font-semibold text-[#94a3b8]";
export const INPUT =
  "w-full rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[14px] py-[11px] text-[14px] font-normal text-[#e2e8f0] outline-none transition-colors placeholder:text-[#64748b] focus:border-[#8fb0a7]! disabled:opacity-60";

/** The search card every tool opens with: fields, then a hint and the button. */
export function LookupCard({
  title,
  hint,
  pending,
  onSubmit,
  children,
}: {
  title: string;
  hint: string;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`flex flex-col gap-[20px] p-[24px] ${CARD}`}
    >
      <p className="text-[16px] font-bold text-[#e2e8f0]">{title}</p>

      <div className="flex items-start gap-[16px]">{children}</div>

      <div className="h-px w-full bg-[#243033]" />

      <div className="flex items-center justify-between gap-[16px]">
        <p className="min-w-0 flex-1 text-[13px] font-normal text-[#64748b]">
          {hint}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <Search size={14} strokeWidth={2} />
          )}
          {pending ? "Looking up" : "Look up"}
        </button>
      </div>
    </form>
  );
}

/** Panel status: healthy, suspended, or one of the transient panel states. */
export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-[#10b981]/15 text-[#10b981]"
      : status === "suspended"
        ? "bg-[#ef4444]/15 text-[#ef4444]"
        : "bg-[#f59e0b]/15 text-[#f59e0b]";
  return (
    <span
      className={`shrink-0 rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold uppercase ${tone}`}
    >
      {status}
    </span>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-[10px] rounded-[12px] border border-[#ef4444]/40! bg-[#ef4444]/[0.06] px-[20px] py-[16px] text-[14px] font-medium text-[#ef4444]">
      <AlertCircle size={16} strokeWidth={2} className="shrink-0" />
      {message}
    </div>
  );
}

/** The idle and no-match states, drawn like the disputes empty card. */
export function EmptyState({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  title: string;
  sub: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-[16px] p-[48px] ${CARD}`}
    >
      <span className="rounded-full bg-[#0e1217] p-[16px]">
        <Icon size={24} strokeWidth={2} className="text-[#64748b]" />
      </span>
      <div className="flex w-full flex-col items-center gap-[6px] text-center">
        <p className="text-[15px] font-semibold text-[#e2e8f0]">{title}</p>
        <p className="text-[13px] font-normal text-[#64748b]">{sub}</p>
      </div>
    </div>
  );
}

/** One label/value tile in a result grid. */
export function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px] rounded-[8px] bg-[#0e1217] p-[14px]">
      <p className="text-[11px] font-bold text-[#64748b] uppercase">{label}</p>
      <p
        className={`truncate text-[14px] font-semibold text-[#e2e8f0] ${mono ? "font-mono" : ""}`}
      >
        {value || <span className="font-normal text-[#64748b]">-</span>}
      </p>
    </div>
  );
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-4 gap-[12px] p-[24px]">{children}</div>;
}

/** A secondary button that leaves the portal for the panel or WHMCS. */
export function PanelLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex shrink-0 items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[16px] py-[10px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
    >
      <ExternalLink size={14} strokeWidth={2} className="text-[#94a3b8]" />
      {children}
    </a>
  );
}

export function SectionCaption({ children }: { children: React.ReactNode }) {
  return (
    <p className="pb-[4px] text-[12px] font-bold text-[#8fb0a7] uppercase">
      {children}
    </p>
  );
}

/** The result header shared by all three: icon, title, subtitle, then a slot. */
export function ResultHeader({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-[16px] border-b border-[#243033]! p-[24px]">
      <div className="flex min-w-0 items-center gap-[14px]">
        <span className="shrink-0 rounded-[10px] bg-[#0e1217] p-[12px]">
          <Icon size={18} strokeWidth={2} className="text-[#8fb0a7]" />
        </span>
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p
            title={title}
            className="truncate text-[18px] font-bold text-[#e2e8f0]"
          >
            {title}
          </p>
          <p className="truncate text-[13px] font-normal text-[#94a3b8]">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-[10px]">{children}</div>
    </div>
  );
}

function RowLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-[4px] text-[12px] font-semibold text-[#94a3b8] transition-colors hover:text-[#8fb0a7]"
    >
      <ExternalLink size={12} strokeWidth={2} />
      {children}
    </a>
  );
}

// The payroll table's columns, re-cut for servers. Name and Owner take the
// slack so the right-hand columns stay flush at any window width; the whole
// thing scrolls sideways below its natural width rather than crushing.
//
// Each column carries its own gutter here rather than the cells adding one
// case by case. That way a heading always sits over its own values, and no
// column can run into the one beside it - Disk and Service used to read as a
// single "DISKSERVICE" heading over two numbers with nothing between them.
// The gutter is inside the width, so the totals below are unchanged.
const COL = {
  id: "w-[64px] pr-[12px]",
  name: "min-w-[150px] flex-1 pr-[16px]",
  identifier: "w-[104px] pr-[16px]",
  owner: "min-w-[170px] flex-1 pr-[16px]",
  status: "w-[104px] pr-[12px]",
  ram: "w-[104px] pr-[20px] text-right",
  disk: "w-[104px] pr-[20px] text-right",
  service: "w-[96px] pr-[12px]",
  links: "w-[128px] text-right",
};

export function ServerTable({
  servers,
  showOwner = false,
  emptyLabel = "No servers.",
}: {
  servers: LookupServer[];
  showOwner?: boolean;
  emptyLabel?: string;
}) {
  if (servers.length === 0) {
    return (
      <div className={`p-[32px] text-center ${CARD}`}>
        <p className="text-[13px] font-normal text-[#64748b]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto p-[16px] ${CARD}`}>
      {/* The natural width of the columns, so the table scrolls sideways in
          place rather than crushing. Dropping Owner takes its share back. */}
      <div
        className={`flex flex-col ${showOwner ? "min-w-[1024px]" : "min-w-[854px]"}`}
      >
        <div className="flex items-center rounded-[6px] bg-[#0e1217] px-[16px] py-[12px] text-[11px] font-bold text-[#94a3b8] uppercase">
          <p className={COL.id}>ID</p>
          <p className={COL.name}>Name</p>
          <p className={COL.identifier}>Identifier</p>
          {showOwner ? <p className={COL.owner}>Owner</p> : null}
          <p className={COL.status}>Status</p>
          <p className={COL.ram}>RAM</p>
          <p className={COL.disk}>Disk</p>
          <p className={COL.service}>Service ID</p>
          <p className={COL.links}>Links</p>
        </div>

        {servers.map((s) => (
          <div
            key={s.id}
            className="flex items-center border-b border-[#243033]! px-[16px] py-[14px] transition-colors hover:bg-white/[0.02]"
          >
            <p
              className={`font-mono text-[13px] font-normal text-[#94a3b8] tabular-nums ${COL.id}`}
            >
              {s.id}
            </p>
            <p
              title={s.name}
              className={`truncate text-[14px] font-semibold text-[#e2e8f0] ${COL.name}`}
            >
              {s.name}
            </p>
            <p
              className={`truncate font-mono text-[13px] font-normal text-[#94a3b8] ${COL.identifier}`}
            >
              {s.identifier}
            </p>
            {showOwner ? (
              <p
                title={s.ownerEmail ?? ""}
                className={`truncate text-[13px] font-normal text-[#94a3b8] ${COL.owner}`}
              >
                {s.ownerEmail ?? "-"}
              </p>
            ) : null}
            <div className={COL.status}>
              <StatusPill status={s.status} />
            </div>
            <p
              className={`text-[13px] font-normal text-[#e2e8f0] tabular-nums ${COL.ram}`}
            >
              {formatMB(s.memory)}
            </p>
            <p
              className={`text-[13px] font-normal text-[#e2e8f0] tabular-nums ${COL.disk}`}
            >
              {formatMB(s.disk)}
            </p>
            <p
              className={`truncate font-mono text-[13px] font-normal text-[#94a3b8] ${COL.service}`}
            >
              {s.externalId ?? "-"}
            </p>
            <div
              className={`flex items-center justify-end gap-[12px] ${COL.links}`}
            >
              {s.externalId ? (
                <RowLink href={whmcsServiceUrl(s.externalId)}>WHMCS</RowLink>
              ) : null}
              <RowLink href={panelServerUrl(s.id)}>Panel</RowLink>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
