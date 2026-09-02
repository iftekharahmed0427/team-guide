"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SSE_PATH } from "@/lib/realtime-shared";

// Pages that don't need realtime - skip the subscription there entirely so an
// idle tab doesn't hold a connection open for no benefit. News and Guides rarely
// change, and Settings self-polls where it needs to (bot status).
//
// The Board is NOT on this list: it used to run its own subscription, and the
// board that replaced it does not. It adopts fresh server props by comparing a
// signature, so a refresh from here reconciles into it rather than fighting it.
const NO_LIVE_PREFIXES = ["/news", "/guides", "/settings"];

// Mounted once in the app layout. On pages that benefit from realtime, and while
// the tab is VISIBLE, it opens an SSE connection to /api/events and re-renders
// the current route on every data change. The board holds its own client state
// and reconciles separately, so a refresh here is harmless to it.
//
// When the tab goes HIDDEN it closes the stream, so idle background tabs don't
// hold a connection. On returning it reopens and does one catch-up refresh to
// pick up anything missed. Same after a dropped connection, since events that
// happen while disconnected are simply gone. Refreshes are debounced to
// coalesce bursts.
export default function LiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const live = !NO_LIVE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!live) return;

    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Set whenever the stream drops, so the next successful open catches up on
    // whatever changed while we were not listening.
    let missedEvents = false;

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 150);
    };

    const connect = () => {
      if (source || document.hidden) return;
      const es = new EventSource(SSE_PATH);
      es.onmessage = scheduleRefresh;
      es.onopen = () => {
        if (missedEvents) {
          missedEvents = false;
          scheduleRefresh();
        }
      };
      // EventSource reconnects on its own; just remember that we have a gap.
      es.onerror = () => {
        missedEvents = true;
      };
      source = es;
    };

    const disconnect = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (source) {
        source.close();
        source = null;
      }
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
