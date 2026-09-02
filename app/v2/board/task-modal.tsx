"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  addComment,
  assignMember,
  deleteComment,
  listComments,
  unassignMember,
} from "@/lib/actions/board";
import type { Comment, Member, Task } from "@/lib/board-columns";
import { initialsOf, plainName, tintFor } from "../member";

// The task detail modal, built from the "question-detail-modal" Figma frame
// (node 136:4): a 520px dialog with the assignees row, the comments list and a
// comment composer.
//
// Comments load when the card is opened rather than with the board, so a board
// of fifty cards is not fifty comment queries. Assigning is admin-only, which
// is what the action enforces; commenting is open to any member, and a member
// can delete their own comment.
//
// Not portalled on purpose: app/v2/layout.tsx scopes Figtree to its wrapper, so
// a portal into document.body would render outside it and lose the typeface.

type Props = {
  task: Task | null;
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onDelete: () => void;
};

export default function V2TaskModal({
  task,
  members,
  isAdmin,
  currentUserId,
  onClose,
  onDelete,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Comments are held with the id they belong to, so the modal never shows
  // one card's comments under another while the next fetch is in flight, and
  // nothing has to be cleared on the way in.
  const [loaded, setLoaded] = useState<{
    id: string;
    rows: Comment[];
  } | null>(null);
  const [body, setBody] = useState("");
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const taskId = task?.id ?? null;

  // Comments belong to the card that is open, so they are fetched on open
  // rather than held for every card on the board.
  useEffect(() => {
    if (!taskId) return;
    let live = true;
    listComments(taskId)
      .then((rows) => {
        if (live) setLoaded({ id: taskId, rows });
      })
      .catch(() => {
        if (live) setError("Could not load the comments.");
      });
    return () => {
      live = false;
    };
  }, [taskId]);

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

  const comments = loaded?.id === task.id ? loaded.rows : [];
  const loading = loaded?.id !== task.id;

  const assignedIds = new Set(task.assignees.map((a) => a.id));

  function send() {
    const text = body.trim();
    if (!text || !taskId) return;
    setError("");
    startTransition(async () => {
      // The client supplies the id, the way the live composer does, so the
      // comment could be rendered before the round trip finishes.
      const res = await addComment({ id: crypto.randomUUID(), taskId, body: text });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setBody("");
      setLoaded({ id: taskId, rows: await listComments(taskId) });
      router.refresh();
    });
  }

  function removeComment(id: string) {
    if (!taskId) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteComment(id);
      } catch {
        setError("Could not delete that comment.");
        return;
      }
      setLoaded({ id: taskId, rows: await listComments(taskId) });
      router.refresh();
    });
  }

  function toggleAssignee(member: Member) {
    if (!taskId) return;
    setError("");
    const on = assignedIds.has(member.id);
    startTransition(async () => {
      try {
        if (on) await unassignMember({ taskId, userId: member.id });
        else await assignMember({ taskId, userId: member.id });
      } catch {
        setError("Only admins can change who a card is assigned to.");
        return;
      }
      router.refresh();
    });
  }

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
          <p
            id={titleId}
            className="min-w-0 truncate text-[18px] font-bold text-[#e2e8f0]"
          >
            {task.title}
          </p>
          <div className="flex shrink-0 items-center gap-[8px]">
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete card"
              className="flex size-[32px] cursor-pointer items-center justify-center rounded-[6px] border border-[#243033]! bg-white/[0.02] text-[#94a3b8] transition-colors hover:border-[#ef4444]! hover:text-[#ef4444]"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-[32px] cursor-pointer items-center justify-center rounded-[6px] border border-[#243033]! bg-white/[0.02] text-[#94a3b8] transition-colors hover:border-[#2f3d42]! hover:text-[#e2e8f0]"
            >
              <XCircle size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {task.note ? (
            <p className="shrink-0 border-b border-[#243033]! px-[24px] py-[16px] text-[14px] font-normal text-[#94a3b8]">
              {task.note}
            </p>
          ) : null}

          <div className="relative flex shrink-0 flex-col gap-[16px] border-b border-[#243033]! p-[24px]">
            <div className="flex items-center justify-between gap-[16px]">
              <span className="flex items-center gap-[8px]">
                <UserPlus
                  size={16}
                  strokeWidth={2}
                  className="shrink-0 text-[#94a3b8]"
                />
                <span className="text-[12px] font-bold text-[#94a3b8] uppercase">
                  Assignees
                </span>
              </span>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setPicking((p) => !p)}
                  className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! px-[14px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
                >
                  <Plus size={14} strokeWidth={2} className="text-[#94a3b8]" />
                  Assign
                </button>
              ) : null}
            </div>

            {task.assignees.length === 0 ? (
              <p className="text-[14px] font-normal text-[#64748b]">
                No one assigned yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-[8px]">
                {task.assignees.map((m) => (
                  <span
                    key={m.id}
                    className="flex items-center gap-[8px] rounded-full border border-[#243033]! bg-[#0f141a] py-[4px] pr-[10px] pl-[4px]"
                  >
                    <span
                      style={{ backgroundColor: tintFor(plainName(m.name)) }}
                      className="flex size-[22px] items-center justify-center rounded-full text-[10px] font-bold text-[#0e1217]"
                    >
                      {initialsOf(plainName(m.name))}
                    </span>
                    <span className="text-[13px] font-medium text-[#e2e8f0]">
                      {plainName(m.name)}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {picking ? (
              <div className="v2-rail flex max-h-[220px] flex-col overflow-y-auto rounded-[8px] border border-[#243033]! bg-[#0f141a]">
                {members.map((m) => {
                  const on = assignedIds.has(m.id);
                  const name = plainName(m.name);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={on}
                      disabled={pending}
                      onClick={() => toggleAssignee(m)}
                      className="flex cursor-pointer items-center gap-[10px] px-[12px] py-[8px] text-left transition-colors hover:bg-white/[0.04] disabled:cursor-default"
                    >
                      <span
                        style={{ backgroundColor: tintFor(name) }}
                        className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0e1217]"
                      >
                        {initialsOf(name)}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] ${on ? "font-semibold text-[#e2e8f0]" : "font-normal text-[#94a3b8]"}`}
                      >
                        {name}
                      </span>
                      {on ? (
                        <Check
                          size={13}
                          strokeWidth={3}
                          className="shrink-0 text-[#8fb0a7]"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-[16px] border-b border-[#243033]! p-[24px]">
            <span className="flex items-center gap-[8px]">
              <MessageSquare
                size={16}
                strokeWidth={2}
                className="shrink-0 text-[#94a3b8]"
              />
              <span className="text-[12px] font-bold text-[#94a3b8] uppercase">
                Comments
              </span>
            </span>

            {loading ? (
              <p className="flex items-center gap-[8px] text-[14px] font-normal text-[#64748b]">
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                Loading.
              </p>
            ) : comments.length === 0 ? (
              <p className="text-[14px] font-normal text-[#64748b]">
                No comments yet.
              </p>
            ) : (
              <div className="flex flex-col gap-[14px]">
                {comments.map((c) => {
                  const name = plainName(c.authorName);
                  const mine = c.authorId === currentUserId;
                  return (
                    <div key={c.id} className="flex items-start gap-[10px]">
                      <span
                        style={{ backgroundColor: tintFor(name) }}
                        className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0e1217]"
                      >
                        {initialsOf(name)}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                        <div className="flex items-center gap-[8px]">
                          <p className="truncate text-[13px] font-semibold text-[#e2e8f0]">
                            {name}
                          </p>
                          {isAdmin || mine ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => removeComment(c.id)}
                              aria-label="Delete comment"
                              className="ml-auto shrink-0 cursor-pointer text-[#64748b] transition-colors hover:text-[#ef4444] disabled:cursor-default"
                            >
                              <Trash2 size={12} strokeWidth={2} />
                            </button>
                          ) : null}
                        </div>
                        <p className="text-[13px] font-normal break-words text-[#94a3b8]">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-[20px] p-[24px]">
            <textarea
              rows={4}
              value={body}
              disabled={pending}
              placeholder="Write a comment..."
              aria-label="Write a comment"
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
              }}
              className="h-[110px] w-full resize-none rounded-[8px] border border-[#243033]! bg-[#0f141a] p-[16px] text-[14px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#64748b] focus:border-[#8fb0a7]!"
            />
            <div className="flex items-center justify-between gap-[16px]">
              {error ? (
                <span className="min-w-0 truncate text-[12px] font-medium text-[#ef4444]">
                  {error}
                </span>
              ) : (
                <span className="text-[12px] font-normal text-[#64748b]">
                  {/* The frame writes both glyphs, since the shortcut is the
                      same chord on either platform. */}
                  ⌘/Ctrl + Enter to send
                </span>
              )}
              <button
                type="button"
                onClick={send}
                disabled={pending || !body.trim()}
                className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-transparent! bg-[#8fb0a7] px-[14px] py-[8px] text-[13px] font-semibold text-[#0f141a] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                ) : (
                  <Send size={14} strokeWidth={2} />
                )}
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
