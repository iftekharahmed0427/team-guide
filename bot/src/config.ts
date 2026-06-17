// The bot needs only the database connection in its environment. The Discord
// token and all other config live in the DB and are edited from the website
// (Settings → Discord bot).

export function loadEnv(): void {
  if (!(process.env.DATABASE_URL ?? process.env.DIRECT_URL)) {
    throw new Error("DATABASE_URL is required (the bot reads its config from the DB).");
  }
}
