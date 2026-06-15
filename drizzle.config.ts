import { defineConfig } from "drizzle-kit";

// Migrations use the Supabase direct connection (port 5432), not the transaction
// pooler. DIRECT_URL is preferred; it falls back to DATABASE_URL if unset.
export default defineConfig({
  schema: ["./db/auth-schema.ts", "./db/app-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
    ssl: process.env.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false },
  },
});
