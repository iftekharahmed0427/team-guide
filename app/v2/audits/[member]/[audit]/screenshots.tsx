"use client";

import { useState } from "react";
import V2Lightbox, { type LightboxImage } from "../../../lightbox";

// An audit's screenshots on the v2 review page. Read-only: audits are not
// uploading images any more - new ones carry the transcript link instead - so
// this exists to keep the ones already on the older audits reachable, and there
// is no add or remove.
//
// There is no Figma frame for it. The tiles are built from the review page's own
// tokens rather than the live page's, which is on the old palette; the overlay
// is the shared v2 lightbox.

export type Shot = LightboxImage;

export default function AuditScreenshots({ shots }: { shots: Shot[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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

      <V2Lightbox
        images={shots}
        index={openIndex}
        onIndex={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </>
  );
}
