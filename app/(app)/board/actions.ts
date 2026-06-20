"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq, and, asc, count } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { boardTask, boardTaskComment, boardTaskAssignee } from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { isStatus, displayName, type Task, type Comment } from "./columns";

// The board is shared, so any signed-in member can edit it.
async function requireMember() {
  const session = await getSession();
  if (!session) throw new Error("Not authorized");
  return session;
}

// Assigning members is admin-only.
async function requireAdmin() {
  const session = await requireMember();
  if (session.user.role !== "admin") throw new Error("Admins only");
  return session;
}

export async function listTasks(): Promise<Task[]> {
  await requireMember();
  const rows = await db.select().from(boardTask).orderBy(asc(boardTask.position));

  // Assignees (with live display name) and comment counts, grouped by task.
  const assigneeRows = await db
    .select({
      taskId: boardTaskAssignee.taskId,
      userId: boardTaskAssignee.userId,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(boardTaskAssignee)
    .innerJoin(user, eq(boardTaskAssignee.userId, user.id))
    .orderBy(asc(boardTaskAssignee.createdAt));

  const countRows = await db
    .select({ taskId: boardTaskComment.taskId, n: count() })
    .from(boardTaskComment)
    .groupBy(boardTaskComment.taskId);

  const assigneesByTask = new Map<
    string,
    { id: string; name: string; image: string | null }[]
  >();
  for (const a of assigneeRows) {
    const list = assigneesByTask.get(a.taskId) ?? [];
    list.push({ id: a.userId, name: displayName(a.name, a.email), image: a.image });
    assigneesByTask.set(a.taskId, list);
  }
  const countByTask = new Map<string, number>();
  for (const c of countRows) countByTask.set(c.taskId, Number(c.n));

  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    note: t.note,
    status: t.status,
    position: t.position,
    assignees: assigneesByTask.get(t.id) ?? [],
    commentCount: countByTask.get(t.id) ?? 0,
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
  await logActivity("board.task_created", title);
  revalidatePath("/board");
  await notifyChange();
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
  await logActivity("board.task_moved");
  revalidatePath("/board");
  await notifyChange();
}

export async function deleteTask(id: string): Promise<void> {
  await requireMember();
  if (!id) return;
  const t = (await db.select({ title: boardTask.title }).from(boardTask).where(eq(boardTask.id, id)).limit(1))[0];
  // FK cascade removes the card's comments and assignees.
  await db.delete(boardTask).where(eq(boardTask.id, id));
  await logActivity("board.task_deleted", t?.title ?? "");
  revalidatePath("/board");
  await notifyChange();
}

// ── Comments ────────────────────────────────────────────────────────────────

export async function listComments(taskId: string): Promise<Comment[]> {
  await requireMember();
  if (!taskId) return [];
  const rows = await db
    .select({
      id: boardTaskComment.id,
      taskId: boardTaskComment.taskId,
      body: boardTaskComment.body,
      authorId: boardTaskComment.authorId,
      authorName: boardTaskComment.authorName,
      authorImage: user.image,
      createdAt: boardTaskComment.createdAt,
    })
    .from(boardTaskComment)
    .leftJoin(user, eq(boardTaskComment.authorId, user.id))
    .where(eq(boardTaskComment.taskId, taskId))
    .orderBy(asc(boardTaskComment.createdAt));
  return rows.map((c) => ({
    id: c.id,
    taskId: c.taskId,
    body: c.body,
    authorId: c.authorId,
    authorName: c.authorName,
    authorImage: c.authorImage,
    createdAt: c.createdAt.toISOString(),
  }));
}

// The client generates the id so it can render the comment optimistically.
export async function addComment(input: {
  id: string;
  taskId: string;
  body: string;
}): Promise<{ ok: true } | { error: string }> {
  let session;
  try {
    session = await requireMember();
  } catch {
    return { error: "You must be signed in to comment." };
  }
  const body = input.body.trim().slice(0, 2000);
  if (!input.id || !input.taskId || !body) return { error: "Write something first." };

  await db.insert(boardTaskComment).values({
    id: input.id,
    taskId: input.taskId,
    body,
    authorId: session.user.id,
    authorName: displayName(session.user.name, session.user.email),
  });
  await logActivity("board.comment_added");
  revalidatePath("/board");
  await notifyChange();
  return { ok: true };
}

export async function deleteComment(id: string): Promise<void> {
  const session = await requireMember();
  if (!id) return;
  const rows = await db
    .select({ authorId: boardTaskComment.authorId })
    .from(boardTaskComment)
    .where(eq(boardTaskComment.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return;

  const isOwner = row.authorId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new Error("You can only delete your own comments.");
  }
  await db.delete(boardTaskComment).where(eq(boardTaskComment.id, id));
  await logActivity("board.comment_deleted");
  revalidatePath("/board");
  await notifyChange();
}

// ── Assignment (admin only) ──────────────────────────────────────────────────

export async function assignMember(input: {
  taskId: string;
  userId: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can assign members." };
  }
  if (!input.taskId || !input.userId) return { error: "Missing task or member." };

  await db
    .insert(boardTaskAssignee)
    .values({ id: randomUUID(), taskId: input.taskId, userId: input.userId })
    .onConflictDoNothing();
  await logActivity("board.member_assigned");
  revalidatePath("/board");
  await notifyChange();
  return { ok: true };
}

export async function unassignMember(input: {
  taskId: string;
  userId: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can assign members." };
  }
  if (!input.taskId || !input.userId) return { error: "Missing task or member." };

  await db
    .delete(boardTaskAssignee)
    .where(
      and(
        eq(boardTaskAssignee.taskId, input.taskId),
        eq(boardTaskAssignee.userId, input.userId),
      ),
    );
  await logActivity("board.member_unassigned");
  revalidatePath("/board");
  await notifyChange();
  return { ok: true };
}
