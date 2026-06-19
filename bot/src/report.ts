import { EmbedBuilder, type Client, type TextBasedChannel } from "discord.js";
import type { ReportEntry, Settings } from "./db.ts";
import { countWindow } from "./count.ts";
import { formatRange, periodWindow } from "./period.ts";

type RunOptions = { dryRun?: boolean };

// Count every configured channel for the period ending at `end`, post a summary
// embed in each channel, then (if enabled) post a ranked leaderboard to the
// announcement channel. In dry-run nothing is sent, only logged.
export async function runReport(
  client: Client,
  settings: Settings,
  channels: ReportEntry[],
  end: Date,
  opts: RunOptions = {},
): Promise<void> {
  const { start } = periodWindow(end, settings);
  const range = formatRange(start, end.getTime());
  console.log(
    `[report] period ${range}, ${channels.length} channel(s)` +
      (opts.dryRun ? " [dry-run]" : ""),
  );

  const ranking: { name: string; count: number }[] = [];

  for (const entry of channels) {
    const label = entry.name || entry.userId || entry.channelId;
    // A manual reset only applies within the current period.
    const floor = entry.resetAt && entry.resetAt > start ? entry.resetAt : start;
    const result = await countWindow(client, entry, floor);

    if (!result.ok) {
      console.error(`[report] ${label}: SKIPPED, ${result.error}`);
      continue;
    }
    console.log(`[report] ${label}: ${result.count} ticket(s)`);
    ranking.push({ name: label, count: result.count });

    if (opts.dryRun) continue;

    try {
      const channel = (await client.channels.fetch(entry.channelId)) as TextBasedChannel | null;
      if (!channel || !channel.isSendable()) {
        console.error(`[report] ${label}: cannot send (missing Send Messages?)`);
        continue;
      }
      const mention = entry.userId ? `<@${entry.userId}>` : "";
      await channel.send({
        content: mention || undefined,
        embeds: [buildEmbed(result.count, range)],
      });
    } catch (err) {
      console.error(`[report] ${label}: send failed:`, err);
    }
  }

  await postLeaderboard(client, settings, ranking, opts);
}

// ── Per-channel summary ───────────────────────────────────────────────────────

function buildEmbed(count: number, range: string): EmbedBuilder {
  const noun = count === 1 ? "ticket" : "tickets";
  return new EmbedBuilder()
    .setTitle("🎫 Ticket Report")
    .setColor(0x5865f2)
    .setDescription(
      count > 0
        ? `You solved **${count}** ${noun} this period. Nice work!`
        : "No tickets were logged this period.",
    )
    .addFields(
      { name: "Tickets", value: `**${count}**`, inline: true },
      { name: "Period", value: range, inline: true },
    )
    .setFooter({ text: "Team Guide" })
    .setTimestamp(new Date());
}

// ── Leaderboard announcement ──────────────────────────────────────────────────

function parseColor(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  return m && m[1] ? parseInt(m[1], 16) : 0x5865f2;
}

function buildLeaderboardEmbed(
  ranking: { name: string; count: number }[],
  settings: Settings,
): EmbedBuilder {
  const ranked = [...ranking].sort((a, b) => b.count - a.count);
  const lines = ranked.map((r, i) => {
    const noun = r.count === 1 ? "ticket" : "tickets";
    return `**#${i + 1}** ${r.name} - ${r.count} ${noun}`;
  });
  const body = lines.length > 0 ? lines.join("\n") : "No tickets were logged this period.";
  const intro = settings.announcementIntro.trim();
  const embed = new EmbedBuilder()
    .setTitle(settings.announcementTitle.trim() || "Ticket count for this period")
    .setColor(parseColor(settings.announcementColor))
    .setDescription(intro ? `${intro}\n\n${body}` : body)
    .setTimestamp(new Date());
  const footer = settings.announcementFooter.trim();
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

// The optional ping line posted as message content above the embed. A role
// mention only notifies from `content` (never from inside an embed), so this is
// kept separate from the intro. `{role}` in the text is replaced with the
// <@&id> mention; if the placeholder is absent the mention is prepended. Returns
// "" when no role is configured.
function buildPingContent(settings: Settings): string {
  const roleId = settings.announcementRoleId?.trim();
  if (!roleId) return "";
  const mention = `<@&${roleId}>`;
  const text = settings.announcementPingText.trim();
  if (!text) return mention;
  if (text.includes("{role}")) return text.replace(/\{role\}/g, mention);
  return `${mention} ${text}`;
}

async function postLeaderboard(
  client: Client,
  settings: Settings,
  ranking: { name: string; count: number }[],
  opts: RunOptions,
): Promise<void> {
  if (!settings.announcementEnabled || !settings.announcementChannelId) return;

  const embed = buildLeaderboardEmbed(ranking, settings);
  const content = buildPingContent(settings);
  const roleId = settings.announcementRoleId?.trim() || null;

  if (opts.dryRun) {
    console.log(
      `[report] leaderboard (dry-run):` +
        (content ? `\n${content}` : "") +
        `\n${embed.data.description ?? ""}`,
    );
    return;
  }

  try {
    const channel = (await client.channels.fetch(
      settings.announcementChannelId,
    )) as TextBasedChannel | null;
    if (!channel || !channel.isSendable()) {
      console.error("[report] announcement: cannot send (missing access / Send Messages?)");
      return;
    }
    // Whitelist only the configured role so the ping fires and nothing else
    // (@everyone/@here/users) can be mentioned from the content.
    await channel.send({
      content: content || undefined,
      embeds: [embed],
      allowedMentions: { parse: [], roles: roleId ? [roleId] : [] },
    });
    console.log("[report] leaderboard posted");
  } catch (err) {
    console.error("[report] announcement send failed:", err);
  }
}
