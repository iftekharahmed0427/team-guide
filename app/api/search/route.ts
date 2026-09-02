import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { newsPost, guide, note } from "@/db/app-schema";

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
  type: "news" | "guide" | "note";
  /** The slug to open, or the note id the notes page anchors by. */
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  game?: string;
  snippet: string;
};

// The label a search result needs. Most notes are titled; an untitled one is a
// quick note, so its opening line names it.
function noteLabel(title: string, body: string): string {
  if (title.trim()) return title;
  const first = body.split("\n").find((line) => line.trim()) ?? "Note";
  return first.length > 80 ? `${first.slice(0, 80).trim()}...` : first.trim();
}

// The full news + guides index for the client-side search palette (Fuse.js does
// the realtime matching). Lightweight: title/excerpt/tags/game + a body snippet,
// not the full HTML. Signed-in members only (the whole app is gated anyway).
//
// Notes join the index only for a caller that asks (`?include=notes`). The v1
// palette routes anything that is not news to /guides, so it must keep seeing
// the two types it knows about; the v2 palette opts in.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const wantNotes =
    new URL(request.url).searchParams.get("include") === "notes";

  const [news, guides, notes] = await Promise.all([
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
    wantNotes
      ? db
          .select({
            id: note.id,
            title: note.title,
            body: note.body,
            authorName: note.authorName,
            pinned: note.pinned,
          })
          .from(note)
          .orderBy(desc(note.pinned), desc(note.createdAt))
      : [],
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
    // A note is already plain text, so it needs no tag stripping - only the
    // same truncation, so one long runbook cannot dominate the payload.
    ...notes.map((n) => ({
      type: "note" as const,
      slug: n.id,
      title: noteLabel(n.title, n.body),
      excerpt: `Note by ${n.authorName || "a member"}`,
      tags: n.pinned ? ["pinned"] : [],
      snippet: n.body.replace(/\s+/g, " ").trim().slice(0, 400),
    })),
  ];

  return Response.json({ items });
}
