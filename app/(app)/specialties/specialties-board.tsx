"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, Plus, X, Trash2, AlertCircle } from "lucide-react";
import Avatar from "@/app/components/avatar";
import {
  addSpecialty,
  removeSpecialty,
  addGame,
  renameGame,
  deleteGame,
} from "./actions";

type Member = { id: string; name: string; image: string | null };
type Game = { id: string; name: string; memberIds: string[] };
type Result = { ok: true } | { error: string };

export default function SpecialtiesBoard({
  isAdmin,
  games,
  members,
}: {
  isAdmin: boolean;
  games: Game[];
  members: Member[];
}) {
  // Assigned member ids per game, seeded from the server and updated
  // optimistically so add/remove feel instant; re-seeded on a realtime refresh.
  const [assigned, setAssigned] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(games.map((g) => [g.id, g.memberIds])),
  );
  const [error, setError] = useState("");
  const [openGame, setOpenGame] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const router = useRouter();
  // Local game-name edit state for inline rename, plus the new-game draft. Game
  // add/rename/delete are not optimistic - they re-fetch on success.
  const [gameNames, setGameNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(games.map((g) => [g.id, g.name])),
  );
  const [newGame, setNewGame] = useState("");
  const [gamePending, startGameTransition] = useTransition();

  useEffect(() => {
    setAssigned(Object.fromEntries(games.map((g) => [g.id, g.memberIds])));
    setGameNames(Object.fromEntries(games.map((g) => [g.id, g.name])));
  }, [games]);

  function runGame(fn: () => Promise<Result>, after?: () => void) {
    setError("");
    startGameTransition(async () => {
      const res = await fn();
      if ("error" in res) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  function createGame() {
    const name = newGame.trim();
    if (!name) return;
    runGame(() => addGame(name), () => setNewGame(""));
  }

  function rename(gameId: string) {
    const name = (gameNames[gameId] ?? "").trim();
    const original = games.find((g) => g.id === gameId)?.name ?? "";
    if (!name || name === original) {
      setGameNames((s) => ({ ...s, [gameId]: original })); // revert blank / unchanged
      return;
    }
    runGame(() => renameGame(gameId, name));
  }

  function removeGame(gameId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Everyone assigned to it will be unassigned.`)) return;
    runGame(() => deleteGame(gameId));
  }

  const memberById = new Map(members.map((m) => [m.id, m]));

  function add(gameId: string, userId: string) {
    setError("");
    setOpenGame(null);
    setAssigned((a) => ({ ...a, [gameId]: [...(a[gameId] ?? []), userId] }));
    startTransition(async () => {
      const res = await addSpecialty(userId, gameId);
      if ("error" in res) {
        setError(res.error);
        setAssigned((a) => ({ ...a, [gameId]: (a[gameId] ?? []).filter((id) => id !== userId) }));
      }
    });
  }

  function remove(gameId: string, userId: string) {
    setError("");
    const prev = assigned[gameId] ?? [];
    setAssigned((a) => ({ ...a, [gameId]: prev.filter((id) => id !== userId) }));
    startTransition(async () => {
      const res = await removeSpecialty(userId, gameId);
      if ("error" in res) {
        setError(res.error);
        setAssigned((a) => ({ ...a, [gameId]: prev }));
      }
    });
  }

  return (
    <section className="border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight">By game</h2>
        <p className="text-xs text-muted">The people to reach out to for each game.</p>
      </div>

      {isAdmin ? (
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <input
            value={newGame}
            disabled={gamePending}
            onChange={(e) => setNewGame(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createGame();
            }}
            placeholder="Add a game"
            maxLength={60}
            className="h-9 flex-1 border border-border bg-surface-2 px-3 text-sm text-foreground outline-none focus:border-muted"
          />
          <button
            type="button"
            onClick={createGame}
            disabled={gamePending || newGame.trim() === ""}
            className="btn-wipe flex h-9 shrink-0 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            <Plus size={15} strokeWidth={1.75} />
            Add game
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-5 py-2.5 text-xs text-red-400">
          <AlertCircle size={13} strokeWidth={2} />
          {error}
        </div>
      ) : null}

      {games.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">
          {isAdmin ? "No games yet. Add one above." : "No games yet."}
        </p>
      ) : (
        <ul>
          {games.map((g) => {
            const ids = (assigned[g.id] ?? []).slice();
            const people = ids
              .map((id) => memberById.get(id))
              .filter((m): m is Member => !!m)
              .sort((a, b) => a.name.localeCompare(b.name));
            const available = members
              .filter((m) => !ids.includes(m.id))
              .sort((a, b) => a.name.localeCompare(b.name));

            return (
              <li
                key={g.id}
                className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex items-center gap-2 sm:w-60 sm:shrink-0">
                  <Gamepad2 size={15} strokeWidth={1.75} className="shrink-0 text-muted" />
                  {isAdmin ? (
                    <>
                      <input
                        value={gameNames[g.id] ?? ""}
                        disabled={gamePending}
                        onChange={(e) => setGameNames((s) => ({ ...s, [g.id]: e.target.value }))}
                        onBlur={() => rename(g.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        maxLength={60}
                        aria-label={`Rename ${g.name}`}
                        className="h-8 min-w-0 flex-1 border border-transparent bg-transparent px-2 text-sm font-medium text-foreground outline-none hover:border-border focus:border-muted focus:bg-surface-2"
                      />
                      <button
                        type="button"
                        onClick={() => removeGame(g.id, g.name)}
                        disabled={gamePending}
                        aria-label={`Delete ${g.name}`}
                        title="Delete game"
                        className="flex h-7 w-7 shrink-0 items-center justify-center text-muted transition-colors hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </>
                  ) : (
                    <span className="text-sm font-medium">{g.name}</span>
                  )}
                </div>

                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {people.length === 0 && !isAdmin ? (
                    <span className="text-xs text-muted">No one assigned yet.</span>
                  ) : null}

                  {people.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 border border-border bg-surface-2 py-0.5 pl-0.5 pr-1.5 text-xs"
                    >
                      <Avatar name={p.name} image={p.image} size={18} />
                      {p.name}
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => remove(g.id, p.id)}
                          aria-label={`Remove ${p.name}`}
                          className="ml-0.5 text-muted transition-colors hover:text-red-400"
                        >
                          <X size={12} strokeWidth={2} />
                        </button>
                      ) : null}
                    </span>
                  ))}

                  {isAdmin ? (
                    <AddPicker
                      open={openGame === g.id}
                      onToggle={() => setOpenGame((cur) => (cur === g.id ? null : g.id))}
                      onClose={() => setOpenGame((cur) => (cur === g.id ? null : cur))}
                      available={available}
                      onPick={(userId) => add(g.id, userId)}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function AddPicker({
  open,
  onToggle,
  onClose,
  available,
  onPick,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  available: Member[];
  onPick: (userId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Assign a member"
        className="flex h-6 w-6 items-center justify-center border border-border text-muted transition-colors hover:border-muted hover:text-foreground"
      >
        <Plus size={13} strokeWidth={2} />
      </button>

      {open ? (
        <div className="fx-menu absolute left-0 top-7 z-10 max-h-64 w-52 overflow-y-auto border border-border bg-surface-2">
          {available.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">Everyone is already assigned.</p>
          ) : (
            available.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onPick(m.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-surface"
              >
                <Avatar name={m.name} image={m.image} size={18} />
                <span className="truncate">{m.name}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
