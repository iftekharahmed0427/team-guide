"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2 } from "lucide-react";

// The shared form pieces for the wired settings pages: one place for the input
// styling, the pending state, the error line and the "saved" flash, so eight
// panels behave identically.
//
// Every action these drive is the live one from app/(app)/settings, which
// re-checks the admin role, writes the activity log and calls notifyChange.
// Nothing new writes to the database from v2.

export type ActionResult = { ok: true } | { error: string };

export const INPUT =
  "w-full rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[14px] py-[11px] text-[14px] font-normal text-[#e2e8f0] outline-none transition-colors placeholder:text-[#64748b] focus:border-[#8fb0a7]! disabled:opacity-60";
export const LABEL = "text-[12px] font-semibold text-[#94a3b8]";
export const BUTTON =
  "flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60";
export const GHOST_BUTTON =
  "flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[14px] py-[9px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]! disabled:cursor-default disabled:opacity-60";

/**
 * Runs a server action, keeping the pending flag, the error and a short-lived
 * "Saved" flash. Refreshes the route on success so the server components above
 * re-read: the live actions revalidate their own paths, not the v2 ones.
 */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function run(fn: () => Promise<ActionResult | void>, after?: () => void) {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      after?.();
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return { run, pending, error, saved, setError };
}

export function ErrorLine({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-[6px] text-[12px] font-medium text-[#ef4444]">
      <AlertCircle size={13} strokeWidth={2} className="shrink-0" />
      {message}
    </p>
  );
}

export function SavedFlash({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <p className="flex items-center gap-[6px] text-[12px] font-semibold text-[#10b981]">
      <Check size={13} strokeWidth={2} className="shrink-0" />
      Saved
    </p>
  );
}

/** The footer every editable panel ends with: state on the left, save on the right. */
export function SaveBar({
  pending,
  error,
  saved,
  onSave,
  label = "Save changes",
  disabled = false,
  hint,
}: {
  pending: boolean;
  error: string;
  saved: boolean;
  onSave: () => void;
  label?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="mt-[18px] flex items-center justify-between gap-[16px] border-t border-[#243033]! pt-[16px]">
      <div className="min-w-0 flex-1">
        {error ? (
          <ErrorLine message={error} />
        ) : saved ? (
          <SavedFlash shown />
        ) : hint ? (
          <p className="text-[12px] font-normal text-[#64748b]">{hint}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={pending || disabled}
        className={BUTTON}
      >
        {pending ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        ) : null}
        {label}
      </button>
    </div>
  );
}

/** A labelled text input. */
export function Field({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
      {hint ? (
        <p className="text-[11px] font-normal text-[#64748b]">{hint}</p>
      ) : null}
    </div>
  );
}

/** An on/off switch for a single boolean setting. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-[16px] border-b border-[#243033]! py-[14px] first:pt-0 last:border-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-[2px]">
        <p className="text-[14px] font-semibold text-[#e2e8f0]">{label}</p>
        {hint ? (
          <p className="text-[12px] font-normal text-[#64748b]">{hint}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`flex h-[24px] w-[42px] shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors disabled:cursor-default disabled:opacity-60 ${
          checked ? "bg-[#8fb0a7]" : "bg-[#243033]"
        }`}
      >
        <span
          className={`size-[18px] rounded-full bg-[#0e1217] transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * A destructive button that asks first. The confirm step is inline rather than a
 * window.confirm so it matches the rest of v2 and cannot be click-throughed.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  pending,
  disabled,
  tone = "danger",
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending: boolean;
  disabled?: boolean;
  tone?: "danger" | "warning";
}) {
  const [confirming, setConfirming] = useState(false);
  const colour =
    tone === "warning"
      ? "bg-[#f59e0b] hover:bg-[#fbbf24]"
      : "bg-[#ef4444] hover:bg-[#f87171]";

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={disabled || pending}
        className={GHOST_BUTTON}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-[8px]">
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className={GHOST_BUTTON}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className={`flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors disabled:cursor-default disabled:opacity-60 ${colour}`}
      >
        {pending ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        ) : null}
        {confirmLabel}
      </button>
    </div>
  );
}
