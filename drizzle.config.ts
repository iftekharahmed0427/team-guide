import { defineConfig } from "drizzle-kit";

// Migrations run over DIRECT_URL, falling back to DATABASE_URL when unset. On
// the VPS that is 127.0.0.1:5432 (the database published on loopback) while the
// app containers reach the same server by its container name.
export default defineConfig({
  schema: ["./db/auth-schema.ts", "./db/app-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
    ssl: process.env.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false },
  },
});
