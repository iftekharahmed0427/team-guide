"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react";
import { deletePost } from "@/lib/actions/news";
import { deleteGuide } from "@/lib/actions/guides";
import ConfirmDialog from "./confirm-dialog";
import type { PostKind } from "./post-editor";

// Edit and Delete on a post's detail page. Admin-only: the caller decides
// whether to render this at all, and both live actions re-check the role.
//
// Delete names the post in the confirmation rather than asking a generic "are
// you sure", since the two buttons sit side by side and the row does not come
// back.

export default function PostActions({
  kind,
  id,
  title,
  slug,
  basePath,
}: {
  kind: PostKind;
  id: string;
  title: string;
  slug: string;
  basePath: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    setConfirming(false);
    setError("");
    startTransition(async () => {
      // Both delete actions take a FormData, being form actions on the live
      // pages, and neither returns a result: they throw or they succeed.
      const data = new FormData();
      data.set("id", id);
      // Both actions redirect when they are done, and default to the news
      // list; this sends an admin back to the list they deleted from.
      data.set("redirectTo", basePath);
      try {
        if (kind === "news") await deletePost(data);
        else await deleteGuide(data);
      } catch {
        setError("Could not delete that. Check you are still signed in.");
      }
    });
  }

  const noun = kind === "news" ? "post" : "guide";

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex shrink-0 items-center gap-[12px]">
      {error ? (
        <p className="flex items-center gap-[6px] text-[13px] font-medium text-[#ef4444]">
          <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
          {error}
        </p>
      ) : null}

      <Link
        href={`${basePath}/${slug}/edit`}
        className="flex items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[14px] py-[8px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
      >
        <Pencil size={14} strokeWidth={2} />
        Edit
      </Link>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#ef4444]! bg-[#ef4444]/10 px-[14px] py-[8px] text-[14px] font-semibold text-[#ef4444] transition-colors hover:bg-[#ef4444]/20 disabled:cursor-default disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        ) : (
          <Trash2 size={14} strokeWidth={2} />
        )}
        Delete
      </button>

      <ConfirmDialog
        open={confirming}
        title={`Delete this ${noun}?`}
        description={`"${title}" will be permanently deleted, along with its link. Anyone following that link will get a not-found page. This cannot be undone.`}
        confirmLabel={`Delete ${noun}`}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </div>
  );
}
