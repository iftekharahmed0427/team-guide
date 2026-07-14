"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { createSource, renameSource, deleteSource } from "./actions";

type Source = { id: string; name: string };
type Result = { ok: true } | { error: string };

export default function SourcesManager({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(sources.map((s) => [s.id, s.name])),
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Re-sync local edit state when the server sends a fresh list.
  useEffect(() => {
    setNames(Object.fromEntries(sources.map((s) => [s.id, s.name])));
  }, [sources]);

  function run(fn: () => Promise<Result>, after?: () => void) {
    setError("");
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  function add() {
    const name = draft.trim();
    if (!name) return;
    run(() => createSource(name), () => setDraft(""));
  }

  function rename(id: string) {
    const name = (names[id] ?? "").trim();
    const original = sources.find((s) => s.id === id)?.name ?? "";
    if (!name || name === original) {
      setNames((s) => ({ ...s, [id]: original })); // revert a blank / unchanged edit
      return;
    }
    run(() => renameSource(id, name));
  }

  function remove(id: string, name: string) {
    if (!window.confirm(`Delete the "${name}" source? Existing reviews keep their data.`)) return;
    run(() => deleteSource(id));
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="flex items-center gap-2 border border-border bg-surface px-4 py-2.5 text-xs text-red-400">
          <AlertCircle size={13} strokeWidth={2} />
          {error}
        </div>
      ) : null}

      {/* Add a source */}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="New source name"
          maxLength={60}
          className="h-9 flex-1 border border-border bg-surface-2 px-3 text-sm text-foreground outline-none focus:border-muted"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || draft.trim() === ""}
          className="btn-wipe flex h-9 shrink-0 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Plus size={15} strokeWidth={1.75} />
          Add
        </button>
      </div>

      {/* Existing sources */}
      <div className="border border-border bg-surface">
        {sources.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">No sources yet. Add one above.</p>
        ) : (
          <ul>
            {sources.map((s) => (
              <li key={s.id} className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0">
                <input
                  value={names[s.id] ?? ""}
                  disabled={pending}
                  onChange={(e) => setNames((st) => ({ ...st, [s.id]: e.target.value }))}
                  onBlur={() => rename(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  maxLength={60}
                  className="h-8 flex-1 border border-transparent bg-transparent px-2 text-sm text-foreground outline-none hover:border-border focus:border-muted focus:bg-surface-2"
                />
                <button
                  type="button"
                  onClick={() => remove(s.id, s.name)}
                  disabled={pending}
                  title="Delete source"
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
