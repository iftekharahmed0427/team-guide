"use client";

import { useState } from "react";
import { Info, Plus, UploadCloud } from "lucide-react";
import V2Select from "../custom-select";
import { sourceDot } from "./reviews-data";

// The "Log a review" card from the "reviews-page" frame (node 163:39). The
// source picker is the shared v2 select, which carries the frame's trigger.
//
// Inert while v2 is a canvas: the live /reviews page owns addReview, which
// uploads the screenshot and is admin-gated.

export type Source = { id: string; name: string };

export default function LogReview({ sources }: { sources: Source[] }) {
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [note, setNote] = useState("");

  const options = sources.map((s) => ({
    value: s.id,
    label: s.name,
    dot: sourceDot(s.name),
  }));

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[20px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
      <div className="flex items-center justify-between gap-[16px]">
        <p className="text-[16px] font-bold text-[#e2e8f0]">Log a review</p>
        <Info size={14} strokeWidth={2} className="shrink-0 text-[#64748b]" />
      </div>

      <div className="flex items-start gap-[16px]">
        <div className="flex w-[200px] shrink-0 flex-col gap-[8px]">
          {/* The trigger is a button carrying its own aria-label, so this is a
              caption rather than a <label>. */}
          <p className="text-[12px] font-semibold text-[#94a3b8]">Source</p>
          <V2Select
            id="review-source"
            value={sourceId}
            options={options}
            onChange={setSourceId}
            ariaLabel="Source"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
          <label
            htmlFor="review-note"
            className="text-[12px] font-semibold text-[#94a3b8]"
          >
            Note (optional)
          </label>
          <input
            id="review-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 5 stars from a renewal customer"
            className="w-full rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[14px] py-[11px] text-[14px] font-normal text-[#e2e8f0] outline-none transition-colors placeholder:text-[#64748b] focus:border-[#8fb0a7]!"
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-[12px] rounded-[8px] border border-dashed border-[#243033]! bg-[#0e1217] p-[32px]">
        <span className="rounded-full border border-[#243033]! bg-[#171e24] p-[12px]">
          <UploadCloud size={18} strokeWidth={2} className="text-[#94a3b8]" />
        </span>
        <div className="flex flex-col items-center gap-[4px] text-center">
          <p className="text-[14px] font-medium text-[#e2e8f0]">
            Choose a screenshot, or paste one
          </p>
          <p className="text-[12px] font-normal text-[#64748b]">
            PNG, JPG up to 10MB
          </p>
        </div>
      </div>

      <div className="h-px w-full bg-[#243033]" />

      <div className="flex items-center justify-between gap-[16px]">
        <p className="min-w-0 flex-1 text-[13px] font-normal text-[#64748b]">
          Each screenshot counts as one review this period.
        </p>
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8]"
        >
          <Plus size={14} strokeWidth={2} />
          Add review
        </button>
      </div>
    </div>
  );
}
