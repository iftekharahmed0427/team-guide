import { getSession } from "@/lib/auth";
import { getBotStatusPayload } from "@/app/(app)/settings/discord-bot/status";

export const dynamic = "force-dynamic";

// Admin-only JSON status, polled by the bot status panel.
export async function GET() {
  const session = await getSession();
  if (session?.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }
  return Response.json(await getBotStatusPayload());
}
