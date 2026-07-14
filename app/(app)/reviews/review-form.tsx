"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Check, ImageUp, X } from "lucide-react";
import CustomSelect from "@/app/components/custom-select";
import { imageToDataUrl, imageFilesFrom } from "@/app/components/editor-images";
import { addReview } from "./actions";

const labelCls = "mb-1 block text-xs text-muted";
const inputCls =
  "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-foreground/40";

export default function ReviewForm({ sources }: { sources: { id: string; name: string }[] }) {
  const router = useRouter();
  const [source, setSource] = useState(sources[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    setError(null);
    try {
      setImage(await imageToDataUrl(f, 1400));
    } catch {
      setError("Couldn't read that image.");
    }
  }

  function submit() {
    setError(null);
    setDone(false);
    if (!image) return setError("Attach a screenshot of the review first.");
    startTransition(async () => {
      const res = await addReview({ source, imageUrl: image, note });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setImage(null);
      setNote("");
      setDone(true);
      setTimeout(() => setDone(false), 3000);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div
      className="border border-border bg-surface p-4"
      onPaste={(e) => {
        const files = imageFilesFrom(e.clipboardData);
        if (files.length > 0) {
          e.preventDefault();
          void handleFiles(files);
        }
      }}
    >
      <p className="mb-3 text-sm font-medium">Log a review</p>

      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <div>
          <label className={labelCls}>Source</label>
          <CustomSelect
            key={sources.map((s) => s.id).join(",")}
            name="source"
            options={sources.map((s) => ({ value: s.id, label: s.name }))}
            defaultValue={sources[0]?.id ?? ""}
            onChange={setSource}
            className="w-full"
          />
        </div>
        <div>
          <label className={labelCls}>Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 5 stars from a renewal customer"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className={labelCls}>Screenshot</label>
        {image ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Review screenshot" className="max-h-44 border border-border" />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label="Remove screenshot"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center border border-border bg-surface text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-24 w-full cursor-pointer items-center justify-center gap-2 border border-dashed border-border text-sm text-muted transition-colors hover:border-muted hover:text-foreground"
          >
            <ImageUp size={16} strokeWidth={1.75} />
            Choose a screenshot, or paste one
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {error ? (
          <span className="text-xs text-red-400">{error}</span>
        ) : done ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Check size={13} strokeWidth={2} />
            Review added
          </span>
        ) : (
          <span className="text-xs text-muted">Each screenshot counts as one review this period.</span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !image}
          className="btn-wipe btn-wipe-dark flex h-9 shrink-0 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          ) : (
            <Plus size={15} strokeWidth={2} />
          )}
          Add review
        </button>
      </div>
    </div>
  );
}
