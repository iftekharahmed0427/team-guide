"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Pin,
  PinOff,
  SearchX,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { removeNote, setNotePinned, updateNote } from "@/lib/actions/notes";
import { MAX_NOTE_BODY, MAX_NOTE_TITLE } from "@/lib/note-constants";
import V2ConfirmDialog from "../confirm-dialog";
import { initialsOf, tintFor } from "../member";
import {
  countLabel,
  focusBody,
  searchNotes,
  segmentsFor,
  tokensOf,
  type Note,
} from "./notes-shape";

// The searchable list. Search is the reason this section exists, so it sits at
// the top of the page rather than behind the command palette, filters as you
// type, and marks what it matched inside each note.
//
// Filtering happens here rather than in SQL because the whole set is already on
// the page: a team's notes are counted in the hundreds, and a round trip per
// keystroke would be slower than scanning them.

// Roughly the height at which a note stops being a message and starts being a
// document, past which the card collapses until asked to open.
const LONG_BODY = 700;
const LONG_LINES = 12;

const CARD = "rounded-[12px] border border-[#243033]! bg-[#171e24]";
const INPUT =
  "w-full rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[14px] py-[11px] text-[14px] font-normal text-[#e2e8f0] outline-none transition-colors placeholder:text-[#64748b] focus:border-[#8fb0a7]! disabled:opacity-60";

