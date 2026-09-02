"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { note } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

async function requireMember() {
  const session = await getSession();
  if (!session) throw new Error("Not authorized");
  return session;
}

export async function createNote(
  body: string,
): Promise<{ ok: true } | { error: string }> {
  let session;
  try {
    session = await requireMember();
  } catch {
    return { error: "You must be signed in to post a note." };
  }
  const text = body.trim().slice(0, 2000);
  if (!text) return { error: "Write something first." };

  await db.insert(note).values({
    id: randomUUID(),
    body: text,
    authorId: session.user.id,
    authorName: session.user.name || session.user.email || "Member",
  });
  await logActivity("note.created", text.slice(0, 60));
  await notifyChange();
  revalidatePath("/notes");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteNote(formData: FormData) {
  const session = await requireMember();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const rows = await db
    .select({ authorId: note.authorId })
    .from(note)
    .where(eq(note.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return;

  const isOwner = row.authorId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new Error("You can only delete your own notes.");
  }

  await db.delete(note).where(eq(note.id, id));
  await logActivity("note.deleted");
  await notifyChange();
  revalidatePath("/notes");
  revalidatePath("/");
}
