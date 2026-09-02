"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  Plus,
  UploadCloud,
  X,
} from "lucide-react";
import { imageFilesFrom, imageToDataUrl } from "@/app/components/editor-images";
import { addReview } from "@/lib/actions/reviews";
import CustomSelect from "../custom-select";
import { sourceDot } from "./reviews-data";

// The "Log a review" card from the "reviews-page" frame (node 163:39). The
// source picker is the shared v2 select, which carries the frame's trigger.
//
// Wired to the live addReview, which is admin-gated. The screenshot is
// downsized to 1400px and sent as a data URL, the same as the live form; the
// card takes a paste or a drop as well as the file picker.

export type Source = { id: string; name: string };

export default function LogReview({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function takeFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setError("");
    try {
      setImage(await imageToDataUrl(file, 1400));
    } catch {
      setError("Could not read that image.");
    }
  }

  function submit() {
    setError("");
    setDone(false);
    if (!sourceId) return setError("Pick a source.");
    if (!image) return setError("Attach a screenshot of the review.");

    startTransition(async () => {
      const res = await addReview({ source: sourceId, imageUrl: image, note });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setNote("");
      setImage(null);
      setDone(true);
      router.refresh();
    });
  }

  const options = sources.map((s) => ({
    value: s.id,
    label: s.name,
    dot: sourceDot(s.name),
  }));

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div
      className="flex flex-col gap-[20px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        takeFiles(imageFilesFrom(e.dataTransfer));
      }}
      onPaste={(e) => {
        const files = imageFilesFrom(e.clipboardData);
        if (files.length) {
          e.preventDefault();
          takeFiles(files);
        }
      }}
    >
      <div className="flex items-center justify-between gap-[16px]">
        <p className="text-[16px] font-bold text-[#e2e8f0]">Log a review</p>
        <Info size={14} strokeWidth={2} className="shrink-0 text-[#64748b]" />
      </div>

      <div className="flex items-start gap-[16px]">
        <div className="flex w-[200px] shrink-0 flex-col gap-[8px]">
          {/* The trigger is a button carrying its own aria-label, so this is a
              caption rather than a <label>. */}
          <p className="text-[12px] font-semibold text-[#94a3b8]">Source</p>
          <CustomSelect
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

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          takeFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {image ? (
        <div className="relative overflow-hidden rounded-[8px] border border-[#243033]!">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Review screenshot"
            className="max-h-[260px] w-full object-cover object-top"
          />
          <button
            type="button"
            onClick={() => setImage(null)}
            aria-label="Remove screenshot"
            className="absolute top-[8px] right-[8px] cursor-pointer rounded-full bg-[#0e1217]/80 p-[6px] text-[#e2e8f0] transition-colors hover:text-[#ef4444]"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-[12px] rounded-[8px] border border-dashed border-[#243033]! bg-[#0e1217] p-[32px] transition-colors hover:border-[#8fb0a7]!"
        >
          <span className="rounded-full border border-[#243033]! bg-[#171e24] p-[12px]">
            <UploadCloud size={18} strokeWidth={2} className="text-[#94a3b8]" />
          </span>
          <span className="flex flex-col items-center gap-[4px] text-center">
            <span className="text-[14px] font-medium text-[#e2e8f0]">
              Choose a screenshot, or paste one
            </span>
            <span className="text-[12px] font-normal text-[#64748b]">
              PNG, JPG up to 10MB
            </span>
          </span>
        </button>
      )}

      <div className="h-px w-full bg-[#243033]" />

      <div className="flex items-center justify-between gap-[16px]">
        <div className="min-w-0 flex-1">
          {error ? (
            <p className="flex items-center gap-[6px] text-[13px] font-medium text-[#ef4444]">
              <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
              {error}
            </p>
          ) : done ? (
            <p className="flex items-center gap-[6px] text-[13px] font-semibold text-[#10b981]">
              <Check size={14} strokeWidth={2} className="shrink-0" />
              Logged.
            </p>
          ) : (
            <p className="text-[13px] font-normal text-[#64748b]">
              Each screenshot counts as one review this period.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <Plus size={14} strokeWidth={2} />
          )}
          Add review
        </button>
      </div>
    </div>
  );
}
