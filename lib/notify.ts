import { sql } from "drizzle-orm";
import { db } from "@/db";
import { NOTIFY_CHANNEL } from "@/lib/realtime-shared";

// Broadcast a data change to every connected client. We publish straight from
// Postgres with pg_notify(), so this stays one best-effort round-trip on the
// existing pool with no extra socket. app/api/events holds a single LISTEN
// connection per server process and fans the notification out over SSE to the
// browser (the layout's LiveRefresh and the board). Call this from every
// mutating server action, after the write. Notification is best-effort;
// failures never affect the committed write.
export async function notifyChange(): Promise<void> {
  try {
    await db.execute(sql`select pg_notify(${NOTIFY_CHANNEL}, '')`);
  } catch {
    // notify is best-effort; the write already succeeded
  }
}
