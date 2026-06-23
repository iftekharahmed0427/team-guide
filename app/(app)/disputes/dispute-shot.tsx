"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// A small dispute screenshot thumbnail (sized for a table cell) that opens the
// full image in a popup. Backdrop click, the X, or Escape closes it. Mirrors
// ReviewLightbox, and the inline lightbox in disputes-client, for the read-only
// history view.
export default function DisputeShot({ src }: { src: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!src) return <span className="text-xs text-muted">-</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View screenshot"
        className="block h-9 w-12 overflow-hidden border border-border"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fx-fade fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-border bg-surface text-muted transition-colors hover:text-foreground"
          >
            <X size={18} strokeWidth={2} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Dispute screenshot"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] border border-border object-contain"
          />
        </div>
      ) : null}
    </>
  );
}
