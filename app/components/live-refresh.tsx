"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { REALTIME_EVENT, REALTIME_TOPIC } from "@/lib/realtime-shared";

// Pages that don't need realtime - skip the subscription there entirely so an
// idle tab doesn't hold a Supabase Realtime WebSocket open for no benefit. News
// and Guides rarely change; Settings self-polls where it needs to (bot status);
// the Board runs its OWN subscription (kanban-board.tsx), so the layout one is
// redundant there.
const NO_LIVE_PREFIXES = ["/news", "/guides", "/settings", "/board"];

// Mounted once in the app layout. On pages that benefit from realtime, and while
// the tab is VISIBLE, it subscribes to the app-wide Supabase broadcast channel
// and re-renders the current route on every data change. The board holds its own
// client state and reconciles separately, so a refresh here is harmless to it.
//
// When the tab goes HIDDEN it leaves the channel, so idle background tabs don't
// keep a WebSocket open. On returning it rejoins and does one catch-up refresh to
// pick up anything missed. Refreshes are debounced to coalesce bursts.
export default function LiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const live = !NO_LIVE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!live) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 150);
    };

    const connect = () => {
      if (channel || document.hidden) return;
      channel = supabase
        .channel(REALTIME_TOPIC)
        .on("broadcast", { event: REALTIME_EVENT }, scheduleRefresh)
        .subscribe();
    };

    const disconnect = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
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
