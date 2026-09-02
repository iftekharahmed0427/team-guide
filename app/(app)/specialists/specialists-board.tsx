"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Gamepad,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  addGame,
  addSpecialty,
  deleteGame,
  removeSpecialty,
} from "@/lib/actions/specialties";
import ConfirmDialog from "../confirm-dialog";
import Avatar from "../avatar";

// The by-game directory from the "specialists-compact" frame (node 61:4), wired
// to the live specialty actions.
//
// The + opens a roster of every member rather than only the unassigned ones, so
// one popover both assigns and unassigns: a member already on the game shows a
// tick, and clicking them takes them off. The live picker only ever adds, which
// means removing someone is a separate motion somewhere else.

export type Member = {
  id: string;
  name: string;
  image: string | null;
};
export type Game = { id: string; name: string; memberIds: string[] };

/** The stack shows four faces; the rest collapse into a +N badge. */
const SHOWN = 4;

export default function SpecialistsBoard({
  games,
  members,
  isAdmin,
}: {
  games: Game[];
  members: Member[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const byId = new Map(members.map((m) => [m.id, m]));

  const [openGame, setOpenGame] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  // Which pair is mid-flight, so only the row being toggled shows a spinner.
  const [busy, setBusy] = useState<string | null>(null);
  const [addingGame, setAddingGame] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Game | null>(null);

  async function toggle(game: Game, member: Member) {
    const assigned = game.memberIds.includes(member.id);
    setBusy(`${game.id}:${member.id}`);
    setError("");
    const res = assigned
      ? await removeSpecialty(member.id, game.id)
      : await addSpecialty(member.id, game.id);
    setBusy(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function submitGame() {
    const name = draft.trim();
    if (!name) return;
    setAddingGame(true);
    setError("");
    const res = await addGame(name);
    setAddingGame(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setDraft("");
    router.refresh();
  }

  async function removeGame(game: Game) {
    setPendingDelete(null);
    setError("");
    const res = await deleteGame(game.id);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  // What the confirmation says, spelled out from the game in hand: deleting it
  // takes its specialists off with it (the join rows cascade), and the action
  // refuses outright while a guide is still filed under the name.
  function deleteCopy(game: Game): string {
    const n = game.memberIds.length;
    const specialists =
      n === 0
        ? "It has no specialists assigned."
        : `Its ${n} specialist${n === 1 ? "" : "s"} will be unassigned.`;
    return `"${game.name}" will be removed from the games list and from the Guides category picker. ${specialists} This cannot be undone.`;
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[8px]">
            <Gamepad
              size={24}
              strokeWidth={2}
              className="shrink-0 text-[#4ed09d]"
            />
            <h1 className="text-[22px] font-extrabold text-white">
              Specialists
            </h1>
          </div>
          <p className="text-[13px] font-normal text-[#94a3b8]">
            Who to reach out to for each game.
            {isAdmin ? " Use + to assign or unassign a member." : ""}
          </p>
        </div>

        {isAdmin ? (
          <div className="flex shrink-0 items-center gap-[12px]">
            <input
              type="text"
              value={draft}
              disabled={addingGame}
              placeholder="Add a game..."
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitGame();
              }}
              className="w-[240px] rounded-[8px] border border-[#243033]! bg-[#090d11] px-[16px] py-[10px] text-[13px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#94a3b8] focus:border-[#4ed09d]!"
            />
            <button
              type="button"
              onClick={submitGame}
              disabled={addingGame || !draft.trim()}
              className="flex cursor-pointer items-center gap-[8px] rounded-[8px] bg-[#4ed09d] px-[16px] py-[10px] text-[13px] font-bold text-[#0e1217] transition-colors hover:bg-[#6bdcaf] disabled:cursor-default disabled:opacity-60"
            >
              {addingGame ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : null}
              Add Game
            </button>
          </div>
        ) : null}
      </div>

      <div className="h-px bg-[#243033]" />

      <div className="flex flex-col gap-[4px]">
        <p className="text-[16px] font-bold text-white">By game</p>
        <p className="text-[13px] font-normal text-[#94a3b8]">
          The people to reach out to for each game.
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-[8px] rounded-[8px] border border-[#ef4444]/40! bg-[#ef4444]/[0.06] px-[16px] py-[12px] text-[13px] font-medium text-[#ef4444]">
          <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-[24px]">
        {games.map((game) => {
          const assigned = game.memberIds
            .map((id) => byId.get(id))
            .filter((m): m is Member => Boolean(m));

          return (
            <div
              key={game.id}
              className="flex h-[140px] flex-col justify-between rounded-[12px] border border-[#243033]! bg-[#171e24] p-[16px]"
            >
              <div className="flex items-center justify-between gap-[8px]">
                <p
                  title={game.name}
                  className="min-w-0 flex-1 truncate text-[15px] font-bold text-white"
                >
                  {game.name}
                </p>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(game)}
                    aria-label={`Delete ${game.name}`}
                    className="shrink-0 cursor-pointer rounded-[6px] p-[6px] text-[#4b5e63] transition-colors hover:bg-white/[0.03] hover:text-[#ef4444]"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-[8px]">
                {assigned.length > 0 ? (
                  <AvatarStack members={assigned} />
                ) : (
                  <p className="truncate text-[13px] font-normal text-[#4b5e63] italic">
                    No specialists assigned
                  </p>
                )}

                {isAdmin ? (
                  <MemberPicker
                    game={game}
                    members={members}
                    open={openGame === game.id}
                    busy={busy}
                    onOpen={() =>
                      setOpenGame(openGame === game.id ? null : game.id)
                    }
                    onClose={() => setOpenGame(null)}
                    onToggle={(member) => toggle(game, member)}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete game?"}
        description={pendingDelete ? deleteCopy(pendingDelete) : ""}
        confirmLabel="Delete game"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removeGame(pendingDelete)}
      />
    </div>
  );
}

function AvatarStack({ members }: { members: Member[] }) {
  const shown = members.slice(0, SHOWN);
  const overflow = members.length - shown.length;
  const last = shown.length + (overflow > 0 ? 1 : 0) - 1;

  // Avatar draws the circle; this is just the ring that separates overlapping
  // ones from the card behind them.
  const chip = "border-2 border-[#171e24]!";

  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <Avatar
          key={m.id}
          name={m.name}
          image={m.image}
          size={32}
          textClassName="text-[11px]"
          className={`${chip} ${i < last ? "-mr-[8px]" : ""}`}
        />
      ))}
      {overflow > 0 ? (
        <span
          title={members
            .slice(SHOWN)
            .map((m) => m.name)
            .join(", ")}
          className={`${chip} bg-[#2c3a42] text-white`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

// The roster popover. Every member is listed with their current state, so one
// list both assigns and unassigns; a filter appears once the team is long enough
// for scanning to be slower than typing.
const FILTER_FROM = 8;

type Placement = {
  side: "up" | "down";
  align: "right" | "left";
  maxList: number;
};

// The list's own ceiling, the header and filter above it, one row, the popover
// width, and the gap kept against the container edge. Used to work out where
// the popover fits.
const MAX_LIST = 240;
const CHROME = 84;
const ROW = 38;
const WIDTH = 248;
const MARGIN = 16;

function MemberPicker({
  game,
  members,
  open,
  busy,
  onOpen,
  onClose,
  onToggle,
}: {
  game: Game;
  members: Member[];
  open: boolean;
  busy: string | null;
  onOpen: () => void;
  onClose: () => void;
  onToggle: (member: Member) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");

  // Which way the popover opens, and how tall its list may be. A card in the
  // top row has nothing above it, so opening upward there runs off the top of
  // the page; this measures the real gap on each side and takes the better one.
  const [placement, setPlacement] = useState<Placement>({
    side: "up",
    align: "right",
    maxList: MAX_LIST,
  });

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;

    // The workspace scrolls and clips on both axes, so it is the frame the
    // popover has to fit inside, not the window.
    const frame = trigger.closest("main") ?? document.documentElement;

    function measure() {
      const rect = trigger!.getBoundingClientRect();
      const bounds = frame.getBoundingClientRect();

      const above = rect.top - bounds.top - MARGIN - CHROME;
      const below = bounds.bottom - rect.bottom - MARGIN - CHROME;
      const side = above >= below ? "up" : "down";
      const room = side === "up" ? above : below;

      // Anchored to the trigger's right edge the popover reaches leftward; when
      // that runs past the frame it anchors left and reaches the other way.
      const fitsLeftward = rect.right - WIDTH >= bounds.left + MARGIN;
      const align = fitsLeftward ? "right" : "left";

      // One row is the floor: a popover shorter than that is not worth opening.
      setPlacement({
        side,
        align,
        maxList: Math.max(ROW, Math.min(MAX_LIST, room)),
      });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

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

  const q = query.trim().toLowerCase();
  const shown = q
    ? members.filter((m) => m.name.toLowerCase().includes(q))
    : members;
  const count = game.memberIds.length;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={onOpen}
        aria-label={`Assign a member to ${game.name}`}
        aria-expanded={open}
        className={`cursor-pointer rounded-full border p-[6px] transition-colors ${
          open
            ? "border-[#4ed09d]! bg-[#4ed09d]/15 text-[#4ed09d]"
            : "border-[#243033]! bg-[#1c2630] text-[#4ed09d] hover:border-[#4ed09d]!"
        }`}
      >
        <Plus size={12} strokeWidth={2} />
      </button>

      {open ? (
        <div
          className={`absolute z-20 flex w-[248px] flex-col overflow-hidden rounded-[10px] border border-[#243033]! bg-[#1c2630] shadow-[0px_18px_40px_-12px_rgba(0,0,0,0.6)] ${
            placement.side === "up" ? "bottom-[34px]" : "top-[34px]"
          } ${placement.align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="flex items-center justify-between gap-[8px] border-b border-[#243033]! px-[12px] py-[10px]">
            <p className="truncate text-[12px] font-bold text-white uppercase">
              {game.name}
            </p>
            <p className="shrink-0 text-[11px] font-semibold text-[#94a3b8]">
              {count} assigned
            </p>
          </div>

          {members.length >= FILTER_FROM ? (
            <div className="flex items-center gap-[8px] border-b border-[#243033]! px-[12px] py-[8px]">
              <Search
                size={13}
                strokeWidth={2}
                className="shrink-0 text-[#4b5e63]"
              />
              <input
                value={query}
                autoFocus
                aria-label="Filter members"
                placeholder="Filter members"
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[12px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#4b5e63]"
              />
            </div>
          ) : null}

          <div
            style={{ maxHeight: placement.maxList }}
            className="v2-rail flex flex-col overflow-y-auto py-[4px]"
          >
            {shown.length === 0 ? (
              <p className="px-[12px] py-[10px] text-[12px] font-normal text-[#4b5e63]">
                No member matches that.
              </p>
            ) : (
              shown.map((member) => {
                const assigned = game.memberIds.includes(member.id);
                const pending = busy === `${game.id}:${member.id}`;
                return (
                  <button
                    key={member.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={assigned}
                    disabled={pending}
                    onClick={() => onToggle(member)}
                    className="flex cursor-pointer items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-white/[0.04] disabled:cursor-default"
                  >
                    <Avatar
                      name={member.name}
                      image={member.image}
                      size={24}
                      textClassName="text-[10px]"
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-[13px] ${
                        assigned
                          ? "font-semibold text-white"
                          : "font-normal text-[#94a3b8]"
                      }`}
                    >
                      {member.name}
                    </span>
                    <span className="flex size-[18px] shrink-0 items-center justify-center">
                      {pending ? (
                        <Loader2
                          size={13}
                          strokeWidth={2}
                          className="animate-spin text-[#4ed09d]"
                        />
                      ) : assigned ? (
                        <span className="flex size-[16px] items-center justify-center rounded-[4px] bg-[#4ed09d] text-[#0e1217]">
                          <Check size={11} strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="size-[16px] rounded-[4px] border border-[#34484e]!" />
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
