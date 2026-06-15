import Link from "next/link";
import { headers } from "next/headers";
import { desc } from "drizzle-orm";
import { Plus, Calendar, User, ChevronRight, X } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { newsPost } from "@/db/app-schema";

type Post = typeof newsPost.$inferSelect;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: Date | string) {
  const x = new Date(d);
  return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
}

function Meta({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-1">
        <Calendar size={13} strokeWidth={1.75} />
        {formatDate(post.createdAt)}
      </span>
      <span className="flex items-center gap-1">
        <User size={13} strokeWidth={1.75} />
        {post.authorName || "Member"}
      </span>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className="border border-border px-2 py-0.5 text-[11px] text-muted">
          {t}
        </span>
      ))}
    </div>
  );
}

function FeaturedCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="btn-wipe group block border border-border bg-surface p-6"
    >
      <Meta post={post} />
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {post.title}
      </h2>
      {post.excerpt ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{post.excerpt}</p>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-4">
        <TagList tags={post.tags} />
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground">
          Read more
          <ChevronRight size={16} strokeWidth={1.75} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="btn-wipe group flex flex-col border border-border bg-surface p-5"
    >
      <Meta post={post} />
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
        {post.title}
      </h3>
      {post.excerpt ? (
        <p className="mt-2 flex-1 text-sm leading-6 text-muted line-clamp-3">{post.excerpt}</p>
      ) : (
        <div className="flex-1" />
      )}
      <div className="mt-4">
        <TagList tags={post.tags} />
      </div>
    </Link>
  );
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = session?.user.role === "admin";

  const posts = await db.select().from(newsPost).orderBy(desc(newsPost.createdAt));
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort((a, b) =>
    a.localeCompare(b),
  );
  const activeTag = tag && allTags.includes(tag) ? tag : null;
  const filtered = activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts;
  const [featured, ...rest] = filtered;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">News</h1>
          <p className="text-xs text-muted">
            {posts.length} post{posts.length === 1 ? "" : "s"} · announcements and updates
          </p>
        </div>
        {isAdmin ? (
          <Link
            href="/news/new"
            className="btn-wipe btn-wipe-dark flex h-9 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background"
          >
            <Plus size={16} strokeWidth={2} />
            New post
          </Link>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto w-full max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="flex flex-col gap-4">
              {activeTag ? (
                <div className="flex items-center justify-between border border-border bg-surface px-4 py-2.5 text-sm">
                  <span className="text-muted">
                    Filtered by tag: <span className="text-foreground">{activeTag}</span>
                  </span>
                  <Link
                    href="/news"
                    className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
                  >
                    <X size={13} strokeWidth={2} />
                    Clear
                  </Link>
                </div>
              ) : null}

              {filtered.length === 0 ? (
                <div className="border border-border bg-surface p-10 text-center">
                  <p className="text-sm text-muted">
                    {activeTag ? "No posts with this tag yet." : "No posts yet."}
                  </p>
                  {isAdmin ? (
                    <Link
                      href="/news/new"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground"
                    >
                      Write the first post
                      <ChevronRight size={15} strokeWidth={1.75} />
                    </Link>
                  ) : null}
                </div>
              ) : (
                <>
                  {featured ? <FeaturedCard post={featured} /> : null}
                  {rest.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {rest.map((p) => (
                        <PostCard key={p.id} post={p} />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <aside className="flex flex-col gap-4">
              <div className="border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                    Browse by tag
                  </h2>
                </div>
                <div className="flex flex-col p-2">
                  <Link
                    href="/news"
                    className={`border-l-2 px-3 py-2 text-sm transition-colors ${
                      !activeTag
                        ? "border-foreground bg-surface-2 text-foreground"
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    All posts
                  </Link>
                  {allTags.map((t) => (
                    <Link
                      key={t}
                      href={`/news?tag=${encodeURIComponent(t)}`}
                      className={`border-l-2 px-3 py-2 text-sm transition-colors ${
                        activeTag === t
                          ? "border-foreground bg-surface-2 text-foreground"
                          : "border-transparent text-muted hover:text-foreground"
                      }`}
                    >
                      {t}
                    </Link>
                  ))}
                  {allTags.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted">No tags yet.</p>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
