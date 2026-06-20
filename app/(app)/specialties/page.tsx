import { asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import { gameCategory, memberGame } from "@/db/app-schema";
import SpecialtiesBoard from "./specialties-board";

// Entries in game_category that are not games (used by the guides categories,
// not specializations) and should not appear in the specialists list.
const EXCLUDED_CATEGORIES = new Set(["customer info - all server types"]);

export default async function SpecialtiesPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const [gameRows, members, assignments] = await Promise.all([
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

  // Attach each game's assigned member ids.
  const idsByGame = new Map<string, string[]>(gameRows.map((g) => [g.id, []]));
  for (const a of assignments) idsByGame.get(a.gameId)?.push(a.userId);

  const games = gameRows
    .filter((g) => !EXCLUDED_CATEGORIES.has(g.name.trim().toLowerCase()))
    .map((g) => ({
      id: g.id,
      name: g.name,
      memberIds: idsByGame.get(g.id) ?? [],
    }));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Specialists</h1>
          <p className="text-xs text-muted">
            Who to reach out to for each game
            {isAdmin ? " - use + to assign a member" : ""}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto w-full max-w-4xl">
          <SpecialtiesBoard
            isAdmin={isAdmin}
            games={games}
            members={members.map((m) => ({
              id: m.id,
              name: m.name || m.email,
              image: m.image,
            }))}
          />
        </div>
      </main>
    </>
  );
}
