import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Calendar, User, Pencil, Trash2, Gamepad2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { guide } from "@/db/app-schema";
import { deleteGuide } from "../actions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: Date | string) {
  const x = new Date(d);
  return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
}

export default async function GuidePostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rows = await db.select().from(guide).where(eq(guide.slug, slug)).limit(1);
  const post = rows[0];

  if (!post) {
    notFound();
  }

  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <Link
          href="/guides"
          className="flex h-9 items-center gap-2 border border-border bg-surface-2 px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back to guides
        </Link>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/guides/${post.slug}/edit`}
              className="flex h-9 items-center gap-2 border border-border bg-surface-2 px-3 text-sm text-muted transition-colors hover:text-foreground"
            >
              <Pencil size={15} strokeWidth={1.75} />
              Edit
            </Link>
            <form action={deleteGuide}>
              <input type="hidden" name="id" value={post.id} />
              <button
                type="submit"
                className="flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
              >
                <Trash2 size={15} strokeWidth={1.75} />
                Delete
              </button>
            </form>
          </div>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <article className="fx-rise mx-auto w-full max-w-3xl">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/guides?game=${encodeURIComponent(post.game)}`}
              className="flex items-center gap-1 border border-border px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-surface-2"
            >
              <Gamepad2 size={12} strokeWidth={1.75} />
              {post.game}
            </Link>
            {post.tags.map((t) => (
              <span
                key={t}
                className="border border-border px-2 py-0.5 text-[11px] text-muted"
              >
                {t}
              </span>
            ))}
          </div>
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
