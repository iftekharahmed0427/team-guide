// Single app-wide realtime channel, shared by the layout's LiveRefresh and the
// board. Mirrors the old Postgres NOTIFY channel name. The server publishes to
// this topic via realtime.send() in lib/notify.ts; the browser subscribes via
// lib/supabase-client. Kept dependency-free so both server and client modules
// can import it without pulling in the Supabase client.
export const REALTIME_TOPIC = "app_event";
export const REALTIME_EVENT = "changed";
