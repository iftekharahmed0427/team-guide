"use client";

import { useEffect, useId, useRef } from "react";
import { MessageSquare, Plus, Send, UserPlus, XCircle } from "lucide-react";

// The task detail modal, built from the "question-detail-modal" Figma frame
// (node 136:4): a 520px dialog with the assignees row, the comments list and a
// comment composer. The frame also draws a mock ticket queue behind the dimmer
// to show it in context; that is not part of this component, which renders over
// whatever is already on screen.
//
// Assignees and comments are drawn in their empty states, as the frame has
// them. board_task_comment and board_task_assignee both exist, so this is where
// they would be read and written once the v2 board reads the database; today
// Assign and Comment are inert like the rest of the canvas.
//
// Not portalled on purpose: app/v2/layout.tsx scopes Figtree to its wrapper, so
// a portal into document.body would render outside it and lose the typeface.

export type BoardTask = { author: string; subject: string; at: string };

type Props = {
  task: BoardTask | null;
  onClose: () => void;
};

export default function V2TaskModal({ task, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Escape closes. Bound only while open, so a closed modal costs nothing.
  useEffect(() => {
    if (!task) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [task, onClose]);

  // Open on the close button rather than the composer, so the modal does not
  // steal straight into a text field, and hand focus back on the way out.
  useEffect(() => {
    if (!task) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, [task]);

  if (!task) return null;

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div
      // Only a click that lands on the backdrop dismisses, so a drag ending
      // outside the card does not close it.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a0e]/75 p-[24px] backdrop-blur-[8px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-full w-[520px] max-w-full flex-col overflow-hidden rounded-[16px] border border-[#243033]! bg-[#171e24]"
      >
        <div className="flex shrink-0 items-center justify-between gap-[16px] border-b border-[#243033]! px-[24px] py-[20px]">
          <p id={titleId} className="min-w-0 truncate text-[18px] font-bold text-[#e2e8f0]">
            {task.author} - {task.subject}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-[#243033]! bg-white/[0.02] text-[#94a3b8] transition-colors hover:border-[#2f3d42]! hover:text-[#e2e8f0]"
          >
            <XCircle size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex shrink-0 flex-col gap-[16px] border-b border-[#243033]! p-[24px]">
            <div className="flex items-center justify-between gap-[16px]">
              <span className="flex items-center gap-[8px]">
                <UserPlus size={16} strokeWidth={2} className="shrink-0 text-[#94a3b8]" />
                <span className="text-[12px] font-bold text-[#94a3b8] uppercase">Assignees</span>
              </span>
              <button
                type="button"
                className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! px-[14px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
              >
                <Plus size={14} strokeWidth={2} className="text-[#94a3b8]" />
                Assign
              </button>
            </div>
            <p className="text-[14px] font-normal text-[#64748b]">No one assigned yet.</p>
          </div>

          <div className="flex shrink-0 flex-col gap-[16px] border-b border-[#243033]! p-[24px]">
            <span className="flex items-center gap-[8px]">
              <MessageSquare size={16} strokeWidth={2} className="shrink-0 text-[#94a3b8]" />
              <span className="text-[12px] font-bold text-[#94a3b8] uppercase">Comments</span>
            </span>
            <p className="text-[14px] font-normal text-[#64748b]">No comments yet.</p>
          </div>

          <div className="flex shrink-0 flex-col gap-[20px] p-[24px]">
            <textarea
              ref={composerRef}
              rows={4}
              placeholder="Write a comment..."
              className="h-[110px] w-full resize-none rounded-[8px] border border-[#243033]! bg-[#0f141a] p-[16px] text-[14px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#64748b] focus:border-[#8fb0a7]!"
            />
            <div className="flex items-center justify-between gap-[16px]">
              <span className="text-[12px] font-normal text-[#64748b]">
                {/* The frame writes both glyphs, since the shortcut is the same
                    chord on either platform. */}
                ⌘/Ctrl + Enter to send
              </span>
              <button
                type="button"
                className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-transparent! bg-[#8fb0a7] px-[14px] py-[8px] text-[13px] font-semibold text-[#0f141a] transition-colors hover:bg-[#a3c0b8]"
              >
                <Send size={14} strokeWidth={2} />
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
