import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ArrowLeft, Calendar, User, Trash2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { newsPost } from "@/db/app-schema";
import { deletePost } from "../actions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: Date | string) {
  const x = new Date(d);
  return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rows = await db.select().from(newsPost).where(eq(newsPost.slug, slug)).limit(1);
  const post = rows[0];

  if (!post) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = session?.user.role === "admin";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <Link
          href="/news"
          className="flex h-9 items-center gap-2 border border-border bg-surface-2 px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back to news
        </Link>
        {isAdmin ? (
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <button
              type="submit"
              className="flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
            >
              <Trash2 size={15} strokeWidth={1.75} />
              Delete
            </button>
          </form>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <article className="fx-rise mx-auto w-full max-w-3xl">
          {post.tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <Link
                  key={t}
                  href={`/news?tag=${encodeURIComponent(t)}`}
                  className="border border-border px-2 py-0.5 text-[11px] text-muted transition-colors hover:text-foreground"
                >
                  {t}
                </Link>
              ))}
            </div>
          ) : null}
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {post.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Calendar size={13} strokeWidth={1.75} />
              {formatDate(post.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <User size={13} strokeWidth={1.75} />
              {post.authorName || "Member"}
            </span>
          </div>
          <div
            className="rich-text mt-6"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </main>
    </>
  );
}
