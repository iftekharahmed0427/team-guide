"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { newsPost } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

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
  return base || "post";
}

type CreateInput = {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
};

export async function createPost(
  input: CreateInput,
): Promise<{ slug: string } | { error: string }> {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return { error: "You do not have permission to create posts." };
  }

  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
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
      .select({ id: newsPost.id })
      .from(newsPost)
      .where(eq(newsPost.slug, slug))
      .limit(1);
    if (existing.length === 0) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  await db.insert(newsPost).values({
    id: randomUUID(),
    slug,
    title,
    excerpt: input.excerpt.trim().slice(0, 200),
    content: input.content,
    tags,
    authorId: session.user.id,
    authorName: session.user.name || session.user.email || "Member",
  });

  await logActivity("news.created", title);
  revalidatePath("/news");
  await notifyChange();
  return { slug };
}

export async function updatePost(
  id: string,
  input: CreateInput,
): Promise<{ slug: string } | { error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "You do not have permission to edit posts." };
  }

  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  if (!input.content || input.content === "<p></p>") {
    return { error: "Content is required." };
  }

  const rows = await db
    .select({ slug: newsPost.slug })
    .from(newsPost)
    .where(eq(newsPost.id, id))
    .limit(1);
  const existing = rows[0];
  if (!existing) return { error: "Post not found." };

  const tags = Array.from(
    new Set(input.tags.map((t) => t.trim()).filter(Boolean)),
  ).slice(0, 8);

  // The slug stays fixed so existing links keep working.
  await db
    .update(newsPost)
    .set({
      title,
      excerpt: input.excerpt.trim().slice(0, 200),
      content: input.content,
      tags,
    })
    .where(eq(newsPost.id, id));

  await logActivity("news.updated", title);
  revalidatePath("/news");
  revalidatePath(`/news/${existing.slug}`);
  await notifyChange();
  return { slug: existing.slug };
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing post");
  const p = (await db.select({ title: newsPost.title }).from(newsPost).where(eq(newsPost.id, id)).limit(1))[0];
  await db.delete(newsPost).where(eq(newsPost.id, id));
  await logActivity("news.deleted", p?.title ?? "");
  revalidatePath("/news");
  await notifyChange();
  redirect("/news");
}
