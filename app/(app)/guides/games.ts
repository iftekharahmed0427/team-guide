// Curated list of games we publish guides for. Editing this array updates the
// editor's category picker and the order sections appear on the guides index.
export const GAMES = [
  "Minecraft",
  "Rust",
  "ARK: Survival Ascended",
  "Valheim",
  "Palworld",
  "Counter-Strike 2",
  "Terraria",
] as const;

export type Game = (typeof GAMES)[number];

// Options for the CustomSelect picker.
export const GAME_OPTIONS = GAMES.map((g) => ({ value: g, label: g }));

export function isGame(value: string): value is Game {
  return (GAMES as readonly string[]).includes(value);
}
