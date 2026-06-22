import { createClient } from "@supabase/supabase-js";

// One browser-side Supabase client, shared across the app so every realtime
// subscriber reuses a SINGLE WebSocket to Supabase Realtime, replacing the old
// per-tab serverless SSE function + dedicated Postgres listener (the dominant
// Vercel Fluid Active CPU / Provisioned Memory cost). We only use the Realtime
// broadcast feature here; no auth/storage/db calls from the client. The anon key
// is public-safe and inlined at build time via the NEXT_PUBLIC_* prefix.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
