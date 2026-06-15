"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { createNote } from "./actions";

export default function NoteComposer() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const text = body.trim();
    if (!text) {
      setError("Write something first.");
      return;
    }
    startTransition(async () => {
      const res = await createNote(text);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="border border-border bg-surface p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        rows={3}
        placeholder="Share a note with the team…"
        className="w-full resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        {error ? (
          <span className="text-xs text-red-400">{error}</span>
        ) : (
          <span className="text-xs text-muted">⌘/Ctrl + Enter to post</span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="btn-wipe btn-wipe-dark flex h-9 shrink-0 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          ) : (
            <Send size={15} strokeWidth={2} />
          )}
          Post note
        </button>
      </div>
    </div>
  );
}
