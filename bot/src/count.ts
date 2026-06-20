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

// Cap on how many NEW reactions one count pass issues per channel, so a backlog
// (e.g. right after enabling this) drains over several ticks instead of flooding
// the reaction rate limit. Live posts are a trickle, so this rarely bites.
const MAX_NEW_REACTIONS_PER_PASS = 10;
// After a permission error, stop reacting in that channel for a while instead of
// retrying every pass — Discord temp-bans bots that pile up invalid requests.
const REACT_BACKOFF_MS = 10 * 60_000;
const reactBlockedUntil = new Map<string, number>(); // channelId -> ms epoch

// Best-effort: put `emoji` on a counted message if we haven't already (checks the
// reaction's `me` flag from the fetched payload, so no extra request). Returns
// true when it ISSUED a new reaction (so the caller can cap them). Fire-and-forget
// so reacting never blocks counting. Needs the Add Reactions permission; on a
// Missing Permissions/Access error it backs the whole channel off for a while
// rather than retrying — other failures (deleted message, transient) are ignored.
function ensureReaction(message: Message, emoji: string): boolean {
  if (Date.now() < (reactBlockedUntil.get(message.channelId) ?? 0)) return false;
  const mine = message.reactions.cache.some((r) => r.emoji.name === emoji && r.me);
  if (mine) return false;
  void message.react(emoji).catch((e: unknown) => {
    const code =
      e && typeof e === "object" && "code" in e ? (e as { code?: number }).code : undefined;
    if (code === 50013 || code === 50001) {
      reactBlockedUntil.set(message.channelId, Date.now() + REACT_BACKOFF_MS);
    }
  });
  return true;
}

export type CountResult =
  | { ok: true; count: number; newestId: string | null }
  | { ok: false; error: string };

// Count image-attachment "tickets" for `entry` in the active window, and return
// the channel's newest message id.
//
// The window is (floor, now]. `floor` is `windowStart` (the period start, or a
// later manual-reset time). When `stopAtBotMessage` is true the count also stops
// at the most recent message from ANOTHER bot — i.e. counting begins after a bot
// post (e.g. a ticket panel), screenshots above it ignored. This is the
// auto-reset/period behavior. In MANUAL mode (auto-reset off) it is false, so bot
// messages are ignored and the count is simply every screenshot since the last
// manual reset — counts persist until an admin resets, instead of dropping every
// time some bot posts in the channel.
//
// The reporting bot's OWN summary embeds are always skipped (never a floor),
// regardless of `stopAtBotMessage`. Walks history backward via REST; recounts
// current state each call, so deleted screenshots fall out of the tally (no
// Message Content intent needed for attachments or author.bot).
//
// When `reactEmoji` is set, each counted message also gets that reaction (so
// members can see which uploads were tallied) — best-effort, capped per pass,
// and skipped where the bot already reacted. The live counter passes it; the
// report does not.
export async function countWindow(
  client: Client,
  entry: ReportEntry,
  windowStart: number,
  stopAtBotMessage = true,
  reactEmoji: string | null = null,
): Promise<CountResult> {
  try {
    const channel = await client.channels.fetch(entry.channelId);
    if (!channel || !channel.isTextBased() || !("messages" in channel)) {
      return { ok: false, error: "not a readable text channel" };
    }

    const selfId = client.user?.id; // ignore our own report embeds as a floor
    let count = 0;
    let reacted = 0; // new reactions issued this pass (capped)
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
        // Our own summary embeds must not act as the floor (that would zero the
        // count right after we post) and carry no images anyway.
        if (m.author.id === selfId) continue;
        if (stopAtBotMessage && m.author.bot) {
          done = true; // reached another bot's message; stop counting
          break;
        }
        const imgs = imagesInMessage(m, entry);
        count += imgs;
        // Tick each counted screenshot. Capped per pass; already-ticked messages
        // are skipped via the reaction's `me` flag, so steady-state only new
        // uploads get a request.
        if (imgs > 0 && reactEmoji && reacted < MAX_NEW_REACTIONS_PER_PASS) {
          if (ensureReaction(m, reactEmoji)) reacted++;
        }
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
