"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { memberGame, gameCategory, guide } from "@/db/app-schema";
import { user as userTable } from "@/db/auth-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const PAGE = "/specialties";
// The games list is shared with the Guides tool, so game edits revalidate both.
const GUIDES_PAGE = "/guides";
const MAX_GAME_NAME = 60;

type Result = { ok: true } | { error: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Not authorized");
  return session;
}

// Look up the member + game names (also validates the pair exists) for the
// activity label, or null if either is gone.
async function pair(userId: string, gameId: string) {
  const member = (
    await db.select({ name: userTable.name, email: userTable.email })
      .from(userTable).where(eq(userTable.id, userId)).limit(1)
  )[0];
  const game = (
    await db.select({ name: gameCategory.name })
      .from(gameCategory).where(eq(gameCategory.id, gameId)).limit(1)
  )[0];
  if (!member || !game) return null;
  return { who: member.name || member.email || "a member", game: game.name };
}

// Admin assigns a member to a game (idempotent: the unique pair makes a repeat a
// no-op). Members assigned to a game are the people to reach out to for it.
export async function addSpecialty(userId: string, gameId: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can assign specialties." };
  }
  if (!userId || !gameId) return { error: "Missing member or game." };
  const p = await pair(userId, gameId);
  if (!p) return { error: "Member or game no longer exists." };

  await db
    .insert(memberGame)
    .values({ id: randomUUID(), userId, gameId })
    .onConflictDoNothing();

  await logActivity("specialty.added", `${p.who} - ${p.game}`);
  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true };
}

// Admin removes a member from a game.
export async function removeSpecialty(userId: string, gameId: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can change specialties." };
  }
  if (!userId || !gameId) return { error: "Missing member or game." };
  const p = await pair(userId, gameId);

  await db
    .delete(memberGame)
    .where(and(eq(memberGame.userId, userId), eq(memberGame.gameId, gameId)));

  await logActivity("specialty.removed", p ? `${p.who} - ${p.game}` : "");
  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true };
}

const cleanName = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, MAX_GAME_NAME);

// Admin adds a game to the shared games list (game_category). Names are unique
// (case-insensitive). The game then appears here and in the Guides picker.
export async function addGame(name: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can add games." };
  }
  const trimmed = cleanName(name);
  if (!trimmed) return { error: "Enter a game name." };

  const existing = await db.select({ name: gameCategory.name }).from(gameCategory);
  if (existing.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
    return { error: "That game is already in the list." };
  }

  await db
    .insert(gameCategory)
    .values({ id: randomUUID(), name: trimmed, position: existing.length })
    .onConflictDoNothing();

  await logActivity("specialty.game_added", trimmed);
  await notifyChange();
  revalidatePath(PAGE);
  revalidatePath(GUIDES_PAGE);
  return { ok: true };
}

// Admin renames a game. Guides reference games by name (no FK), so the rename is
// propagated to every guide tagged with the old name to keep them grouped. Member
// assignments reference the game by id, so they follow automatically.
export async function renameGame(gameId: string, name: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can rename games." };
  }
  if (!gameId) return { error: "Missing game." };
  const trimmed = cleanName(name);
  if (!trimmed) return { error: "Enter a game name." };

  const current = (
    await db.select({ name: gameCategory.name }).from(gameCategory).where(eq(gameCategory.id, gameId)).limit(1)
  )[0];
  if (!current) return { error: "That game no longer exists." };
  if (current.name === trimmed) return { ok: true };

  const others = await db.select({ id: gameCategory.id, name: gameCategory.name }).from(gameCategory);
  if (others.some((g) => g.id !== gameId && g.name.toLowerCase() === trimmed.toLowerCase())) {
    return { error: "Another game already has that name." };
  }

  await db.update(gameCategory).set({ name: trimmed }).where(eq(gameCategory.id, gameId));
  await db.update(guide).set({ game: trimmed }).where(eq(guide.game, current.name));

  await logActivity("specialty.game_renamed", `${current.name} -> ${trimmed}`);
  await notifyChange();
  revalidatePath(PAGE);
  revalidatePath(GUIDES_PAGE);
  return { ok: true };
}

// Admin deletes a game. Specialist assignments cascade away with it. Guides
// reference games by name (no FK), so deleting a game still used by guides would
// orphan them out of the Guides list - block it with a clear message instead.
export async function deleteGame(gameId: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can delete games." };
  }
  if (!gameId) return { error: "Missing game." };

  const current = (
    await db.select({ name: gameCategory.name }).from(gameCategory).where(eq(gameCategory.id, gameId)).limit(1)
  )[0];
  if (!current) return { ok: true }; // already gone

  const used =
    (await db.select({ n: count() }).from(guide).where(eq(guide.game, current.name)))[0]?.n ?? 0;
  if (used > 0) {
    return {
      error: `${used} guide${used === 1 ? "" : "s"} still use${used === 1 ? "s" : ""} "${current.name}". Reassign or delete them first.`,
    };
  }

  await db.delete(gameCategory).where(eq(gameCategory.id, gameId));

  await logActivity("specialty.game_deleted", current.name);
  await notifyChange();
  revalidatePath(PAGE);
  revalidatePath(GUIDES_PAGE);
  return { ok: true };
}
