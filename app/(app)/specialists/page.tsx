import { asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import { gameCategory, memberGame } from "@/db/app-schema";
import { plainName } from "../member";
import SpecialistsBoard, { type Game, type Member } from "./specialists-board";

// /specialists - the by-game directory from the "specialists-compact" Figma
// frame (node 61:4): the header with its add-a-game field, then a three-up grid
// of game cards. Shell comes from app/layout.tsx.
//
// Reads the real games and assignments now, and the + on each card opens a
// roster where a member can be toggled on or off the game.

// Entries in game_category that are not games (they exist for the guides
// categories) and should not appear in the specialists list. Same exclusion the
// live page makes.
const EXCLUDED_CATEGORIES = new Set(["customer info - all server types"]);

export default async function SpecialistsPage() {
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
        image: userTable.image,
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
  // the mathematical alphanumeric block. Avatar draws the picture where there is
  // one and derives the fallback hue from the name, so it stays stable as the
  // roster changes.
  const members: Member[] = memberRows.map((m) => {
    const name = plainName(m.name || m.email || "Member");
    return {
      id: m.id,
      name,
      image: m.image ?? null,
    };
  });

  return (
    <div className="p-[32px]">
      <SpecialistsBoard games={games} members={members} isAdmin={isAdmin} />
    </div>
  );
}
