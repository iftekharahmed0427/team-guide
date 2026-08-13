"use client";

import { useState } from "react";
import { Calendar, ChevronRight, Plus, Search } from "lucide-react";

// v2 news listing, built from the "news-listing-page" Figma frame (node 25:4):
// a top bar, a two-column card grid and the category / tag rail.
//
// Content is the frame's placeholder copy - this is still the redesign canvas,
// so nothing here reads from news_post yet.

type Category = "Processes" | "Guidelines" | "Scripts" | "Copyright" | "Promotions";

type Article = {
  title: string;
  excerpt: string;
  category: Category;
  date: string;
};

// Each category carries its own pill colour in the frame.
const CATEGORY_PILL: Record<Category, string> = {
  Processes: "bg-[#8fb0a7]/[0.12] text-[#8fb0a7]",
  Guidelines: "bg-[#38bdf8]/[0.12] text-[#38bdf8]",
  Scripts: "bg-[#f59e0b]/[0.12] text-[#f59e0b]",
  Copyright: "bg-[#c084fc]/[0.12] text-[#c084fc]",
  Promotions: "bg-[#f472b6]/[0.12] text-[#f472b6]",
};

const CATEGORIES: Category[] = [
  "Processes",
  "Guidelines",
  "Scripts",
  "Copyright",
  "Promotions",
];

const ARTICLES: Article[] = [
  {
    title: "Gravel Host Review Links",
    excerpt:
      "Gravel Host: https://g2.com, Trust Pilot, Host Advice and Google review links for the hosting company to share with clients for quality assurance.",
    category: "Processes",
    date: "Aug 12, 2026 · By Angeline",
  },
  {
    title: "Security Verification Requirements",
    excerpt:
      "For Gravel Host Compliance: Email Address, Identity, Full Address Region, Postcode, Country are required to complete level-2 support validation.",
    category: "Guidelines",
    date: "Aug 12, 2026 · By Angeline",
  },
  {
    title: "Services Terminated for Abuse Email",
    excerpt:
      "In the interest of Service Termination: Hello, This email is to notify you that your services with Gravel Host have been permanently flagged.",
    category: "Guidelines",
    date: "Aug 12, 2026 · By Angeline",
  },
  {
    title: "DDoss Response",
    excerpt:
      "Gravel Host DDoS attack sec, law, and applicable laws, please understand our platform guidelines while we work to improve our routing policies.",
    category: "Scripts",
    date: "Aug 11, 2026 · By Angeline",
  },
  {
    title: "Copyright infringement claims Team Response",
    excerpt:
      "Dear [Claimant], We have received your complaint and are investigating the matter across active client nodes to resolve potential issues swiftly.",
    category: "Copyright",
    date: "Jul 18, 2026 · By Angeline",
  },
  {
    title: "Available Discount Codes",
    excerpt:
      "Available discount codes for Gravel Host customers. Please see below Customer Discount promotions and referral rules for the Q3 campaign.",
    category: "Processes",
    date: "Jul 2, 2026 · By Angeline",
  },
];

const TAGS = [
  "#security",
  "#compliance",
  "#hosting",
  "#billing",
  "#announcement",
  "#templates",
  "#support",
  "#gravel-host",
];

const CARD = "rounded-[12px] border border-[#243033]! bg-[#171e24] p-[20px]";

