"use client";

import { useState } from "react";
import Lightbox from "../../lightbox";
import { sourceDot } from "../reviews-data";

// The evidence for one archived period. Same tile as the current period's list
// on /reviews, over the shared lightbox.

export type ArchivedReview = {
  id: string;
  src: string;
  sourceName: string;
  note: string;
  addedByName: string;
  when: string;
};

export default function PeriodReviews({ items }: { items: ArchivedReview[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <>
      <div className="grid grid-cols-3 gap-[16px]">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="flex flex-col overflow-hidden rounded-[12px] border border-[#243033]! bg-[#0e1217]"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`View ${item.sourceName} screenshot`}
              className="cursor-pointer border-b border-[#243033]! transition-opacity hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt=""
                className="aspect-video w-full object-cover object-top"
              />
            </button>
            <div className="flex flex-1 flex-col gap-[6px] p-[14px]">
              <div className="flex items-center gap-[8px]">
                <span
                  style={{ backgroundColor: sourceDot(item.sourceName) }}
                  className="size-[8px] shrink-0 rounded-full"
                />
                <p className="truncate text-[13px] font-semibold text-[#e2e8f0]">
                  {item.sourceName}
                </p>
              </div>
              {item.note ? (
                <p className="text-[12px] font-normal text-[#94a3b8]">
                  {item.note}
                </p>
              ) : null}
              <p className="mt-auto text-[11px] font-normal text-[#64748b]">
                {item.addedByName || "Admin"} · {item.when}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Lightbox
        images={items.map((i) => ({
          id: i.id,
          src: i.src,
          caption: i.sourceName,
        }))}
        index={openIndex}
        onIndex={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </>
  );
}
