"use client";

import { useState } from "react";
import { Gavel } from "lucide-react";
import V2Lightbox from "../lightbox";
import {
  money,
  outcomeLabel,
  outcomeTone,
  type Dispute,
} from "./disputes-shape";

// The disputes for a period: the review tile from /v2/reviews, carrying an
// outcome badge and an amount instead of a source dot, over the shared
// lightbox. Three up, like the review evidence.
//
// A dispute whose screenshot cannot be resolved still gets a tile - the amount
// and outcome are the point, the screenshot is the evidence - so the image is
// dropped rather than the row.

export default function DisputeList({ items }: { items: Dispute[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // The lightbox only knows about the ones that have an image, so its indices
  // are its own rather than the list's.
  const shots = items
    .filter((d): d is Dispute & { src: string } => Boolean(d.src))
    .map((d) => ({ id: d.id, src: d.src, caption: d.dispute || d.category }));

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <>
      <div className="grid grid-cols-3 gap-[16px]">
        {items.map((item) => {
          const shotIndex = shots.findIndex((s) => s.id === item.id);
          return (
            <div
              key={item.id}
              className="flex flex-col overflow-hidden rounded-[12px] border border-[#243033]! bg-[#171e24]"
            >
              {item.src ? (
                <button
                  type="button"
                  onClick={() => setOpenIndex(shotIndex)}
                  aria-label={`View screenshot for ${item.dispute || item.category}`}
                  className="cursor-pointer border-b border-[#243033]! transition-opacity hover:opacity-80"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt=""
                    className="aspect-video w-full object-cover object-top"
                  />
                </button>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center border-b border-[#243033]! bg-[#0e1217]">
                  <Gavel size={20} strokeWidth={2} className="text-[#243033]" />
                </div>
              )}

              <div className="flex flex-1 flex-col gap-[10px] p-[16px]">
                <div className="flex items-start justify-between gap-[10px]">
                  <p
                    title={item.dispute}
                    className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#e2e8f0]"
                  >
                    {item.dispute || "Dispute"}
                  </p>
                  <span
                    className={`shrink-0 rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold ${outcomeTone(item.outcome)}`}
                  >
                    {outcomeLabel(item.outcome)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-[10px]">
                  <p className="min-w-0 truncate text-[12px] font-normal text-[#94a3b8]">
                    {item.category || "Uncategorised"}
                  </p>
                  <p className="shrink-0 text-[15px] font-bold text-[#e2e8f0]">
                    {money(item.amount)}
                  </p>
                </div>

                <p className="mt-auto text-[11px] font-normal text-[#64748b]">
                  {item.submittedByName || "Member"} · {item.when}
                </p>
              </div>
            </div>
          );
        })}
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
