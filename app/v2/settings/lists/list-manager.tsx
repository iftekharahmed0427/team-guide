"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ConfirmButton,
  ErrorLine,
  INPUT,
  useAction,
  type ActionResult,
} from "../settings-controls";

// One editable list. The three catalogues (payment roles, dispute categories,
// review sources) are the same interaction, so they are the same component with
// different actions passed in; payment roles add two flags per entry.
//
// The actions are the live ones from app/(v1)/settings, so a change made here
// is the same write, the same activity log entry and the same notifyChange as
// the old page. Renaming commits on blur, which is what the live managers do.

export type ListEntry = {
  id: string;
  name: string;
  flags?: { key: string; label: string; hint: string; value: boolean }[];
};

export default function ListManager({
  entries,
  noun,
  onCreate,
  onRename,
  onDelete,
  onFlag,
  deleteWarning,
}: {
  entries: ListEntry[];
  /** Singular, lowercase: used in the placeholder and the confirm copy. */
  noun: string;
  onCreate: (name: string) => Promise<ActionResult>;
  onRename: (id: string, name: string) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
  onFlag?: (id: string, key: string, value: boolean) => Promise<ActionResult>;
  deleteWarning?: string;
}) {
  const { run, pending, error } = useAction();
  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(entries.map((e) => [e.id, e.name])),
  );

  // Re-sync the edit boxes when the server sends a fresh list, so a rename made
  // in another tab is not overwritten by stale local state. Adjusting state
  // during render rather than in an effect: React re-runs this component
  // immediately with the new state and never commits the stale boxes.
  const signature = entries.map((e) => `${e.id}:${e.name}`).join("|");
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setNames(Object.fromEntries(entries.map((e) => [e.id, e.name])));
  }

  function add() {
    const name = draft.trim();
    if (!name) return;
    run(() => onCreate(name), () => setDraft(""));
  }

  function commitRename(id: string) {
    const original = entries.find((e) => e.id === id)?.name ?? "";
    const next = (names[id] ?? "").trim();
    // A blank or unchanged edit reverts rather than firing a write.
    if (!next || next === original) {
      setNames((s) => ({ ...s, [id]: original }));
      return;
    }
    run(() => onRename(id, next));
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[12px]">
      {entries.length === 0 ? (
        <p className="py-[8px] text-[13px] font-normal text-[#64748b]">
          No {noun}s yet. Add the first one below.
        </p>
      ) : (
        <div className="flex flex-col">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-[10px] border-b border-[#243033]! py-[12px] first:pt-0 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-[8px]">
                <input
                  value={names[entry.id] ?? ""}
                  disabled={pending}
                  aria-label={`${entry.name} name`}
                  onChange={(e) =>
                    setNames((s) => ({ ...s, [entry.id]: e.target.value }))
                  }
                  onBlur={() => commitRename(entry.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                      setNames((s) => ({ ...s, [entry.id]: entry.name }));
                      e.currentTarget.blur();
                    }
                  }}
                  className={INPUT}
                />
                <ConfirmButton
                  label="Delete"
                  confirmLabel="Delete"
                  pending={pending}
                  onConfirm={() => run(() => onDelete(entry.id))}
                />
              </div>

              {entry.flags && onFlag ? (
                <div className="flex flex-wrap items-center gap-[8px]">
                  {entry.flags.map((flag) => (
                    <button
                      key={flag.key}
                      type="button"
                      disabled={pending}
                      title={flag.hint}
                      aria-pressed={flag.value}
                      onClick={() =>
                        run(() => onFlag(entry.id, flag.key, !flag.value))
                      }
                      className={`cursor-pointer rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold transition-colors disabled:cursor-default disabled:opacity-60 ${
                        flag.value
                          ? "bg-[#8fb0a7]/15 text-[#8fb0a7]"
                          : "bg-[#0e1217] text-[#64748b] hover:text-[#94a3b8]"
                      }`}
                    >
                      {flag.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-[8px] pt-[4px]">
        <input
          value={draft}
          disabled={pending}
          placeholder={`Add a ${noun}`}
          aria-label={`New ${noun}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          className={INPUT}
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || !draft.trim()}
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[16px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
        >
          <Plus size={14} strokeWidth={2} />
          Add
        </button>
      </div>

      <ErrorLine message={error} />

      {deleteWarning ? (
        <p className="flex items-start gap-[6px] text-[11px] font-normal text-[#64748b]">
          <Trash2 size={12} strokeWidth={2} className="mt-[2px] shrink-0" />
          {deleteWarning}
        </p>
      ) : null}
    </div>
  );
}
