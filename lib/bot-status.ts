import { eq } from "drizzle-orm";
import { db } from "@/db";
import { botStatus } from "@/db/app-schema";

export type BotStatusPayload = {
  state: string; // offline | online | error | no_token
  botTag: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  lastHeartbeatAt: string | null;
  lastReportAt: string | null;
};

export async function getBotStatusPayload(): Promise<BotStatusPayload> {
  const row = (
    await db.select().from(botStatus).where(eq(botStatus.id, "singleton")).limit(1)
  )[0];
  return {
    state: row?.state ?? "offline",
    botTag: row?.botTag ?? null,
    lastError: row?.lastError ?? null,
    lastErrorAt: row?.lastErrorAt ? row.lastErrorAt.toISOString() : null,
    lastHeartbeatAt: row?.lastHeartbeatAt ? row.lastHeartbeatAt.toISOString() : null,
    lastReportAt: row?.lastReportAt ? row.lastReportAt.toISOString() : null,
  };
}
