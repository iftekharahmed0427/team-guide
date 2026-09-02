import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPost } from "@/db/app-schema";
import { longDate, shortDate, type Post } from "../post-shape";

// news_post reads for the v2 canvas. Same table and ordering as the live /news
// page; only the rendering differs.

type Row = typeof newsPost.$inferSelect;

function toPost(row: Row): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    html: row.content || null,
    // news_post has no category column, so the first tag stands in for the pill.
    category: row.tags[0] ?? null,
    tags: row.tags,
    author: row.authorName || "Member",
    date: shortDate(row.createdAt),
    dateLong: longDate(row.createdAt),
    updatedLong: longDate(row.updatedAt),
  };
}

export async function listPosts(): Promise<Post[]> {
  const rows = await db.select().from(newsPost).orderBy(desc(newsPost.createdAt));
  return rows.map(toPost);
}

export async function getPost(slug: string): Promise<Post | null> {
  const rows = await db.select().from(newsPost).where(eq(newsPost.slug, slug)).limit(1);
  return rows[0] ? toPost(rows[0]) : null;
}

// Distinct tags across all posts, which is the closest thing news has to a
// category catalogue: the table stores no categories, only free-form tags.
export async function listNewsCategories(): Promise<string[]> {
  const rows = await db.select({ tags: newsPost.tags }).from(newsPost);
  return Array.from(new Set(rows.flatMap((r) => r.tags))).sort((a, b) => a.localeCompare(b));
}
