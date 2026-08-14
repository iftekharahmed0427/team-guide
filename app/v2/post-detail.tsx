import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Folder, Pencil, Trash2, User } from "lucide-react";
import { CATEGORY_PILL, type Article } from "./news-data";

// The v2 detail layout, built from the "news-article-detail" Figma frame
// (node 25:200): the post card on the left with an info / related / tags rail
// on the right. News and Guides both render it, since the frame has no separate
// guides design.
//
// Edit and Delete are inert while v2 is a canvas; only Back navigates.

const CARD = "rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]";

type Props = {
  post: Article;
  /** Everything in the same section, used to fill the related list. */
  pool: Article[];
  /** Route the back link and related rows point at, e.g. "/v2/news". */
  basePath: string;
  copy: { back: string; info: string; related: string };
};

// The frame's related list is placeholder rows, so it is filled from the real
// posts instead: same category first, then the rest, capped at three.
function relatedTo(post: Article, pool: Article[]): Article[] {
  const others = pool.filter((a) => a.slug !== post.slug);
  const sameCategory = others.filter((a) => a.category === post.category);
  const rest = others.filter((a) => a.category !== post.category);
  return [...sameCategory, ...rest].slice(0, 3);
}

export default function V2PostDetail({ post, pool, basePath, copy }: Props) {
  const related = relatedTo(post, pool);
  const tags = post.tags ?? [post.category.toLowerCase()];

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
        <div className="flex shrink-0 items-start gap-[12px]">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[14px] py-[8px] text-[14px] font-semibold text-[#e2e8f0]"
          >
            <Pencil size={14} strokeWidth={2} />
            Edit
          </button>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#ef4444]! bg-[#ef4444]/10 px-[14px] py-[8px] text-[14px] font-semibold text-[#ef4444]"
          >
            <Trash2 size={14} strokeWidth={2} />
            Delete
          </button>
        </div>
      </div>

      <div className="flex items-start gap-[24px]">
        <article className="flex min-w-0 flex-1 flex-col gap-[24px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[40px]">
          <div className="flex flex-col gap-[16px]">
            <span
              className={`w-fit shrink-0 rounded-full px-[10px] py-[4px] text-[12px] font-bold ${CATEGORY_PILL[post.category]}`}
            >
              {post.category}
            </span>
            <h1 className="text-[24px] leading-[32px] font-bold text-[#e2e8f0]">{post.title}</h1>
            <div className="flex items-center gap-[16px]">
              <span className="flex items-center gap-[6px]">
                <Calendar size={14} strokeWidth={2} className="text-[#94a3b8]" />
                <span className="text-[13px] font-normal text-[#94a3b8]">{post.dateLong}</span>
              </span>
              <span className="text-[13px] font-normal text-[#64748b]">•</span>
              <span className="flex items-center gap-[6px]">
                <User size={14} strokeWidth={2} className="text-[#94a3b8]" />
                <span className="text-[13px] font-normal text-[#94a3b8]">{post.author}</span>
              </span>
            </div>
          </div>

          <div className="h-px w-full bg-[#243033]" />

          <div className="flex flex-col gap-[20px] text-[14px]">
            {post.links ? (
              post.links.map((l) => (
                <div key={l.label} className="flex flex-col gap-[8px]">
                  <p className="font-bold text-[#e2e8f0]">{l.label}</p>
                  {/* The frame truncates the longest URL; wrapping keeps it
                      readable and copyable, at the cost of a taller card. */}
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-normal break-all text-[#8fb0a7] underline decoration-solid"
                  >
                    {l.href}
                  </a>
                </div>
              ))
            ) : (
              // No body content exists for these in the frame, so the listing
              // excerpt stands in until posts come from the database.
              <p className="leading-[1.6] font-normal text-[#e2e8f0]">{post.excerpt}</p>
            )}
          </div>
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
                <span className="text-[12px] font-normal text-[#94a3b8]">Author</span>
              </span>
            </div>
            <div className="flex flex-col gap-[10px]">
              <div className="flex items-center gap-[10px]">
                <Calendar size={14} strokeWidth={2} className="shrink-0 text-[#94a3b8]" />
                <p className="min-w-0 flex-1 text-[13px] font-normal text-[#94a3b8]">
                  Published: {post.dateLong}
                </p>
              </div>
              <div className="flex items-center gap-[10px]">
                <Folder size={14} strokeWidth={2} className="shrink-0 text-[#94a3b8]" />
                <p className="min-w-0 flex-1 text-[13px] font-normal text-[#94a3b8]">
                  Category: {post.category}
                </p>
              </div>
              <div className="flex items-center gap-[10px]">
                <Clock size={14} strokeWidth={2} className="shrink-0 text-[#94a3b8]" />
                <p className="min-w-0 flex-1 text-[13px] font-normal text-[#94a3b8]">
                  Last updated: {post.dateLong}
                </p>
              </div>
            </div>
          </div>

          <div className={`flex flex-col gap-[12px] ${CARD}`}>
            <p className="text-[14px] font-bold text-[#e2e8f0]">{copy.related}</p>
            <div className="flex flex-col gap-[12px]">
              {related.map((r, i) => (
                <div key={r.slug} className="flex flex-col gap-[12px]">
                  <Link href={`${basePath}/${r.slug}`} className="flex flex-col gap-[6px]">
                    <span className="flex items-center gap-[8px]">
                      <span
                        className={`shrink-0 rounded-full px-[10px] py-[4px] text-[12px] font-bold ${CATEGORY_PILL[r.category]}`}
                      >
                        {r.category}
                      </span>
                      <span className="min-w-0 flex-1 text-[14px] font-semibold text-[#e2e8f0]">
                        {r.title}
                      </span>
                    </span>
                    <span className="text-[12px] font-normal text-[#94a3b8]">{r.dateLong}</span>
                  </Link>
                  {i < related.length - 1 ? <div className="h-px w-full bg-[#243033]" /> : null}
                </div>
              ))}
            </div>
          </div>

          <div className={`flex flex-col gap-[12px] ${CARD}`}>
            <p className="text-[14px] font-bold text-[#e2e8f0]">Tags</p>
            <div className="flex flex-wrap content-start items-start gap-[8px]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-[#8fb0a7]/[0.12] px-[10px] py-[4px] text-[12px] font-bold text-[#8fb0a7]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
