import type { Attachment, Client, Snowflake } from "discord.js";
import type { ReportEntry } from "./db.ts";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic|heif|avif)$/i;

// A "screenshot" is an uploaded image attachment. Link previews, stickers, and
// emoji are message embeds / not attachments, so they are never counted.
function isImageAttachment(att: Attachment): boolean {
  if (att.contentType?.startsWith("image/")) return true;
  return IMAGE_EXT.test(att.name ?? "");
}

export type ChannelResult = {
  entry: ReportEntry;
  ok: boolean;
  count: number;
  error?: string;
};

// Count image attachments posted in the (windowStart, now] window. When the
// entry has a userId, only that member's uploads count. Walks message history
// backwards via REST (no Message Content intent needed for attachments).
export async function countChannelTickets(
  client: Client,
  entry: ReportEntry,
  windowStart: number,
): Promise<ChannelResult> {
  try {
    const channel = await client.channels.fetch(entry.channelId);
    if (!channel || !channel.isTextBased() || !("messages" in channel)) {
      return { entry, ok: false, count: 0, error: "not a readable text channel" };
    }

    let count = 0;
    let before: Snowflake | undefined;

    while (true) {
      const batch = await channel.messages.fetch(
        before ? { limit: 100, before } : { limit: 100 },
      );
      if (batch.size === 0) break;

      let oldestId: Snowflake | undefined;
      let oldestTs = Number.POSITIVE_INFINITY;
      let reachedOlder = false;

      for (const msg of batch.values()) {
        if (msg.createdTimestamp < oldestTs) {
          oldestTs = msg.createdTimestamp;
          oldestId = msg.id;
        }
        if (msg.createdTimestamp <= windowStart) {
          reachedOlder = true;
          continue;
        }
        if (entry.userId && msg.author.id !== entry.userId) continue;
        for (const att of msg.attachments.values()) {
          if (isImageAttachment(att)) count++;
        }
      }

      if (reachedOlder || batch.size < 100 || !oldestId) break;
      before = oldestId;
    }

    return { entry, ok: true, count };
  } catch (err) {
    return {
      entry,
      ok: false,
      count: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
