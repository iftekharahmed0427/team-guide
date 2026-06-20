"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Gamepad2, Plus, X, AlertCircle } from "lucide-react";
import Avatar from "@/app/components/avatar";
import { addSpecialty, removeSpecialty } from "./actions";

type Member = { id: string; name: string; image: string | null };
type Game = { id: string; name: string; memberIds: string[] };

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

  useEffect(() => {
    setAssigned(Object.fromEntries(games.map((g) => [g.id, g.memberIds])));
  }, [games]);

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

      {error ? (
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-5 py-2.5 text-xs text-red-400">
          <AlertCircle size={13} strokeWidth={2} />
          {error}
        </div>
      ) : null}

      {games.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">
          No games yet. Add games from the guide editor first.
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
                <div className="flex items-center gap-2.5 sm:w-48 sm:shrink-0">
                  <Gamepad2 size={15} strokeWidth={1.75} className="text-muted" />
                  <span className="text-sm font-medium">{g.name}</span>
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
