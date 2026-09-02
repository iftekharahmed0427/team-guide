import { asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import { gameCategory, memberGame } from "@/db/app-schema";
import { initialsOf, plainName, tintFor } from "../member";
import SpecialistsBoard, { type Game, type Member } from "./specialists-board";

// /v2/specialists - the by-game directory from the "specialists-compact" Figma
// frame (node 61:4): the header with its add-a-game field, then a three-up grid
// of game cards. Shell comes from app/v2/layout.tsx.
//
// Reads the real games and assignments now, and the + on each card opens a
// roster where a member can be toggled on or off the game.

// Entries in game_category that are not games (they exist for the guides
// categories) and should not appear in the specialists list. Same exclusion the
// live page makes.
const EXCLUDED_CATEGORIES = new Set(["customer info - all server types"]);

export default async function V2SpecialistsPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const [gameRows, memberRows, assignments] = await Promise.all([
    db
      .select({ id: gameCategory.id, name: gameCategory.name })
      .from(gameCategory)
      .orderBy(asc(gameCategory.position), asc(gameCategory.name)),
    db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
      })
      .from(userTable)
      .orderBy(userTable.name),
    db
      .select({ userId: memberGame.userId, gameId: memberGame.gameId })
      .from(memberGame),
  ]);

  const idsByGame = new Map<string, string[]>(gameRows.map((g) => [g.id, []]));
  for (const a of assignments) idsByGame.get(a.gameId)?.push(a.userId);

  const games: Game[] = gameRows
    .filter((g) => !EXCLUDED_CATEGORIES.has(g.name.trim().toLowerCase()))
    .map((g) => ({
      id: g.id,
      name: g.name,
      memberIds: idsByGame.get(g.id) ?? [],
    }));

  // Names come through plainName because one member's Discord name is stored in
  // the mathematical alphanumeric block; the avatar hue is derived from the name
  // rather than stored, so it stays stable as the roster changes.
  const members: Member[] = memberRows.map((m) => {
    const name = plainName(m.name || m.email || "Member");
    return {
      id: m.id,
      name,
      initials: initialsOf(name),
      tint: tintFor(name),
    };
  });

  return (
    <div className="p-[32px]">
      <SpecialistsBoard games={games} members={members} isAdmin={isAdmin} />
    </div>
  );
}