/** Text with the search terms marked. */
function Marked({ text, tokens }: { text: string; tokens: string[] }) {
  return (
    <>
      {segmentsFor(text, tokens).map((seg, i) =>
        seg.hit ? (
          <mark
            key={i}
            className="rounded-[3px] bg-[#8fb0a7]/25 px-[1px] text-[#e2e8f0]"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/** What the delete dialog names, so nobody confirms a note they cannot see. */
function describe(note: Note): string {
  const label = (note.title || note.body).replace(/\s+/g, " ").trim();
  return label.length > 80 ? `${label.slice(0, 80)}...` : label;
}

function NoteCard({
  note,
  tokens,
  canEdit,
  isAdmin,
  isMine,
}: {
  note: Note;
  tokens: string[];
  canEdit: boolean;
  isAdmin: boolean;
  isMine: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const searching = tokens.length > 0;
  const isLong =
    note.body.length > LONG_BODY ||
    note.body.split("\n").length > LONG_LINES;

  // While searching, a long note shows the window around the match instead of
  // its opening, so a hit buried in a runbook is visible without opening it.
  const shown = expanded
    ? note.body
    : searching
      ? focusBody(note.body, tokens)
      : note.body;
  const clamped = !expanded && !searching && isLong;
  const canExpand = isLong || shown !== note.body;

  function save() {
    setError("");
    if (!body.trim()) return setError("A note cannot be empty.");
    startTransition(async () => {
      const res = await updateNote({ id: note.id, title, body });
      if ("error" in res) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setTitle(note.title);
    setBody(note.body);
    setError("");
    setEditing(false);
  }

  function togglePin() {
    setError("");
    startTransition(async () => {
      const res = await setNotePinned(note.id, !note.pinned);
      if ("error" in res) return setError(res.error);
      router.refresh();
    });
  }

  function confirmDelete() {
    setConfirming(false);
    setError("");
    startTransition(async () => {
      const res = await removeNote(note.id);
      if ("error" in res) return setError(res.error);
      router.refresh();
    });
  }

  const iconBtn =
    "flex size-[28px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-transparent! text-[#64748b] transition-colors hover:border-[#243033]! hover:text-[#e2e8f0] disabled:cursor-default disabled:opacity-50";

  return (
    <div
      // The anchor the search palette links a note by, so a result from
      // anywhere in the app lands on the note itself.
      id={`note-${note.id}`}
      // Only ever one border colour in the list: two of them are both marked
      // important and Tailwind's own ordering, not this one, would pick the
      // winner.
      className={`flex scroll-mt-[24px] flex-col gap-[14px] rounded-[12px] border bg-[#171e24] p-[20px] ${
        note.pinned ? "border-[#8fb0a7]/40!" : "border-[#243033]!"
      }`}
    >
      <div className="flex items-start justify-between gap-[16px]">
        <div className="flex min-w-0 items-center gap-[12px]">
          {note.authorImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={note.authorImage}
              alt={note.authorName}
              className="size-[34px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              style={{ backgroundColor: tintFor(note.authorName) }}
              className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-[#0e1217]"
            >
              {initialsOf(note.authorName)}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-[3px]">
            <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">
              <Marked text={note.authorName} tokens={tokens} />
              {isMine ? (
                <span className="font-normal text-[#64748b]"> (you)</span>
              ) : null}
            </p>
            <p className="truncate text-[12px] font-normal text-[#64748b]">
              {note.when}
              {note.editedWhen ? ` · edited ${note.editedWhen}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-[6px]">
          {note.pinned ? (
            <span className="flex items-center gap-[5px] rounded-full bg-[#8fb0a7]/[0.12] px-[9px] py-[3px] text-[10px] font-bold text-[#8fb0a7] uppercase">
              <Pin size={11} strokeWidth={2} />
              Pinned
            </span>
          ) : null}
          {pending ? (
            <Loader2
              size={14}
              strokeWidth={2}
              className="animate-spin text-[#64748b]"
            />
          ) : null}
          {isAdmin && !editing ? (
            <button
              type="button"
              onClick={togglePin}
              disabled={pending}
              aria-label={note.pinned ? "Unpin note" : "Pin note"}
              title={note.pinned ? "Unpin note" : "Pin to the top for everyone"}
              className={iconBtn}
            >
              {note.pinned ? (
                <PinOff size={14} strokeWidth={2} />
              ) : (
                <Pin size={14} strokeWidth={2} />
              )}
            </button>
          ) : null}
          {canEdit && !editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={pending}
                aria-label="Edit note"
                title="Edit note"
                className={iconBtn}
              >
                <Pencil size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={pending}
                aria-label="Delete note"
                title="Delete note"
                className={`${iconBtn} hover:text-[#ef4444]!`}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </>
          ) : null}
          {editing ? (
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              aria-label="Cancel editing"
              title="Cancel"
              className={iconBtn}
            >
              <X size={14} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-[12px]">
          <input
            value={title}
            maxLength={MAX_NOTE_TITLE}
            disabled={pending}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="Note title"
            className={INPUT}
          />
          <textarea
            value={body}
            rows={Math.min(20, Math.max(5, body.split("\n").length + 1))}
            maxLength={MAX_NOTE_BODY}
            disabled={pending}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
            }}
            aria-label="Note body"
            className={`${INPUT} resize-y leading-[1.6]`}
          />
          <div className="flex items-center justify-end gap-[10px]">
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="cursor-pointer rounded-[6px] border border-[#243033]! bg-white/[0.03] px-[16px] py-[9px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]! disabled:cursor-default disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || !body.trim()}
              className="flex cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[16px] py-[9px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : null}
              Save changes
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {note.title ? (
            <p className="text-[17px] font-bold text-[#e2e8f0]">
              <Marked text={note.title} tokens={tokens} />
            </p>
          ) : null}

          <div className="relative">
            <p
              className={`text-[14px] leading-[1.7] font-normal whitespace-pre-wrap text-[#cbd5e1] ${
                clamped ? "max-h-[240px] overflow-hidden" : ""
              }`}
            >
              <Marked text={shown} tokens={tokens} />
            </p>
            {clamped ? (
              // Fades the cut edge so a clipped line reads as continuing
              // rather than as the end of the note.
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[64px] bg-gradient-to-b from-transparent to-[#171e24]" />
            ) : null}
          </div>

          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-fit cursor-pointer items-center gap-[6px] text-[12px] font-semibold text-[#8fb0a7] transition-colors hover:text-[#a3c0b8]"
            >
              {expanded ? (
                <ChevronUp size={13} strokeWidth={2} />
              ) : (
                <ChevronDown size={13} strokeWidth={2} />
              )}
              {expanded ? "Show less" : "Show the whole note"}
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="flex items-center gap-[8px] text-[12px] font-medium text-[#ef4444]">
          <AlertCircle size={13} strokeWidth={2} className="shrink-0" />
          {error}
        </p>
      ) : null}

      <V2ConfirmDialog
        open={confirming}
        title="Delete this note?"
        description={`"${describe(note)}" will be removed for the whole team. This cannot be undone.`}
        confirmLabel="Delete note"
        onCancel={() => setConfirming(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Section({
  caption,
  notes,
  tokens,
  isAdmin,
  currentUserId,
}: {
  caption: string;
  notes: Note[];
  tokens: string[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-[12px]">
      <p className="pb-[4px] text-[12px] font-bold text-[#8fb0a7] uppercase">
        {caption}
      </p>
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          tokens={tokens}
          // The action is the authority on both of these; the card only agrees
          // with it so members are not shown controls that would be refused.
          canEdit={isAdmin || note.authorId === currentUserId}
          isAdmin={isAdmin}
          isMine={note.authorId === currentUserId}
        />
      ))}
    </div>
  );
}

export default function NotesBoard({
  notes,
  isAdmin,
  currentUserId,
}: {
  notes: Note[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");

  const tokens = useMemo(() => tokensOf(query), [query]);
  const matches = useMemo(() => searchNotes(notes, tokens), [notes, tokens]);
  const pinned = useMemo(() => matches.filter((n) => n.pinned), [matches]);
  const rest = useMemo(() => matches.filter((n) => !n.pinned), [matches]);

  const searching = tokens.length > 0;

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center gap-[12px] rounded-[10px] border border-[#243033]! bg-[#171e24] px-[16px] py-[12px] focus-within:border-[#8fb0a7]!">
          <StickyNote
            size={16}
            strokeWidth={2}
            className="shrink-0 text-[#64748b]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            aria-label="Search notes"
            placeholder="Search every note by what it says, its title, or who wrote it"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] text-[#64748b] transition-colors hover:text-[#e2e8f0]"
            >
              <X size={14} strokeWidth={2} />
            </button>
          ) : null}
        </div>
        {searching ? (
          <p className="text-[12px] font-normal text-[#64748b]">
            {countLabel(matches.length, "match", "matches")} of{" "}
            {countLabel(notes.length)}
          </p>
        ) : null}
      </div>

      {matches.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center gap-[16px] p-[48px] ${CARD}`}
        >
          <span className="rounded-full bg-[#0e1217] p-[16px]">
            {searching ? (
              <SearchX size={24} strokeWidth={2} className="text-[#64748b]" />
            ) : (
              <StickyNote
                size={24}
                strokeWidth={2}
                className="text-[#64748b]"
              />
            )}
          </span>
          <div className="flex w-full flex-col items-center gap-[6px] text-center">
            <p className="text-[15px] font-semibold text-[#e2e8f0]">
              {searching
                ? `Nothing matches "${query.trim()}"`
                : "No notes yet"}
            </p>
            <p className="text-[13px] font-normal text-[#64748b]">
              {searching
                ? "Try fewer words. Search looks at titles, note text and authors."
                : "Post the first one above. Anything the team should be able to find later belongs here."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <Section
            caption={searching ? "Pinned matches" : "Pinned"}
            notes={pinned}
            tokens={tokens}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />
          <Section
            caption={
              searching ? "Matches" : pinned.length > 0 ? "All notes" : "Notes"
            }
            notes={rest}
            tokens={tokens}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />
        </>
      )}
    </div>
  );
}
