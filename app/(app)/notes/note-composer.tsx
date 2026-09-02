"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Send } from "lucide-react";
import { createNote } from "@/lib/actions/notes";
import { MAX_NOTE_BODY, MAX_NOTE_TITLE } from "@/lib/note-constants";

// The post box. No Figma frame draws notes, so this is the disputes log card
// with its fields swapped: the same surface, the same 12px captions, and the
// same footer with a hint on the left and the accent button on the right.
//
// The title is optional and stays out of the way, because most notes are a
// sentence. A note that is really a document types a name in and gets one.

// The counter only appears near the ceiling, so an ordinary note never sees it.
const COUNTER_FROM = MAX_NOTE_BODY * 0.8;

export default function NoteComposer() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    setDone(false);
    if (!body.trim()) return setError("Write something first.");

    startTransition(async () => {
      const res = await createNote({ title, body });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setTitle("");
      setBody("");
      setDone(true);
      router.refresh();
    });
  }

  const label = "text-[12px] font-semibold text-[#94a3b8]";
  const input =
    "w-full rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[14px] py-[11px] text-[14px] font-normal text-[#e2e8f0] outline-none transition-colors placeholder:text-[#64748b] focus:border-[#8fb0a7]! disabled:opacity-60";

  const left = MAX_NOTE_BODY - body.length;

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[20px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
      <p className="text-[16px] font-bold text-[#e2e8f0]">Post a note</p>

      <div className="flex flex-col gap-[8px]">
        <label htmlFor="note-composer-title" className={label}>
          Title <span className="font-normal text-[#64748b]">(optional)</span>
        </label>
        <input
          id="note-composer-title"
          value={title}
          maxLength={MAX_NOTE_TITLE}
          disabled={pending}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give a document a name, or leave blank for a quick note"
          className={input}
        />
      </div>

      <div className="flex flex-col gap-[8px]">
        <label htmlFor="note-composer-body" className={label}>
          Note
        </label>
        <textarea
          id="note-composer-body"
          value={body}
          rows={5}
          maxLength={MAX_NOTE_BODY}
          disabled={pending}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          placeholder="Share something with the team. Everyone can read it, and it is searchable."
          className={`${input} resize-y leading-[1.6]`}
        />
      </div>

      <div className="h-px w-full bg-[#243033]" />

      <div className="flex items-center justify-between gap-[16px]">
        <p className="flex min-w-0 flex-1 items-center gap-[8px] text-[13px] font-normal text-[#64748b]">
          {error ? (
            <>
              <AlertCircle
                size={14}
                strokeWidth={2}
                className="shrink-0 text-[#ef4444]"
              />
              <span className="min-w-0 truncate text-[#ef4444]">{error}</span>
            </>
          ) : done ? (
            <>
              <Check
                size={14}
                strokeWidth={2}
                className="shrink-0 text-[#8fb0a7]"
              />
              <span className="min-w-0 truncate text-[#8fb0a7]">
                Posted. Everyone can see it now.
              </span>
            </>
          ) : body.length > COUNTER_FROM ? (
            <span className="min-w-0 truncate">
              {left.toLocaleString()} characters left
            </span>
          ) : (
            <span className="min-w-0 truncate">
              Ctrl or Cmd + Enter to post. Visible to the whole team.
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <Send size={14} strokeWidth={2} />
          )}
          {pending ? "Posting" : "Post note"}
        </button>
      </div>
    </div>
  );
}
