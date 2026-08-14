import { Client } from "pg";
import { NOTIFY_CHANNEL } from "@/lib/realtime-shared";

// ONE Postgres LISTEN connection per server process, fanned out in-process to
// every connected SSE client (app/api/events). This is the whole point of the
// design: 50 open tabs cost 1 database connection, not 50. The old Supabase
// Realtime WebSocket and the even older per-tab listener are both replaced by
// this. Connection is lazy (first subscriber opens it) and self-healing: on
// error or a dropped socket it reconnects with backoff while subscribers remain.

type Listener = () => void;

type Hub = {
  listeners: Set<Listener>;
  client: Client | null;
  connecting: Promise<void> | null;
  retry: number;
  timer: ReturnType<typeof setTimeout> | null;
};

// Survive dev hot-reload: without this every edit leaks another listener.
const globalForHub = globalThis as unknown as { __appEventHub?: Hub };

const hub: Hub = (globalForHub.__appEventHub ??= {
  listeners: new Set<Listener>(),
  client: null,
  connecting: null,
  retry: 0,
  timer: null,
});

function emit(): void {
  for (const listener of hub.listeners) {
    try {
      listener();
    } catch {
      // one bad subscriber must not stop the others
    }
  }
}

// Drop a dead client and queue a reconnect if anyone is still listening.
function teardown(client: Client): void {
  if (hub.client !== client) return;
  hub.client = null;
  try {
    void client.end();
  } catch {
    // already gone
  }
  if (hub.listeners.size > 0) scheduleReconnect();
}

function scheduleReconnect(): void {
  if (hub.timer) return;
  hub.retry = Math.min(hub.retry + 1, 6);
  const delay = Math.min(30_000, 500 * 2 ** hub.retry); // 1s .. 30s
  hub.timer = setTimeout(() => {
    hub.timer = null;
    void connect();
  }, delay);
  hub.timer.unref?.();
}

async function connect(): Promise<void> {
  if (hub.client) return;
  if (hub.connecting) return hub.connecting;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "disable" ? undefined : { rejectUnauthorized: false },
  });

  hub.connecting = (async () => {
    try {
      client.on("error", () => teardown(client));
      client.on("end", () => teardown(client));
      client.on("notification", (msg) => {
        if (msg.channel === NOTIFY_CHANNEL) emit();
      });
      await client.connect();
      // LISTEN takes an identifier, which cannot be a bind parameter. The
      // channel is a hardcoded constant, so there is nothing to inject.
      await client.query(`listen ${NOTIFY_CHANNEL}`);
      hub.client = client;
      hub.retry = 0;
    } catch {
      try {
        await client.end();
      } catch {
        // ignore
      }
      if (hub.listeners.size > 0) scheduleReconnect();
    } finally {
      hub.connecting = null;
    }
  })();

  return hub.connecting;
}

// Register a callback for app-wide change events. Returns the unsubscribe.
// The Postgres connection is opened on the first subscriber and then kept, so a
// busy portal never pays reconnect cost; it is only torn down on error.
export function subscribe(listener: Listener): () => void {
  hub.listeners.add(listener);
  void connect();
  return () => {
    hub.listeners.delete(listener);
  };
}
