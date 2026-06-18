import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus, Calendar, User, ChevronRight, X, Gamepad2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { guide } from "@/db/app-schema";
import { getGames } from "./games";

type Guide = typeof guide.$inferSelect;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: Date | string) {
  const x = new Date(d);
  return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
}

function Meta({ post }: { post: Guide }) {
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

function GuideCard({ post }: { post: Guide }) {
  return (
    <Link
      href={`/guides/${post.slug}`}
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

function GameSection({ game, guides }: { game: string; guides: Guide[] }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Gamepad2 size={16} strokeWidth={1.75} className="text-muted" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{game}</h2>
        <span className="text-xs text-muted">
          {guides.length} guide{guides.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {guides.map((g) => (
          <GuideCard key={g.id} post={g} />
        ))}
      </div>
    </section>
  );
}

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game } = await searchParams;
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const guides = await db.select().from(guide).orderBy(desc(guide.createdAt));
  const games = await getGames();
  const activeGame = game && games.includes(game) ? game : null;

  // Games that actually have guides, kept in the managed list's order.
  const gamesWithGuides = games.filter((g) => guides.some((x) => x.game === g));
  const visible = activeGame ? guides.filter((g) => g.game === activeGame) : guides;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Guides</h1>
          <p className="text-xs text-muted">
            {guides.length} guide{guides.length === 1 ? "" : "s"} · how-tos by game
          </p>
        </div>
        {isAdmin ? (
          <Link
            href="/guides/new"
            className="btn-wipe btn-wipe-dark flex h-9 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background"
          >
            <Plus size={16} strokeWidth={2} />
            New guide
          </Link>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto w-full max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="flex flex-col gap-6">
              {activeGame ? (
                <div className="flex items-center justify-between border border-border bg-surface px-4 py-2.5 text-sm">
                  <span className="text-muted">
                    Showing guides for: <span className="text-foreground">{activeGame}</span>
                  </span>
                  <Link
                    href="/guides"
                    className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
                  >
                    <X size={13} strokeWidth={2} />
                    Clear
                  </Link>
                </div>
              ) : null}

              {guides.length === 0 ? (
                <div className="border border-border bg-surface p-10 text-center">
                  <p className="text-sm text-muted">No guides yet.</p>
                  {isAdmin ? (
                    <Link
                      href="/guides/new"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground"
                    >
                      Write the first guide
                      <ChevronRight size={15} strokeWidth={1.75} />
                    </Link>
                  ) : null}
                </div>
              ) : activeGame ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {visible.map((g) => (
                    <GuideCard key={g.id} post={g} />
                  ))}
                </div>
              ) : (
                gamesWithGuides.map((g) => (
                  <GameSection
                    key={g}
                    game={g}
                    guides={guides.filter((x) => x.game === g)}
                  />
                ))
              )}
            </div>

            <aside className="flex flex-col gap-4">
              <div className="border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                    Browse by game
                  </h2>
                </div>
                <div className="flex flex-col p-2">
                  <Link
                    href="/guides"
                    className={`border-l-2 px-3 py-2 text-sm transition-colors ${
                      !activeGame
                        ? "border-foreground bg-surface-2 text-foreground"
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    All guides
                  </Link>
                  {gamesWithGuides.map((g) => (
                    <Link
                      key={g}
                      href={`/guides?game=${encodeURIComponent(g)}`}
                      className={`flex items-center justify-between border-l-2 px-3 py-2 text-sm transition-colors ${
                        activeGame === g
                          ? "border-foreground bg-surface-2 text-foreground"
                          : "border-transparent text-muted hover:text-foreground"
                      }`}
                    >
                      {g}
                      <span className="text-xs text-muted">
                        {guides.filter((x) => x.game === g).length}
                      </span>
                    </Link>
                  ))}
                  {gamesWithGuides.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted">No games yet.</p>
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
