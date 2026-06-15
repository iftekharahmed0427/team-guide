import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as authSchema from "./auth-schema";
import * as appSchema from "./app-schema";

// Supabase requires TLS. rejectUnauthorized:false keeps it working across the
// direct connection and the Supavisor poolers without shipping a CA file.
// Set DATABASE_SSL=disable only when pointing at a local non-TLS Postgres.
const useSsl = process.env.DATABASE_SSL !== "disable";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema: { ...authSchema, ...appSchema } });
