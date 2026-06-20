"use client";

import { Search } from "lucide-react";

// The dashboard's search bar: opens the global search palette (the same one the
// sidebar trigger and Cmd/Ctrl+K open) via the shared "open-search" event.
export default function DashboardSearch() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-search"))}
      className="hidden h-9 cursor-pointer items-center gap-2 border border-border bg-surface-2 px-3 text-muted transition-colors hover:border-muted hover:text-foreground md:flex"
    >
      <Search size={16} strokeWidth={1.75} className="shrink-0" />
      <span className="w-56 text-left text-sm">Search news and guides</span>
      <kbd className="shrink-0 border border-border px-1.5 py-0.5 text-[10px] font-medium">
        ⌘ K
      </kbd>
    </button>
  );
}
