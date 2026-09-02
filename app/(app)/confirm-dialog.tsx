"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle } from "lucide-react";

// The v2 confirmation dialog, built from the "confirmation-popup" Figma frame
// (node 71:4): the dimmed backdrop and the 420px card with its alert badge,
// copy and the cancel / confirm pair. The frame also draws a mock team table
// behind the dimmer to show the effect in context; that is not part of this
// component, which only renders the dialog over whatever is already on screen.
//
// The frame's dialog is already parameterised in Figma (title, description and
// both button labels), so those are the props here too.
//
// Not portalled on purpose: app/layout.tsx scopes Figtree to its wrapper, and
// a portal into document.body would render outside it and lose the typeface.
// `fixed` still covers the viewport from here, since no v2 ancestor establishes
// a containing block for it.

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  description = "This action cannot be undone. The member will be permanently removed from the team workspace.",
  cancelLabel = "Cancel",
  confirmLabel = "Remove",
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Escape closes. Bound while open only, so a closed dialog costs nothing.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  // Open on Cancel rather than the destructive button, and hand focus back to
  // whatever opened the dialog when it closes.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => opener?.focus?.();
  }, [open]);

  if (!open) return null;

  // Two focusable elements, so the trap is just a manual wrap on Tab.
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const first = cancelRef.current;
    const last = confirmRef.current;
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div
      // Only a click that lands on the backdrop itself dismisses, so a drag that
      // ends outside the card does not.
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a0e]/65 p-[24px] backdrop-blur-[6px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={trapTab}
        style={{ filter: "drop-shadow(0px 16px 16px rgba(0,0,0,0.3))" }}
        className="flex w-[420px] max-w-full flex-col gap-[24px] rounded-[16px] border border-[#243033]! bg-[#171e24] p-[32px]"
      >
        <div className="flex flex-col items-center gap-[16px]">
          <span className="flex size-[48px] items-center justify-center rounded-full bg-[#ef4444]/10">
            <AlertTriangle size={24} strokeWidth={2} className="text-[#ef4444]" />
          </span>
          <div className="flex flex-col items-center gap-[8px] text-center">
            <p id={titleId} className="w-full text-[20px] font-bold text-[#e2e8f0]">
              {title}
            </p>
            <p
              id={descriptionId}
              className="w-full text-[14px] leading-[1.5] font-normal text-[#94a3b8]"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-[12px]">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[8px] border border-[#243033]! bg-white/[0.03] px-[16px] py-[12px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            style={{ filter: "drop-shadow(0px 4px 4px rgba(239,68,68,0.2))" }}
            // Transparent border so this matches Cancel's width: with
            // flex-basis 0 the border sits outside the flexed size, and without
            // it this button would come out 2px narrower than the frame's pair.
            className="flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[8px] border border-transparent! bg-[#ef4444] px-[16px] py-[12px] text-[14px] font-semibold text-white transition-colors hover:bg-[#f87171]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
