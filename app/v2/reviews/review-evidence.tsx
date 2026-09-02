"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteReview } from "@/app/(app)/reviews/actions";
import V2ConfirmDialog from "../confirm-dialog";
import V2Lightbox from "../lightbox";
import { sourceDot } from "./reviews-data";

// This period's review screenshots. The frame only draws the empty state, so
// the populated grid reuses the tiles from the audit review, over the shared
// lightbox.
//
// Deleting is admin-only, matching the action, and takes the stored screenshot
// with it, so the confirmation says so.

export type Evidence = {
  id: string;
  /** Resolved screenshot, or null when storage cannot produce one. */
  src: string | null;
  sourceName: string;
  note: string;
  when: string;
};

export default function ReviewEvidence({
  items,
  isAdmin,
}: {
  items: Evidence[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Evidence | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const shots = items
    .filter((r): r is Evidence & { src: string } => Boolean(r.src))
    .map((r) => ({ id: r.id, src: r.src, caption: r.note || r.sourceName }));

  function remove(item: Evidence) {
    setPendingDelete(null);
    setError("");
    startTransition(async () => {
      const res = await deleteReview(item.id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

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
                  aria-label={`View the ${item.sourceName} review screenshot`}
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
                  <p className="text-[12px] font-normal text-[#64748b]">
                    Screenshot unavailable
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-[6px] p-[14px]">
                <div className="flex items-center gap-[8px]">
                  <span
                    style={{ backgroundColor: sourceDot(item.sourceName) }}
                    className="size-[8px] shrink-0 rounded-full"
                  />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#e2e8f0]">
                    {item.sourceName}
                  </p>
                  {isAdmin ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setPendingDelete(item)}
                      aria-label={`Delete the ${item.sourceName} review`}
                      className="shrink-0 cursor-pointer rounded-[6px] p-[4px] text-[#64748b] transition-colors hover:bg-white/[0.04] hover:text-[#ef4444] disabled:cursor-default disabled:opacity-60"
                    >
                      {pending && pendingDelete?.id === item.id ? (
                        <Loader2
                          size={13}
                          strokeWidth={2}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={13} strokeWidth={2} />
                      )}
                    </button>
                  ) : null}
                </div>

                {item.note ? (
                  <p className="truncate text-[12px] font-normal text-[#94a3b8]">
                    {item.note}
                  </p>
                ) : null}
                <p className="text-[11px] font-normal text-[#64748b]">
                  {item.when}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="text-[13px] font-medium text-[#ef4444]">{error}</p>
      ) : null}

      <V2ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this review?"
        description={
          pendingDelete
            ? `The ${pendingDelete.sourceName} review and its screenshot will be permanently deleted, and this period's count drops by one. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete review"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
      />

      <V2Lightbox
        images={shots}
        index={openIndex}
        onIndex={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </>
  );
}
