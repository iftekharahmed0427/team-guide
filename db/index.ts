import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import * as authSchema from "./auth-schema";
import * as appSchema from "./app-schema";

// `timestamp` (no tz) columns hold UTC wall-clock (the app and bot both write
// UTC). Parse them as UTC so each Date is the correct instant regardless of the
// server's timezone, which keeps time-zone formatting (lib/datetime.ts) accurate.
// Mirrors bot/src/db.ts. OID 1114 = timestamp without time zone.
types.setTypeParser(1114, (v: string) => new Date(v.replace(" ", "T") + "Z"));

// TLS is on unless explicitly disabled, which is what a managed provider needs;
// rejectUnauthorized:false avoids shipping a CA file. Set DATABASE_SSL=disable
// for a Postgres reached over a private network (the VPS deployment, where the
// database is on an internal Docker network and never crosses the wire).
const useSsl = process.env.DATABASE_SSL !== "disable";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema: { ...authSchema, ...appSchema } });
