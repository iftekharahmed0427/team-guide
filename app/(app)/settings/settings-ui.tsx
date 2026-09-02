import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// The chrome every settings section shares: the page header, the section card,
// and the read-only row. Server components, since none of the v2 settings pages
// are wired - they read real values and leave the writing to the live app.

// globals.css sets an unlayered `* { border-color: var(--border) }`, which wins
// over Tailwind's layered border utilities, so borders are marked important to
// opt out of the app-wide default.
export const CARD = "rounded-[12px] border border-[#243033]! bg-[#171e24]";

export function SettingsHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-[24px]">
      <div className="flex min-w-0 flex-col gap-[6px]">
        <h1 className="text-[28px] font-bold text-[#e2e8f0]">{title}</h1>
        <p className="text-[14px] font-normal text-[#94a3b8]">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-[10px]">{children}</div>
    </div>
  );
}

/** A titled card with an explanation, the unit every section is built from. */
export function Section({
  title,
  hint,
  children,
  footer,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col ${CARD}`}>
      <div className="flex flex-col gap-[4px] border-b border-[#243033]! p-[20px]">
        <p className="text-[16px] font-bold text-[#e2e8f0]">{title}</p>
        {hint ? (
          <p className="text-[13px] font-normal text-[#94a3b8]">{hint}</p>
        ) : null}
      </div>
      <div className="flex flex-col p-[20px]">{children}</div>
      {footer ? (
        <div className="border-t border-[#243033]! px-[20px] py-[14px] text-[12px] font-normal text-[#64748b]">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/** One value in a section: what it is on the left, what it is set to on the right. */
export function Row({
  label,
  hint,
  value,
  tone = "plain",
}: {
  label: string;
  hint?: string;
  value: React.ReactNode;
  tone?: "plain" | "accent";
}) {
  return (
    <div className="flex items-center justify-between gap-[16px] border-b border-[#243033]! py-[14px] first:pt-0 last:border-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-[2px]">
        <p className="text-[14px] font-semibold text-[#e2e8f0]">{label}</p>
        {hint ? (
          <p className="text-[12px] font-normal text-[#64748b]">{hint}</p>
        ) : null}
      </div>
      <p
        className={`shrink-0 text-[14px] font-bold ${tone === "accent" ? "text-[#8fb0a7]" : "text-[#e2e8f0]"}`}
      >
        {value}
      </p>
    </div>
  );
}

/** A small tag, used for the flags on a list entry. */
export function Tag({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent";
}) {
  return (
    <span
      className={`shrink-0 rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold ${
        tone === "accent"
          ? "bg-[#8fb0a7]/15 text-[#8fb0a7]"
          : "bg-[#0e1217] text-[#94a3b8]"
      }`}
    >
      {children}
    </span>
  );
}

/** Points at the page that actually edits this, since v2 settings only read. */
export function EditsOn({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-[4px] text-[12px] font-semibold text-[#94a3b8] transition-colors hover:text-[#8fb0a7]"
    >
      {label}
      <ArrowUpRight size={12} strokeWidth={2} />
    </Link>
  );
}
