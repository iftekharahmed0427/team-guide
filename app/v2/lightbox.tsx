"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { X } from "lucide-react";

// The v2 full-size image overlay, shared by the audit screenshots and the
// archived review evidence. No frame draws it; it is built from the same tokens
// as the confirmation dialog it sits alongside.
//
// Controlled by the grid that owns the images, so a caller keeps its own
// selection. Escape closes, the arrows step, and a click on the backdrop or the
// X closes.

export type LightboxImage = { id: string; src: string; caption?: string };

export default function V2Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: LightboxImage[];
  /** null when nothing is open. */
  index: number | null;
  /**
   * The owning grid's setter. Stepping goes through the updater form so two
   * key presses in the same frame do not both read the same stale index.
   */
  onIndex: Dispatch<SetStateAction<number | null>>;
  onClose: () => void;
}) {
  useEffect(() => {
    if (index === null) return;
    const step = (delta: number) =>
      onIndex((i) =>
        i === null ? i : (i + delta + images.length) % images.length,
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, images.length, onIndex, onClose]);

  if (index === null) return null;
  const current = images[index];
  if (!current) return null;

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.caption ?? "Screenshot"}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a0e]/75 p-[40px] backdrop-blur-[8px]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-[24px] right-[24px] flex size-[36px] cursor-pointer items-center justify-center rounded-[8px] border border-[#243033]! bg-[#171e24] text-[#94a3b8] transition-colors hover:text-[#e2e8f0]"
      >
        <X size={18} strokeWidth={2} />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-[8px] border border-[#243033]! object-contain"
      />

      {images.length > 1 ? (
        <p className="absolute bottom-[24px] text-[13px] font-medium text-[#94a3b8]">
          {current.caption ? `${current.caption} · ` : ""}
          {index + 1} / {images.length}
        </p>
      ) : null}
    </div>
  );
}
