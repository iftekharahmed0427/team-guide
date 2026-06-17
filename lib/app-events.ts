import { Client } from "pg";

// App-wide server-only pub/sub, backed by Postgres LISTEN/NOTIFY so it works
// across every server instance (notifications fan out through the DB). Every
// mutating server action calls notifyChange() (lib/notify.ts) → pg_notify on the
// single 'app_event' channel; this module keeps one dedicated listener
// connection and forwards each notification to subscribed SSE streams.

type Listener = () => void;

type AppEventState = {
  listeners: Set<Listener>;
  client: Client | null;
  connecting: Promise<void> | null;
};

// Survive dev HMR (and avoid stacking listener connections) via a global.
const globalForApp = globalThis as unknown as {
  __appEvents?: AppEventState;
};

const state: AppEventState =
  globalForApp.__appEvents ??
  (globalForApp.__appEvents = {
    listeners: new Set(),
    client: null,
    connecting: null,
  });

async function ensureListening(): Promise<void> {
  if (state.client) return;
  if (!state.connecting) {
    state.connecting = (async () => {
      const useSsl = process.env.DATABASE_SSL !== "disable";
      // LISTEN requires a dedicated, non-pooled session (the Supabase
      // transaction pooler does not support it), so use the direct connection.
      const client = new Client({
        connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      });
      client.on("notification", () => {
        for (const listener of state.listeners) {
          try {
            listener();
          } catch {
            // one bad subscriber shouldn't break the rest
          }
        }
      });
      client.on("error", () => {
        // Drop the handle; the next subscriber (or EventSource reconnect) reconnects.
        state.client = null;
      });
      await client.connect();
      await client.query("LISTEN app_event");
      state.client = client;
    })();
  }
  try {
    await state.connecting;
  } catch {
    state.client = null;
  } finally {
    state.connecting = null;
  }
}

export function subscribeApp(listener: Listener): () => void {
  state.listeners.add(listener);
  void ensureListening();
  return () => {
    state.listeners.delete(listener);
  };
}
