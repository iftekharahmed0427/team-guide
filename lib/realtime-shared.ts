// Single app-wide change channel, shared by the layout's LiveRefresh and the
// board. The server publishes with pg_notify() in lib/notify.ts (and the reports
// bot does the same from bot/src/db.ts); the browser subscribes to SSE_PATH,
// which holds ONE Postgres listener per server process and fans it out to every
// connected tab. Kept dependency-free so both server and client modules can
// import it without pulling in the database.
export const NOTIFY_CHANNEL = "app_event";

// Server-sent events endpoint the browser connects to (app/api/events/route.ts).
export const SSE_PATH = "/api/events";
