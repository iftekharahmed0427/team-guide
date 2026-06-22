"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Pages that don't need realtime - skip the SSE connection there entirely so we
// don't hold a serverless function + DB listener open for no benefit. News and
// Guides rarely change; Settings self-polls where it needs to (bot status); the
// Board runs its OWN stream (kanban-board.tsx), so the layout one is redundant.
const NO_LIVE_PREFIXES = ["/news", "/guides", "/settings", "/board"];

// Mounted once in the app layout. On pages that benefit from realtime, and while
// the tab is VISIBLE, it subscribes to the app-wide stream and re-renders the
// current route on every data change. The board holds its own client state and
// reconciles separately, so a refresh here is harmless to it.
//
// When the tab goes HIDDEN it closes the stream, so idle background tabs don't
// keep a serverless function (and a DB listener) open - that open-connection time
// is the main Vercel Fluid CPU / provisioned-memory cost. On returning it reopens
// and does one catch-up refresh to pick up anything missed. Refreshes are
// debounced to coalesce bursts.
export default function LiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const live = !NO_LIVE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!live) return;

    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 150);
    };

    const connect = () => {
      if (source || document.hidden) return;
      source = new EventSource("/api/realtime");
      source.onmessage = scheduleRefresh;
    };

    const disconnect = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      source?.close();
      source = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        disconnect();
      } else {
        connect();
        router.refresh(); // catch up on changes missed while disconnected
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    connect();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      disconnect();
    };
  }, [router, live]);

  return null;
}
