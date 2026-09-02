"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// Thumbnail grid of an audit's screenshots; clicking one opens it full-size
// (backdrop click, the X, or Escape closes).
export default function AuditScreenshots({ images }: { images: { id: string; src: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpen(img.src)}
            aria-label="View screenshot"
            className="block cursor-pointer border border-border transition-colors hover:border-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt="Audit screenshot" className="aspect-video w-full object-cover" />
          </button>
        ))}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
          className="fx-fade fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-border bg-surface text-muted transition-colors hover:text-foreground"
          >
            <X size={18} strokeWidth={2} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open}
            alt="Audit screenshot"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] border border-border object-contain"
          />
        </div>
      ) : null}
    </>
  );
}
