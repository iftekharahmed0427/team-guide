"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { note } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { MAX_NOTE_BODY, MAX_NOTE_TITLE } from "@/lib/note-constants";

// Notes are the team's shared scratchpad and its documentation shelf at once, so
// every member can post, edit their own, and read everything. Only pinning is
// admin-only: a pin decides what the whole team sees first.

export type NoteResult = { ok: true } | { error: string };

async function requireMember() {
  const session = await getSession();
  if (!session) throw new Error("Not authorized");
  return session;
}

/** The author or an admin. Anyone else cannot touch the note. */
async function requireCanEdit(id: string) {
  const session = await requireMember();
  const rows = await db
    .select({ authorId: note.authorId })
    .from(note)
    .where(eq(note.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("That note no longer exists.");

  const isOwner = row.authorId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) throw new Error("That is not your note.");
  return session;
}

// Every write touches both the v2 page and the v1 one it replaces, plus the
// dashboard, which counts notes.
function revalidateNotes() {
  revalidatePath("/v2/notes");
  revalidatePath("/v2");
  revalidatePath("/notes");
  revalidatePath("/");
}

export async function createNote(input: {
  title?: string;
  body: string;
}): Promise<NoteResult> {
  let session;
  try {
    session = await requireMember();
  } catch {
    return { error: "You must be signed in to post a note." };
  }

  const body = input.body.trim().slice(0, MAX_NOTE_BODY);
  const title = (input.title ?? "").trim().slice(0, MAX_NOTE_TITLE);
  if (!body) return { error: "Write something first." };

  await db.insert(note).values({
    id: randomUUID(),
    title,
    body,
    authorId: session.user.id,
    authorName: session.user.name || session.user.email || "Member",
  });
  await logActivity("note.created", (title || body).slice(0, 60));
  await notifyChange();
  revalidateNotes();
  return { ok: true };
}

export async function updateNote(input: {
  id: string;
  title?: string;
  body: string;
}): Promise<NoteResult> {
  try {
    await requireCanEdit(input.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not authorized." };
  }

  const body = input.body.trim().slice(0, MAX_NOTE_BODY);
  const title = (input.title ?? "").trim().slice(0, MAX_NOTE_TITLE);
  if (!body) return { error: "A note cannot be empty." };

  await db
    .update(note)
    .set({ title, body, updatedAt: new Date() })
    .where(eq(note.id, input.id));
  await logActivity("note.updated", (title || body).slice(0, 60));
  await notifyChange();
  revalidateNotes();
  return { ok: true };
}

/** Pinning decides what the whole team reads first, so admins only. */
export async function setNotePinned(
  id: string,
  pinned: boolean,
): Promise<NoteResult> {
  const session = await getSession();
  if (session?.user.role !== "admin") {
    return { error: "Only an admin can pin a note." };
  }

  const rows = await db
    .select({ title: note.title, body: note.body })
    .from(note)
    .where(eq(note.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "That note no longer exists." };

  await db.update(note).set({ pinned }).where(eq(note.id, id));
  await logActivity(
    pinned ? "note.pinned" : "note.unpinned",
    (row.title || row.body).slice(0, 60),
  );
  await notifyChange();
  revalidateNotes();
  return { ok: true };
}

export async function removeNote(id: string): Promise<NoteResult> {
  try {
    await requireCanEdit(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not authorized." };
  }

  await db.delete(note).where(eq(note.id, id));
  await logActivity("note.deleted");
  await notifyChange();
  revalidateNotes();
  return { ok: true };
}

/** The form-action shape the v1 page posts to. */
export async function deleteNote(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const res = await removeNote(id);
  if ("error" in res) throw new Error(res.error);
}
