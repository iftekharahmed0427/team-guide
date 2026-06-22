import { sql } from "drizzle-orm";
import { db } from "@/db";
import { REALTIME_EVENT, REALTIME_TOPIC } from "@/lib/realtime-shared";

// Broadcast a data change to every connected client via Supabase Realtime. We
// publish straight from the DB with realtime.send() on a single shared, public
// topic, so this stays one best-effort round-trip with no extra server-side
// socket. The browser subscribes via lib/supabase-client (the layout's
// LiveRefresh and the board). Call this from every mutating server action, after
// the write. Realtime is best-effort; failures never affect the committed write.
export async function notifyChange(): Promise<void> {
  try {
    await db.execute(
      sql`select realtime.send('{}'::jsonb, ${REALTIME_EVENT}::text, ${REALTIME_TOPIC}::text, false)`,
    );
  } catch {
    // realtime is best-effort; the write already succeeded
  }
}
