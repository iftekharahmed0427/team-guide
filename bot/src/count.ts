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

export type CountResult =
  | { ok: true; count: number; newestId: string | null }
  | { ok: false; error: string };

// Count image-attachment "tickets" for `entry` in the active window, and return
// the channel's newest message id.
//
// The window is (floor, now], where `floor` is the LATEST of:
//   • `windowStart` — the period start, or a later manual-reset time, and
//   • the most recent BOT message in the channel.
// So counting always begins AFTER a bot's message: report channels get a bot
// post (the ticket panel, or the period summary this bot itself posts) that
// marks where a fresh count should start, and screenshots above it are ignored.
// If no bot has posted since `windowStart`, the whole window is counted.
//
// Walks history backward via REST and stops as soon as it reaches the floor or a
// bot message, so a channel with regular bot posts is cheap to count. Because it
// recounts current state on every call, deleted screenshots fall out of the
// tally on their own (no Message Content intent is needed for attachments or for
// author.bot).
export async function countWindow(
  client: Client,
  entry: ReportEntry,
  windowStart: number,
): Promise<CountResult> {
  try {
    const channel = await client.channels.fetch(entry.channelId);
    if (!channel || !channel.isTextBased() || !("messages" in channel)) {
      return { ok: false, error: "not a readable text channel" };
    }

    let count = 0;
    let newestId: string | null = null;
    let before: Snowflake | undefined;
    let done = false;

    while (!done) {
      const batch = await channel.messages.fetch(
        before ? { limit: 100, before } : { limit: 100 },
      );
      if (batch.size === 0) break;

      // A batch is not guaranteed to be ordered, so sort newest → oldest; that
      // way the first bot message we meet is the most recent one.
      const ordered = [...batch.values()].sort(
        (a, b) => b.createdTimestamp - a.createdTimestamp,
      );
      if (newestId === null) newestId = ordered[0]!.id; // channel's newest message

      for (const m of ordered) {
        if (m.createdTimestamp <= windowStart) {
          done = true; // reached the period / reset floor
          break;
        }
        if (m.author.bot) {
          done = true; // reached the most recent bot message; stop counting
          break;
        }
        count += imagesInMessage(m, entry);
      }

      const oldestId = ordered[ordered.length - 1]!.id;
      if (done || batch.size < 100) break;
      before = oldestId; // walk further back
    }

    return { ok: true, count, newestId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
