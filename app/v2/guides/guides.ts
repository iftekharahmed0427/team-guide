import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameCategory, guide } from "@/db/app-schema";
import { longDate, shortDate, type Post } from "../post-shape";

// `guide` reads for the v2 canvas. Unlike news_post this table has a real
// category in `game`, which is what the frame's pill and filter rail were drawn
// for, so guides map onto the design more directly than news does.
//
// Ordered newest first to match /v2/news. The live /guides index instead groups
// into per-game sections; the frame draws a flat grid, so this keeps the grid.

type Row = typeof guide.$inferSelect;

function toPost(row: Row): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    html: row.content || null,
    category: row.game,
    tags: row.tags,
    author: row.authorName || "Member",
    date: shortDate(row.createdAt),
    dateLong: longDate(row.createdAt),
    updatedLong: longDate(row.updatedAt),
  };
}

export async function listGuides(): Promise<Post[]> {
  const rows = await db.select().from(guide).orderBy(desc(guide.createdAt));
  return rows.map(toPost);
}

export async function getGuide(slug: string): Promise<Post | null> {
  const rows = await db.select().from(guide).where(eq(guide.slug, slug)).limit(1);
  return rows[0] ? toPost(rows[0]) : null;
}

// The admin-managed game catalogue, in its configured order. This is a real
// category list, unlike news, and it is what the frame's Category card wants.
export async function listGuideCategories(): Promise<string[]> {
  const rows = await db
    .select({ name: gameCategory.name })
    .from(gameCategory)
    .orderBy(asc(gameCategory.position));
  return rows.map((r) => r.name);
}
