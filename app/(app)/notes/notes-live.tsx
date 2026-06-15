"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Subscribe to the live notes stream and refresh the route on each change so
// the server-rendered list picks up posts/deletes from other members without a
// manual reload. Self-notifies are harmless (the refetch is idempotent).
export default function NotesLive() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/notes/stream");
    source.onmessage = () => router.refresh();
    return () => source.close();
  }, [router]);

  return null;
}
