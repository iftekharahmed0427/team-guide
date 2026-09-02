"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { BookOpen, FileText, Loader2, Search, SearchX } from "lucide-react";
import type { SearchItem } from "@/app/api/search/route";

// The v2 search palette. Same index and the same Fuse weighting as the live
// one, so the two rank identically; only the surface and the routes differ.
//
// Mounted once in app/v2/layout.tsx, so Cmd/Ctrl+K works on every v2 page, not
// just the dashboard whose box opens it. The dashboard trigger reaches it
// through a window event rather than a prop, since the two sit in different
// parts of the tree.
//
// The index covers news and guides only, which is what /api/search builds.

export const OPEN_EVENT = "v2-open-search";

const LIMIT = 8;

export default function V2SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // The index is fetched once, the first time the palette is opened, so a
  // session that never searches never pays for it.
  const load = useCallback(async () => {
    if (items || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/search");
      if (res.ok) {
        const data = (await res.json()) as { items: SearchItem[] };
        setItems(data.items);
      }
    } catch {
      // Left null: the panel shows its hint state rather than an error.
    } finally {
      setLoading(false);
    }
  }, [items, loading]);

  const openPalette = useCallback(() => {
    setOpen(true);
    void load();
  }, [load]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) void load();
          return !o;
        });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [load]);

  useEffect(() => {
    const onOpen = () => openPalette();
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [openPalette]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const fuse = useMemo(
    () =>
      new Fuse(items ?? [], {
        // The live palette's weighting, kept in step so a search that finds a
        // post there finds it here.
        keys: [
          { name: "title", weight: 0.5 },
          { name: "tags", weight: 0.2 },
          { name: "excerpt", weight: 0.15 },
          { name: "game", weight: 0.1 },
          { name: "snippet", weight: 0.05 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [items],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [] as SearchItem[];
    return fuse.search(q, { limit: LIMIT }).map((r) => r.item);
  }, [fuse, query]);

  const go = useCallback(
    (item: SearchItem) => {
      close();
      router.push(
        item.type === "news" ? `/v2/news/${item.slug}` : `/v2/guides/${item.slug}`,
      );
    },
    [close, router],
  );

  if (!open) return null;

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  }

  const q = query.trim();

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div
      // Only a click that lands on the backdrop dismisses, so a drag ending
      // outside the panel does not close it.
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#070a0e]/70 p-[24px] pt-[12vh] backdrop-blur-[6px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search news and guides"
        className="flex max-h-full w-[560px] max-w-full flex-col overflow-hidden rounded-[14px] border border-[#243033]! bg-[#171e24] shadow-[0px_24px_60px_-16px_rgba(0,0,0,0.7)]"
      >
        <div className="flex shrink-0 items-center gap-[10px] border-b border-[#243033]! px-[18px] py-[14px]">
          <Search size={16} strokeWidth={2} className="shrink-0 text-[#64748b]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            aria-label="Search news and guides"
            placeholder="Search news and guides"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
          />
          {loading ? (
            <Loader2
              size={14}
              strokeWidth={2}
              className="shrink-0 animate-spin text-[#64748b]"
            />
          ) : (
            <kbd className="shrink-0 rounded-[4px] border border-[#243033]! px-[6px] py-[2px] text-[11px] font-semibold text-[#64748b]">
              Esc
            </kbd>
          )}
        </div>

        <div className="v2-rail flex max-h-[420px] min-h-0 flex-col overflow-y-auto py-[6px]">
          {!q ? (
            <p className="px-[18px] py-[16px] text-[13px] font-normal text-[#64748b]">
              Type to search across news and guides.
            </p>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-[10px] px-[18px] py-[28px] text-center">
              <SearchX size={20} strokeWidth={2} className="text-[#64748b]" />
              <p className="text-[13px] font-normal text-[#64748b]">
                Nothing matches &ldquo;{q}&rdquo;.
              </p>
            </div>
          ) : (
            results.map((item, i) => {
              const Icon = item.type === "news" ? FileText : BookOpen;
              const label = item.type === "news" ? "News" : item.game || "Guide";
              return (
                <button
                  key={`${item.type}-${item.slug}`}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex cursor-pointer items-center gap-[12px] px-[18px] py-[10px] text-left transition-colors ${
                    i === active ? "bg-white/[0.05]" : ""
                  }`}
                >
                  <span className="shrink-0 rounded-[6px] bg-[#0e1217] p-[8px]">
                    <Icon
                      size={14}
                      strokeWidth={2}
                      className="block text-[#8fb0a7]"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="truncate text-[14px] font-semibold text-[#e2e8f0]">
                      {item.title}
                    </span>
                    {item.excerpt ? (
                      <span className="truncate text-[12px] font-normal text-[#64748b]">
                        {item.excerpt}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#8fb0a7]/[0.12] px-[8px] py-[3px] text-[10px] font-bold text-[#8fb0a7]">
                    {label}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-[16px] border-t border-[#243033]! px-[18px] py-[10px] text-[11px] font-normal text-[#64748b]">
          <span>Arrow keys to move, Enter to open</span>
          <span>News and guides only</span>
        </div>
      </div>
    </div>
  );
}
