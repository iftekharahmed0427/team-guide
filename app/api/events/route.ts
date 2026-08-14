import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

// Server-sent events stream of app-wide data changes. Every mutating server
// action calls notifyChange() -> pg_notify; lib/events holds ONE Postgres
// listener for the whole process and pushes a line here for each connected tab.
// The browser side is app/components/live-refresh.tsx and the board.
//
// Signed-in users only: the proxy matcher skips paths under /api that it treats
// as static-ish, so this route checks the session itself.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup(); // client vanished mid-write
        }
      };

      // Cloudflare drops an idle HTTP connection at 100s and proxies buffer
      // less when they see traffic, so heartbeat well inside that window.
      const ping = setInterval(() => send(": ping\n\n"), 25_000);
      ping.unref?.();

      const unsubscribe = subscribe(() => send("data: changed\n\n"));

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed by the runtime
        }
      };

      request.signal.addEventListener("abort", cleanup);
      send(": connected\n\n");
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform keeps intermediaries from buffering or compressing the
      // stream; X-Accel-Buffering is the nginx-family opt-out of the same.
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
