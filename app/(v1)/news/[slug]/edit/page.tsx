import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { newsPost } from "@/db/app-schema";
import NewsEditor from "../../news-editor";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role !== "admin") redirect("/news");

  const { slug } = await params;
  const rows = await db.select().from(newsPost).where(eq(newsPost.slug, slug)).limit(1);
  const post = rows[0];
  if (!post) notFound();

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
        <Link
          href={`/news/${post.slug}`}
          className="flex h-9 items-center gap-2 border border-border bg-surface-2 px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back to post
        </Link>
        <div>
          <h1 className="text-base font-semibold tracking-tight">Edit post</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto w-full max-w-3xl">
          <NewsEditor
            initial={{
              id: post.id,
              title: post.title,
              content: post.content,
              tags: post.tags,
            }}
          />
        </div>
      </main>
    </>
  );
}
