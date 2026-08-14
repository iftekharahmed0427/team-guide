import { Gamepad, Plus, Trash2 } from "lucide-react";

// /v2/specialists - the redesign's by-game directory, built from the
// "specialists-compact" Figma frame (node 61:4): the header with its add-a-game
// field, then a three-up grid of game cards ending in the dashed new-card tile.
// Shell comes from app/v2/layout.tsx.
//
// Content is the frame's placeholder copy - this is still the redesign canvas,
// so nothing reads from member_game and every control is inert. The compact
// view has no primary/backup distinction; it is just who to contact.

// Avatar fills are the frame's, one muted hue per member.
const MEMBERS: Record<string, { name: string; tint: string }> = {
  AN: { name: "Angeline", tint: "#f08080" },
  CO: { name: "Conscience", tint: "#4ed09d" },
  FA: { name: "Farah", tint: "#d8b084" },
  FM: { name: "FxMoon", tint: "#8b93a8" },
  IY: { name: "iiYoyo", tint: "#8eaf9d" },
  OS: { name: "OrewSegs", tint: "#a28df6" },
  PE: { name: "Petrino", tint: "#989f70" },
  SV: { name: "Siren Vampy", tint: "#5d8aa8" },
  T: { name: "Trinity™", tint: "#d8909a" },
};

const GAMES: { name: string; specialists: string[] }[] = [
  { name: "Minecraft", specialists: ["CO", "FA", "IY", "OS", "FM"] },
  { name: "Rust", specialists: ["FA", "SV", "T"] },
  { name: "ARK: Survival Ascended", specialists: ["AN", "FA", "SV", "T"] },
  { name: "Valheim", specialists: ["T"] },
  { name: "Palworld", specialists: ["FA", "IY", "OS", "T"] },
  { name: "Counter-Strike 2", specialists: [] },
  { name: "Terraria", specialists: ["IY"] },
  { name: "Ark Survival Evolved", specialists: ["AN", "FA", "SV", "T"] },
  { name: "Conan", specialists: ["AN", "SV", "T"] },
  { name: "FiveM", specialists: ["FA", "OS", "PE"] },
  { name: "Project Zomboid", specialists: ["IY"] },
];

/** The stack shows four faces; the rest collapse into a +N badge. */
const SHOWN = 4;

function AvatarStack({ specialists }: { specialists: string[] }) {
  const shown = specialists.slice(0, SHOWN);
  const overflow = specialists.length - shown.length;
  const last = shown.length + (overflow > 0 ? 1 : 0) - 1;

  const chip =
    "flex size-[32px] shrink-0 items-center justify-center rounded-full border-2 border-[#171e24]! text-[11px] font-bold";

  return (
    <div className="flex items-center">
      {shown.map((key, i) => (
        <span
          key={key}
          title={MEMBERS[key].name}
          style={{ backgroundColor: MEMBERS[key].tint }}
          className={`${chip} text-[#11161b] ${i < last ? "-mr-[8px]" : ""}`}
        >
          {key}
        </span>
      ))}
      {overflow > 0 && (
        <span
          title={specialists.slice(SHOWN).map((k) => MEMBERS[k].name).join(", ")}
          className={`${chip} bg-[#2c3a42] text-white`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

export default function V2SpecialistsPage() {
  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[8px]">
            <Gamepad size={24} strokeWidth={2} className="shrink-0 text-[#4ed09d]" />
            <h1 className="text-[22px] font-extrabold text-white">Specialists</h1>
          </div>
          {/* The frame's line joins these two clauses with an em dash. */}
          <p className="text-[13px] font-normal text-[#94a3b8]">
            Who to reach out to for each game. Use + to assign a member.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-[12px]">
          <input
            type="text"
            placeholder="Add a game..."
            className="w-[240px] rounded-[8px] border border-[#243033]! bg-[#090d11] px-[16px] py-[10px] text-[13px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#94a3b8] focus:border-[#4ed09d]!"
          />
          <button
            type="button"
            className="cursor-pointer rounded-[8px] bg-[#4ed09d] px-[16px] py-[10px] text-[13px] font-bold text-[#0e1217] transition-colors hover:bg-[#6bdcaf]"
          >
            Add Game
          </button>
        </div>
      </div>

      <div className="h-px bg-[#243033]" />

      <div className="flex flex-col gap-[4px]">
        <p className="text-[16px] font-bold text-white">By game</p>
        <p className="text-[13px] font-normal text-[#94a3b8]">
          The people to reach out to for each game.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-[24px]">
        {GAMES.map((game) => (
          <div
            key={game.name}
            className="flex h-[140px] flex-col justify-between overflow-hidden rounded-[12px] border border-[#243033]! bg-[#171e24] p-[16px]"
          >
            <div className="flex items-center justify-between gap-[8px]">
              <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">
                {game.name}
              </p>
              <button
                type="button"
                aria-label={`Remove ${game.name}`}
                className="shrink-0 cursor-pointer rounded-[6px] p-[6px] text-[#4b5e63] transition-colors hover:bg-white/[0.03] hover:text-[#ef4444]"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-[8px]">
              {game.specialists.length > 0 ? (
                <AvatarStack specialists={game.specialists} />
              ) : (
                <p className="truncate text-[13px] font-normal text-[#4b5e63] italic">
                  No specialists assigned
                </p>
              )}
              <button
                type="button"
                aria-label={`Assign a member to ${game.name}`}
                className="shrink-0 cursor-pointer rounded-full border border-[#243033]! bg-[#1c2630] p-[6px] text-[#4ed09d] transition-colors hover:border-[#4ed09d]!"
              >
                <Plus size={12} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="flex h-[140px] cursor-pointer flex-col items-center justify-center gap-[10px] rounded-[12px] border-2 border-dashed border-[#34484e]! transition-colors hover:border-[#4ed09d]!"
        >
          <span className="flex size-[36px] items-center justify-center rounded-full bg-[#1c2630] text-[#4ed09d]">
            <Plus size={16} strokeWidth={2} />
          </span>
          <span className="text-[13px] font-semibold text-[#94a3b8]">New Game Card</span>
        </button>
      </div>
    </div>
  );
}
