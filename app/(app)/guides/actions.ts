"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { guide, gameCategory } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { getGames } from "./games";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Not authorized");
  }
  return session;
}

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base || "guide";
}

type CreateInput = {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  game: string;
};

export async function createGuide(
  input: CreateInput,
): Promise<{ slug: string } | { error: string }> {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return { error: "You do not have permission to create guides." };
  }

  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  const games = await getGames();
  if (!games.includes(input.game)) return { error: "Pick a game for this guide." };
  if (!input.content || input.content === "<p></p>") {
    return { error: "Content is required." };
  }

  const tags = Array.from(
    new Set(input.tags.map((t) => t.trim()).filter(Boolean)),
  ).slice(0, 8);

  const base = slugify(title);
  let slug = base;
  for (let i = 0; i < 50; i++) {
    const existing = await db
      .select({ id: guide.id })
      .from(guide)
      .where(eq(guide.slug, slug))
      .limit(1);
    if (existing.length === 0) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  await db.insert(guide).values({
    id: randomUUID(),
    slug,
    title,
    game: input.game,
    excerpt: input.excerpt.trim().slice(0, 200),
    content: input.content,
    tags,
    authorId: session.user.id,
    authorName: session.user.name || session.user.email || "Member",
  });

  revalidatePath("/guides");
  await notifyChange();
  return { slug };
}

// Add a new game to the admin-managed list (from the guide editor).
export async function addGame(
  name: string,
): Promise<{ ok: true; name: string } | { error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Only admins can add games." };
  }
  const trimmed = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!trimmed) return { error: "Enter a game name." };

  const games = await getGames(); // seeds defaults + returns current names
  if (games.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
    return { error: "That game is already in the list." };
  }

  await db
    .insert(gameCategory)
    .values({ id: randomUUID(), name: trimmed, position: games.length })
    .onConflictDoNothing();
  revalidatePath("/guides");
  revalidatePath("/guides/new");
  await notifyChange();
  return { ok: true, name: trimmed };
}

export async function deleteGuide(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing guide");
  await db.delete(guide).where(eq(guide.id, id));
  revalidatePath("/guides");
  await notifyChange();
  redirect("/guides");
}
