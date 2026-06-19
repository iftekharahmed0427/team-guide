import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import * as authSchema from "./auth-schema";
import * as appSchema from "./app-schema";

// `timestamp` (no tz) columns hold UTC wall-clock (the app and bot both write
// UTC). Parse them as UTC so each Date is the correct instant regardless of the
// server's timezone, which keeps time-zone formatting (lib/datetime.ts) accurate.
// Mirrors bot/src/db.ts. OID 1114 = timestamp without time zone.
types.setTypeParser(1114, (v: string) => new Date(v.replace(" ", "T") + "Z"));

// Supabase requires TLS. rejectUnauthorized:false keeps it working across the
// direct connection and the Supavisor poolers without shipping a CA file.
// Set DATABASE_SSL=disable only when pointing at a local non-TLS Postgres.
const useSsl = process.env.DATABASE_SSL !== "disable";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema: { ...authSchema, ...appSchema } });