export default function V2News() {
  const [filter, setFilter] = useState<Category | null>(null);

  // Counts come from the articles rather than the frame's hand-written numbers,
  // which add up to 8 against a six-card grid.
  const countOf = (c: Category) => ARTICLES.filter((a) => a.category === c).length;
  const shown = filter ? ARTICLES.filter((a) => a.category === filter) : ARTICLES;

  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">News</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">All announcements and updates</p>
        </div>
        <div className="flex shrink-0 items-center gap-[16px]">
          <div className="flex w-[280px] items-center gap-[10px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[14px] py-[10px]">
            <Search size={14} strokeWidth={2} className="shrink-0 text-[#94a3b8]" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-normal text-[#94a3b8]">
              Search news and guides
            </span>
          </div>
          <button
            type="button"
            className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] bg-[#8fb0a7] px-[16px] py-[10px] transition-opacity hover:opacity-90"
          >
            <Plus size={14} strokeWidth={2} className="text-[#0f141a]" />
            <span className="text-[14px] font-semibold text-[#0f141a]">New post</span>
          </button>
        </div>
      </div>

      <div className="flex items-start gap-[24px]">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-[16px]">
          {shown.length === 0 ? (
            <p
              className={`col-span-2 flex min-h-[180px] items-center justify-center text-[13px] text-[#64748b] ${CARD}`}
            >
              Nothing here yet
            </p>
          ) : null}
          {shown.map((a) => (
            <button
              key={a.title}
              type="button"
              className={`flex min-h-[180px] min-w-px flex-col gap-[14px] text-left transition-colors hover:border-[#2f3d42]! ${CARD}`}
            >
              <div className="flex w-full items-center justify-between gap-[12px]">
                <span
                  className={`shrink-0 rounded-full px-[10px] py-[3px] text-[11px] font-bold uppercase ${CATEGORY_PILL[a.category]}`}
                >
                  {a.category}
                </span>
                <span className="flex shrink-0 items-center gap-[6px]">
                  <Calendar size={12} strokeWidth={2} className="text-[#64748b]" />
                  <span className="text-[12px] font-normal text-[#64748b]">{a.date}</span>
                </span>
              </div>

              <div className="flex w-full flex-col gap-[8px]">
                <p className="w-full truncate text-[16px] font-bold text-[#e2e8f0]">{a.title}</p>
                <p className="line-clamp-2 w-full text-[13px] leading-[1.4] font-normal text-[#94a3b8]">
                  {a.excerpt}
                </p>
              </div>

              <div className="mt-auto flex w-full flex-col gap-[14px]">
                <div className="h-px w-full bg-[#243033]" />
                <div className="flex w-full items-center justify-between">
                  {/* The frame writes this as "Read more >" and then repeats the
                      glyph as a chevron on the right; lucide carries it once. */}
                  <span className="text-[13px] font-semibold text-[#8fb0a7]">Read more</span>
                  <ChevronRight size={14} strokeWidth={2} className="text-[#8fb0a7]" />
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex w-[280px] shrink-0 flex-col gap-[16px]">
          <div className={`flex flex-col gap-[16px] ${CARD}`}>
            <div className="flex flex-col gap-[4px]">
              <p className="text-[15px] font-bold text-[#e2e8f0]">Reports &amp; Categories</p>
              <p className="text-[12px] font-normal text-[#94a3b8]">Filter by team operations</p>
            </div>
            <div className="h-px w-full bg-[#243033]" />
            <div className="flex flex-col gap-[4px]">
              <button
                type="button"
                onClick={() => setFilter(null)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-[8px] px-[14px] py-[10px] transition-colors ${
                  filter === null ? "bg-[#1e292b]" : "hover:bg-[#1e292b]/60"
                }`}
              >
                <span
                  className={`text-[14px] ${filter === null ? "font-semibold text-[#8fb0a7]" : "font-medium text-[#e2e8f0]"}`}
                >
                  All articles
                </span>
                <span
                  className={`rounded-full px-[8px] py-[2px] text-[11px] font-bold ${
                    filter === null
                      ? "bg-[#8fb0a7]/[0.12] text-[#8fb0a7]"
                      : "bg-[#243033] text-[#94a3b8]"
                  }`}
                >
                  {ARTICLES.length}
                </span>
              </button>
              {CATEGORIES.map((c) => {
                const active = filter === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFilter(c)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-[8px] px-[14px] py-[10px] transition-colors ${
                      active ? "bg-[#1e292b]" : "hover:bg-[#1e292b]/60"
                    }`}
                  >
                    <span
                      className={`text-[14px] ${active ? "font-semibold text-[#8fb0a7]" : "font-medium text-[#e2e8f0]"}`}
                    >
                      {c}
                    </span>
                    <span
                      className={`rounded-full px-[8px] py-[2px] text-[11px] font-bold ${
                        active ? "bg-[#8fb0a7]/[0.12] text-[#8fb0a7]" : "bg-[#243033] text-[#94a3b8]"
                      }`}
                    >
                      {countOf(c)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`flex flex-col gap-[16px] ${CARD}`}>
            <p className="text-[14px] font-bold text-[#e2e8f0]">Browse by tag</p>
            <div className="h-px w-full bg-[#243033]" />
            <div className="flex flex-wrap content-start items-start gap-[8px]">
              {TAGS.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-[#243033] px-[12px] py-[6px] text-[12px] font-medium text-[#94a3b8]"
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
