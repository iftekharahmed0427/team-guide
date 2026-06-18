import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { guide } from "@/db/app-schema";
import GuidesEditor from "../../guides-editor";
import { getGames, gameOptions } from "../../games";

export default async function EditGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role !== "admin") redirect("/guides");

  const { slug } = await params;
  const rows = await db.select().from(guide).where(eq(guide.slug, slug)).limit(1);
  const post = rows[0];
  if (!post) notFound();

  const games = await getGames();
  // Keep the guide's current game selectable even if it was later removed.
  const options = games.includes(post.game) ? games : [post.game, ...games];

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
        <Link
          href={`/guides/${post.slug}`}
          className="flex h-9 items-center gap-2 border border-border bg-surface-2 px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back to guide
        </Link>
        <div>
          <h1 className="text-base font-semibold tracking-tight">Edit guide</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto w-full max-w-3xl">
          <GuidesEditor
            gameOptions={gameOptions(options)}
            initialGame={post.game}
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
