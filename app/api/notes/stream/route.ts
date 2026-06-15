import { subscribeNotes } from "@/lib/note-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-Sent Events stream. Emits a "changed" message whenever any client
// posts or deletes a note (via Postgres NOTIFY → lib/note-events). The client
// then refreshes the route to pull the latest notes.
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // stream already closed
        }
      };

      send(": connected\n\n");
      unsubscribe = subscribeNotes(() => send("data: changed\n\n"));
      // Keep proxies from closing an idle connection.
      heartbeat = setInterval(() => send(": ping\n\n"), 25000);

      request.signal.addEventListener("abort", () => {
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
