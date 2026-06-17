"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Mounted once in the app layout. Subscribes to the app-wide realtime stream and
// re-renders the current route on every data change, so every server-rendered
// page (dashboard, news, guides, team, notes, …) stays live without a reload.
// The board holds its own client state and reconciles separately, so a refresh
// here is harmless to it. Refreshes are debounced to coalesce bursts.
export default function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource("/api/realtime");
    source.onmessage = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 150);
    };
    return () => {
      if (timer) clearTimeout(timer);
      source.close();
    };
  }, [router]);

  return null;
}
