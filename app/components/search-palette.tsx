"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { Search, Loader2, Newspaper, BookOpen } from "lucide-react";

type SearchItem = {
  type: "news" | "guide";
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  game?: string;
  snippet: string;
};

export default function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the index once, on first open.
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
      // leave items null; the panel shows the empty/hint state
    } finally {
      setLoading(false);
    }
  }, [items, loading]);

  const openPalette = useCallback(() => {
    setOpen(true);
    void load();
  }, [load]);
  function closePalette() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  // Global Cmd/Ctrl+K toggles the palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) void load();
          return !o;
        });
      } else if (e.key === "Escape" && open) {
        closePalette();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, load]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Let other parts of the app (e.g. the dashboard search bar) open the palette.
  useEffect(() => {
    const onOpen = () => openPalette();
    window.addEventListener("open-search", onOpen);
    return () => window.removeEventListener("open-search", onOpen);
  }, [openPalette]);

  const fuse = useMemo(
    () =>
      new Fuse(items ?? [], {
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
    return fuse.search(q, { limit: 8 }).map((r) => r.item);
  }, [fuse, query]);

  const go = useCallback(
    (item: SearchItem) => {
      closePalette();
      router.push(item.type === "news" ? `/news/${item.slug}` : `/guides/${item.slug}`);
    },
    [router],
  );

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item) go(item);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        className="group flex w-full cursor-pointer items-center gap-2 border border-border bg-surface-2 px-3 py-2 text-sm text-muted transition-colors hover:border-muted hover:text-foreground"
      >
        <Search size={15} strokeWidth={1.75} className="shrink-0" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="shrink-0 border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted">
          ⌘ K
        </kbd>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search news and guides"
          onClick={closePalette}
          className="fx-fade fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fx-rise flex w-full max-w-xl flex-col border border-border bg-surface shadow-2xl shadow-black/50"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              {loading ? (
                <Loader2 size={17} strokeWidth={1.75} className="shrink-0 animate-spin text-muted" />
              ) : (
                <Search size={17} strokeWidth={1.75} className="shrink-0 text-muted" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Search news and guides..."
                className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto py-1">
              {query.trim() === "" ? (
                <p className="px-4 py-6 text-center text-sm text-muted">
                  Type to search news and guides.
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">
                  {loading ? "Loading..." : `No matches for "${query.trim()}".`}
                </p>
              ) : (
                results.map((item, i) => {
                  const Icon = item.type === "news" ? Newspaper : BookOpen;
                  return (
                    <button
                      key={`${item.type}-${item.slug}`}
                      type="button"
                      onClick={() => go(item)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === active ? "bg-surface-2" : ""
                      }`}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.75}
                        className="mt-0.5 shrink-0 text-muted"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </span>
                          <span className="shrink-0 border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                            {item.type === "news" ? "News" : item.game || "Guide"}
                          </span>
                        </span>
                        {item.excerpt ? (
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {item.excerpt}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
