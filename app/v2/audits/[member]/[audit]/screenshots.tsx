"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

// An audit's screenshots on the v2 review page. Read-only: audits are not
// uploading images any more - new ones carry the transcript link instead - so
// this exists to keep the ones already on the older audits reachable, and there
// is no add or remove.
//
// There is no Figma frame for it. The tiles and the lightbox are built from the
// review page's own tokens rather than the live page's, which is on the old
// palette.

export type Shot = { id: string; src: string };

export default function AuditScreenshots({ shots }: { shots: Shot[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : shots[openIndex];

  const close = useCallback(() => setOpenIndex(null), []);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      // The older audits carry up to four shots, so step between them rather
      // than making it a close-and-reopen.
      if (e.key === "ArrowRight")
        setOpenIndex((i) => (i === null ? i : (i + 1) % shots.length));
      if (e.key === "ArrowLeft")
        setOpenIndex((i) =>
          i === null ? i : (i - 1 + shots.length) % shots.length,
        );
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex, shots.length, close]);

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <>
      <div className="grid grid-cols-3 gap-[16px]">
        {shots.map((shot, i) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`View screenshot ${i + 1} of ${shots.length}`}
            className="cursor-pointer overflow-hidden rounded-[8px] border border-[#243033]! bg-[#0e1217] transition-colors hover:border-[#8fb0a7]!"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot.src}
              alt=""
              className="aspect-video w-full object-cover object-top"
            />
          </button>
        ))}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot"
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a0e]/75 p-[40px] backdrop-blur-[8px]"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-[24px] right-[24px] flex size-[36px] cursor-pointer items-center justify-center rounded-[8px] border border-[#243033]! bg-[#171e24] text-[#94a3b8] transition-colors hover:text-[#e2e8f0]"
          >
            <X size={18} strokeWidth={2} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open.src}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-[8px] border border-[#243033]! object-contain"
          />
          {shots.length > 1 ? (
            <p className="absolute bottom-[24px] text-[13px] font-medium text-[#94a3b8]">
              {(openIndex ?? 0) + 1} / {shots.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
