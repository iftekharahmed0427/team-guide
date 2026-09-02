import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Folder, User } from "lucide-react";
import PostActions from "./post-actions";
import type { PostKind } from "./post-editor";
import { CARD, pillFor, type Post } from "./post-shape";

// The v2 detail layout, built from the "news-article-detail" Figma frame
// (node 25:200): the post card on the left with an info / related / tags rail
// on the right. News and Guides both render it.
//
// The body is the editor's stored HTML, injected the same way the live
// /news/[slug] page does it: the editor is admin-only, so the markup is trusted
// and goes in unsanitised. Only the stylesheet differs - .v2-rich-text carries
// the redesign's palette instead of the app-wide one.
//
// Edit and Delete are admin-only and live in post-actions.tsx, which needs to be
// a client component for the confirmation; everything else here stays server
// rendered.

type Props = {
  /** Which table the post came from, so the actions know what to call. */
  kind: PostKind;
  post: Post;
  /** Admins get Edit and Delete; everyone else just reads. */
  isAdmin: boolean;
  /** Everything in the same section, used to fill the related list. */
  pool: Post[];
  /** Route the back link and related rows point at, e.g. "/news". */
  basePath: string;
  copy: { back: string; info: string; related: string };
};

// The frame's related list is placeholder rows, so it is filled from the real
// posts instead: same category first, then a shared tag, then whatever is left,
// capped at three. Guides sort by game this way, news by its primary tag.
function relatedTo(post: Post, pool: Post[]): Post[] {
  const score = (p: Post) =>
    (p.category && p.category === post.category ? 2 : 0) +
    (p.tags.some((t) => post.tags.includes(t)) ? 1 : 0);
  return (
    pool
      .filter((p) => p.slug !== post.slug)
      .map((p, i) => ({ p, i, score: score(p) }))
      // Stable: equal scores keep the pool's newest-first order.
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, 3)
      .map((x) => x.p)
  );
}

export default function PostDetail({
  kind,
  post,
  isAdmin,
  pool,
  basePath,
  copy,
}: Props) {
  const related = relatedTo(post, pool);
  const pill = post.category;

  return (
    <div className="flex flex-col gap-[32px] p-[32px]">
      <div className="flex items-center justify-between">
        <Link
          href={basePath}
          className="flex shrink-0 items-center gap-[8px] rounded-[8px] px-[14px] py-[8px] text-[14px] font-semibold text-[#94a3b8] transition-colors hover:bg-[#171e24] hover:text-[#e2e8f0]"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          {copy.back}
        </Link>
        {isAdmin ? (
          <PostActions
            kind={kind}
            id={post.id}
            title={post.title}
            slug={post.slug}
            basePath={basePath}
          />
        ) : null}
      </div>

      <div className="flex items-start gap-[24px]">
        <article className="flex min-w-0 flex-1 flex-col gap-[24px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[40px]">
          <div className="flex flex-col gap-[16px]">
            {pill ? (
              <span
                className={`w-fit shrink-0 rounded-full px-[10px] py-[4px] text-[12px] font-bold ${pillFor(pill)}`}
              >
                {pill}
              </span>
            ) : null}
            <h1 className="text-[24px] leading-[32px] font-bold text-[#e2e8f0]">
              {post.title}
            </h1>
            <div className="flex items-center gap-[16px]">
              <span className="flex items-center gap-[6px]">
                <Calendar
                  size={14}
                  strokeWidth={2}
                  className="text-[#94a3b8]"
                />
                <span className="text-[13px] font-normal text-[#94a3b8]">
                  {post.dateLong}
                </span>
              </span>
              <span className="text-[13px] font-normal text-[#64748b]">•</span>
              <span className="flex items-center gap-[6px]">
                <User size={14} strokeWidth={2} className="text-[#94a3b8]" />
                <span className="text-[13px] font-normal text-[#94a3b8]">
                  {post.author}
                </span>
              </span>
            </div>
          </div>

          <div className="h-px w-full bg-[#243033]" />

          {post.html ? (
            <div
              className="v2-rich-text"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />
          ) : (
            <p className="text-[14px] leading-[1.6] font-normal text-[#94a3b8]">
              This post has no body yet.
            </p>
          )}
        </article>

        <div className="flex w-[360px] shrink-0 flex-col gap-[16px]">
          <div className={`flex flex-col gap-[12px] ${CARD}`}>
            <p className="text-[14px] font-bold text-[#e2e8f0]">{copy.info}</p>
            <div className="flex items-center gap-[12px]">
              <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[#243033] text-[14px] font-bold text-[#e2e8f0]">
                {post.author.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="truncate text-[14px] font-semibold text-[#e2e8f0]">
                  {post.author}
                </span>
                <span className="text-[12px] font-normal text-[#94a3b8]">
                  Author
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-[10px]">
              <div className="flex items-center gap-[10px]">
                <Calendar
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-[#94a3b8]"
                />
                <p className="min-w-0 flex-1 text-[13px] font-normal text-[#94a3b8]">
                  Published: {post.dateLong}
                </p>
              </div>
              <div className="flex items-center gap-[10px]">
                <Folder
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-[#94a3b8]"
                />
                <p className="min-w-0 flex-1 text-[13px] font-normal text-[#94a3b8]">
                  Category: {pill ?? "None"}
                </p>
              </div>
              <div className="flex items-center gap-[10px]">
                <Clock
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-[#94a3b8]"
                />
                <p className="min-w-0 flex-1 text-[13px] font-normal text-[#94a3b8]">
                  Last updated: {post.updatedLong}
                </p>
              </div>
            </div>
          </div>

          <div className={`flex flex-col gap-[12px] ${CARD}`}>
            <p className="text-[14px] font-bold text-[#e2e8f0]">
              {copy.related}
            </p>
            {related.length === 0 ? (
              <p className="text-[13px] font-normal text-[#64748b]">
                Nothing else here yet
              </p>
            ) : (
              <div className="flex flex-col gap-[12px]">
                {related.map((r, i) => {
                  const rPill = r.category;
                  return (
                    <div key={r.slug} className="flex flex-col gap-[12px]">
                      <Link
                        href={`${basePath}/${r.slug}`}
                        className="flex flex-col gap-[6px]"
                      >
                        <span className="flex items-start gap-[8px]">
                          {rPill ? (
                            <span
                              className={`shrink-0 rounded-full px-[10px] py-[4px] text-[12px] font-bold ${pillFor(rPill)}`}
                            >
                              {rPill}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 text-[14px] font-semibold text-[#e2e8f0]">
                            {r.title}
                          </span>
                        </span>
                        <span className="text-[12px] font-normal text-[#94a3b8]">
                          {r.dateLong}
                        </span>
                      </Link>
                      {i < related.length - 1 ? (
                        <div className="h-px w-full bg-[#243033]" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`flex flex-col gap-[12px] ${CARD}`}>
            <p className="text-[14px] font-bold text-[#e2e8f0]">Tags</p>
            {post.tags.length === 0 ? (
              <p className="text-[13px] font-normal text-[#64748b]">Untagged</p>
            ) : (
              <div className="flex flex-wrap content-start items-start gap-[8px]">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[#8fb0a7]/[0.12] px-[10px] py-[4px] text-[12px] font-bold text-[#8fb0a7]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
