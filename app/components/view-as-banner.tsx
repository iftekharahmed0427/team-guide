"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, X, Loader2 } from "lucide-react";
import { setViewAsMember } from "./view-as-actions";

// Shown across the top while an admin previews the app as a team member. Exiting
// restores the real admin session.
export default function ViewAsBanner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function exit() {
    startTransition(async () => {
      await setViewAsMember(false);
      router.refresh();
    });
  }

  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-3 bg-foreground px-6 text-background">
      <span className="flex items-center gap-2 text-xs font-medium">
        <Eye size={14} strokeWidth={2} />
        Viewing as a team member. Admin tools are hidden.
      </span>
      <button
        type="button"
        onClick={exit}
        disabled={pending}
        className="flex h-7 items-center gap-1.5 border border-background/30 px-2.5 text-xs font-medium transition-colors hover:bg-background/10 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={13} strokeWidth={2} className="animate-spin" />
        ) : (
          <X size={13} strokeWidth={2} />
        )}
        Exit member view
      </button>
    </div>
  );
}
