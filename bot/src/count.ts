import type { Attachment, Client, Message, Snowflake } from "discord.js";
import type { ReportEntry } from "./db.ts";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic|heif|avif)$/i;

// A "screenshot" is an uploaded image attachment. Link previews, stickers, and
// emoji are message embeds / not attachments, so they are never counted.
function isImageAttachment(att: Attachment): boolean {
  if (att.contentType?.startsWith("image/")) return true;
  return IMAGE_EXT.test(att.name ?? "");
}

// Image attachments in one message that count toward `entry` (respecting the
// optional per-member filter).
function imagesInMessage(msg: Message, entry: ReportEntry): number {
  if (entry.userId && msg.author.id !== entry.userId) return 0;
  let n = 0;
  for (const att of msg.attachments.values()) if (isImageAttachment(att)) n++;
  return n;
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

// ── Live counting (dashboard) ────────────────────────────────────────────────
//
// The dashboard "Tickets solved" card needs a near-realtime count without
// re-walking channel history every few seconds. So the bot does ONE full count
// of the in-progress period (liveCountFull) to seed `lastSeenMessageId`, then on
// each tick fetches only the messages newer than that (liveCountAfter) and adds
// to the running tally. New messages per tick are usually zero, so a 5s cadence
// is ~1 cheap request per channel and never approaches Discord's rate limits.

export type LiveResult =
  | { ok: true; count: number; newestId: string | null }
  | { ok: false; error: string };

// Full count of image-attachment tickets in (periodStart, now], plus the id of
// the channel's newest message so incremental counting can continue from there.
export async function liveCountFull(
  client: Client,
  entry: ReportEntry,
  periodStart: number,
): Promise<LiveResult> {
  try {
    const channel = await client.channels.fetch(entry.channelId);
    if (!channel || !channel.isTextBased() || !("messages" in channel)) {
      return { ok: false, error: "not a readable text channel" };
    }

    let count = 0;
    let newestId: string | null = null;
    let newestTs = Number.NEGATIVE_INFINITY;
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
        if (msg.createdTimestamp > newestTs) {
          newestTs = msg.createdTimestamp;
          newestId = msg.id;
        }
        if (msg.createdTimestamp <= periodStart) {
          reachedOlder = true;
          continue;
        }
        count += imagesInMessage(msg, entry);
      }

      if (reachedOlder || batch.size < 100 || !oldestId) break;
      before = oldestId;
    }

    return { ok: true, count, newestId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Count image-attachment tickets in messages newer than `afterId`, returning how
// many to ADD to the running tally and the new newest id. Fetches only the new
// messages (paginating forward if a burst exceeds 100), so it is cheap to call
// frequently.
export async function liveCountAfter(
  client: Client,
  entry: ReportEntry,
  afterId: string,
): Promise<LiveResult> {
  try {
    const channel = await client.channels.fetch(entry.channelId);
    if (!channel || !channel.isTextBased() || !("messages" in channel)) {
      return { ok: false, error: "not a readable text channel" };
    }

    let count = 0;
    let newestId = afterId;
    let newestTs = Number.NEGATIVE_INFINITY;
    let after: Snowflake = afterId;

    while (true) {
      const batch = await channel.messages.fetch({ limit: 100, after });
      if (batch.size === 0) break;

      let maxId: Snowflake | undefined;
      let maxTs = Number.NEGATIVE_INFINITY;

      for (const msg of batch.values()) {
        count += imagesInMessage(msg, entry);
        if (msg.createdTimestamp > maxTs) {
          maxTs = msg.createdTimestamp;
          maxId = msg.id;
        }
      }

      if (maxId && maxTs > newestTs) {
        newestTs = maxTs;
        newestId = maxId;
      }

      if (batch.size < 100 || !maxId) break;
      after = maxId; // walk forward through the backlog
    }

    return { ok: true, count, newestId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
