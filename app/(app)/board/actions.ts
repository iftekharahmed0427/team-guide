"use server";

import { revalidatePath } from "next/cache";
import { eq, asc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { boardTask } from "@/db/app-schema";
import { isStatus, type Task } from "./columns";

// The board is shared, so any signed-in member can edit it.
async function requireMember() {
  const session = await getSession();
  if (!session) throw new Error("Not authorized");
  return session;
}

// Broadcast a board change to every connected client via Postgres NOTIFY.
// (LISTEN side lives in lib/board-events.ts → the SSE route.)
async function notifyBoard() {
  try {
    await db.execute(sql`select pg_notify('board_task', '')`);
  } catch {
    // realtime is best-effort; the write already succeeded
  }
}

export async function listTasks(): Promise<Task[]> {
  await requireMember();
  const rows = await db.select().from(boardTask).orderBy(asc(boardTask.position));
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    note: t.note,
    status: t.status,
    position: t.position,
  }));
}

// The client generates the id so it can render the card optimistically and then
// move/delete it by the same id before the round-trip finishes.
export async function createTask(input: {
  id: string;
  title: string;
  status: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await requireMember();
  } catch {
    return { error: "You do not have permission to edit the board." };
  }
  const title = input.title.trim().slice(0, 200);
  if (!input.id || !title) return { error: "A title is required." };
  const status = isStatus(input.status) ? input.status : "todo";

  await db.insert(boardTask).values({
    id: input.id,
    title,
    status,
    position: Date.now(),
  });
  revalidatePath("/board");
  await notifyBoard();
  return { ok: true };
}

export async function moveTask(input: {
  id: string;
  status: string;
  position: number;
}): Promise<void> {
  await requireMember();
  if (!input.id) return;
  const status = isStatus(input.status) ? input.status : "todo";

  await db
    .update(boardTask)
    .set({ status, position: input.position })
    .where(eq(boardTask.id, input.id));
  revalidatePath("/board");
  await notifyBoard();
}

export async function deleteTask(id: string): Promise<void> {
  await requireMember();
  if (!id) return;
  await db.delete(boardTask).where(eq(boardTask.id, id));
  revalidatePath("/board");
  await notifyBoard();
}
