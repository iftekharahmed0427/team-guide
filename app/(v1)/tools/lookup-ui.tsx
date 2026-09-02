"use client";

import { AlertCircle, ExternalLink, Loader2, Search } from "lucide-react";
import {
  formatMB,
  panelServerUrl,
  whmcsServiceUrl,
  type LookupServer,
} from "@/lib/tools-constants";

// Shared chrome for the three panel lookups so the forms, tables and states all
// look the same. Styling follows the rest of the portal: flat, squared, bordered.

export const labelCls = "mb-1 block text-xs text-muted";
export const inputCls =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40";

const STATUS_TONE: Record<string, string> = {
  active: "border-emerald-500/40 text-emerald-400",
  suspended: "border-red-500/40 text-red-400",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "border-amber-500/40 text-amber-400";
  return (
    <span
      className={`inline-block shrink-0 border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tone}`}
    >
      {status}
    </span>
  );
}

export function LookupButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-wipe btn-wipe-dark flex h-9 shrink-0 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
    >
      {pending ? (
        <Loader2 size={15} strokeWidth={2} className="animate-spin" />
      ) : (
        <Search size={15} strokeWidth={2} />
      )}
      {label}
    </button>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 border border-red-500/40 bg-surface px-4 py-3 text-sm text-red-400">
      <AlertCircle size={15} strokeWidth={2} className="shrink-0" />
      {message}
    </div>
  );
}

export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border bg-surface p-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

// One label/value pair in a details panel.
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
    <div className="min-w-0 leading-tight">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <div className={`mt-1 truncate text-sm text-foreground ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-muted">-</span>}
      </div>
    </div>
  );
}

export function ExternalLinkButton({
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
      className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
    >
      <ExternalLink size={15} strokeWidth={1.75} />
      {children}
    </a>
  );
}

function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-muted transition-colors hover:text-foreground hover:underline"
    >
      <ExternalLink size={13} strokeWidth={1.75} />
      {children}
    </a>
  );
}

const th = "h-11 px-4 text-left align-middle font-medium whitespace-nowrap";
const td = "h-12 px-4 align-middle whitespace-nowrap";

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
    return <Placeholder>{emptyLabel}</Placeholder>;
  }

  return (
    <div className="w-full overflow-x-auto border border-border bg-surface">
      <table className="w-full caption-bottom text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
            <th className={th}>ID</th>
            <th className={th}>Name</th>
            <th className={th}>Identifier</th>
            {showOwner ? <th className={th}>Owner</th> : null}
            <th className={th}>Status</th>
            <th className={`${th} text-right`}>RAM</th>
            <th className={`${th} text-right`}>Disk</th>
            <th className={th}>Service ID</th>
            <th className={`${th} text-right`}>Links</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((s) => (
            <tr key={s.id} className="border-b border-border transition-colors hover:bg-surface-2">
              <td className={`${td} font-mono tabular-nums`}>{s.id}</td>
              <td className={`${td} max-w-[16rem] truncate font-medium`} title={s.name}>
                {s.name}
              </td>
              <td className={`${td} font-mono`}>{s.identifier}</td>
              {showOwner ? (
                <td className={`${td} max-w-[16rem] truncate`} title={s.ownerEmail ?? ""}>
                  {s.ownerEmail ?? <span className="text-muted">-</span>}
                </td>
              ) : null}
              <td className={td}>
                <StatusBadge status={s.status} />
              </td>
              <td className={`${td} text-right tabular-nums`}>{formatMB(s.memory)}</td>
              <td className={`${td} text-right tabular-nums`}>{formatMB(s.disk)}</td>
              <td className={`${td} font-mono`}>
                {s.externalId ?? <span className="text-muted">-</span>}
              </td>
              <td className={`${td} text-right`}>
                <div className="flex items-center justify-end gap-3">
                  {s.externalId ? (
                    <RowLink href={whmcsServiceUrl(s.externalId)}>WHMCS</RowLink>
                  ) : null}
                  <RowLink href={panelServerUrl(s.id)}>Panel</RowLink>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
