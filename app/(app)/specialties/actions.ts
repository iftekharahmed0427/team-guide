"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { memberGame, gameCategory } from "@/db/app-schema";
import { user as userTable } from "@/db/auth-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const PAGE = "/specialties";

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
