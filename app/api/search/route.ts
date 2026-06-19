import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { newsPost, guide } from "@/db/app-schema";

export const dynamic = "force-dynamic";

// Strip HTML tags + collapse whitespace, then truncate — a small body snippet so
// search can match words from the article without shipping the whole post.
function plain(html: string, max = 400): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export type SearchItem = {
  type: "news" | "guide";
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  game?: string;
  snippet: string;
};

// The full news + guides index for the client-side search palette (Fuse.js does
// the realtime matching). Lightweight: title/excerpt/tags/game + a body snippet,
// not the full HTML. Signed-in members only (the whole app is gated anyway).
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const [news, guides] = await Promise.all([
    db
      .select({
        slug: newsPost.slug,
        title: newsPost.title,
        excerpt: newsPost.excerpt,
        tags: newsPost.tags,
        content: newsPost.content,
      })
      .from(newsPost)
      .orderBy(desc(newsPost.createdAt)),
    db
      .select({
        slug: guide.slug,
        title: guide.title,
        excerpt: guide.excerpt,
        tags: guide.tags,
        game: guide.game,
        content: guide.content,
      })
      .from(guide)
      .orderBy(desc(guide.createdAt)),
  ]);

  const items: SearchItem[] = [
    ...news.map((n) => ({
      type: "news" as const,
      slug: n.slug,
      title: n.title,
      excerpt: n.excerpt,
      tags: n.tags ?? [],
      snippet: plain(n.content ?? ""),
    })),
    ...guides.map((g) => ({
      type: "guide" as const,
      slug: g.slug,
      title: g.title,
      excerpt: g.excerpt,
      tags: g.tags ?? [],
      game: g.game,
      snippet: plain(g.content ?? ""),
    })),
  ];

  return Response.json({ items });
}
