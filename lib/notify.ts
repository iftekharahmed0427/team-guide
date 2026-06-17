import { sql } from "drizzle-orm";
import { db } from "@/db";

// Broadcast a data change to every connected client via Postgres NOTIFY on the
// single app-wide channel. The LISTEN side lives in lib/app-events.ts → the SSE
// route (app/api/realtime). Call this from every mutating server action, after
// the write. Realtime is best-effort — failures never affect the committed write.
export async function notifyChange(): Promise<void> {
  try {
    await db.execute(sql`select pg_notify('app_event', '')`);
  } catch {
    // realtime is best-effort; the write already succeeded
  }
}
