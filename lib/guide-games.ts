import { randomUUID } from "node:crypto";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { gameCategory } from "@/db/app-schema";

// Server-only helpers for the admin-managed games list. (Imports `db`, so do not
// import this from a client component; pass the options down as props instead.)

// Seeded the first time the list is read, so the picker is never empty.
export const DEFAULT_GAMES = [
  "Minecraft",
  "Rust",
  "ARK: Survival Ascended",
  "Valheim",
  "Palworld",
  "Counter-Strike 2",
  "Terraria",
] as const;

// Insert the default games once. No-op once any game exists; the unique name
// constraint makes it safe under concurrent first reads.
async function ensureDefaultGames(): Promise<void> {
  const existing = await db.select({ id: gameCategory.id }).from(gameCategory).limit(1);
  if (existing.length > 0) return;
  await db
    .insert(gameCategory)
    .values(DEFAULT_GAMES.map((name, i) => ({ id: randomUUID(), name, position: i })))
    .onConflictDoNothing();
}

// The games list in display order, seeding defaults on first use.
export async function getGames(): Promise<string[]> {
  await ensureDefaultGames();
  const rows = await db
    .select({ name: gameCategory.name })
    .from(gameCategory)
    .orderBy(asc(gameCategory.position), asc(gameCategory.name));
  return rows.map((r) => r.name);
}

// Options for the CustomSelect picker.
export function gameOptions(names: string[]): { value: string; label: string }[] {
  return names.map((g) => ({ value: g, label: g }));
}
